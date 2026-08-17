// functions/src/index.ts
//
// Changes vs. the original:
//   1. FIX (critical): the app now uses the "(default)" Firestore database on
//      the pico-pos project, and so does this file. Previously the client
//      read a NAMED database while getFirestore() here wrote to (default),
//      so every RevenueCat webhook landed somewhere nobody reads and paid
//      users stayed on "Trial Mode" forever.
//   2. NEW: analyzeBusiness / forecastSales moved server-side so the Gemini
//      API key is no longer compiled into the shipped JS bundle.
//   3. NEW: deleteMyAccount — required by App Store Guideline 5.1.1(v).
//   4. FIX: an 'owned' store is no longer demoted by a later CANCELLATION.

import { onRequest, onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import * as logger from 'firebase-functions/logger';
import { GoogleGenAI, Type } from '@google/genai';

initializeApp();

// No database ID argument — "(default)", matching initializeFirestore() in
// src/services/firebaseService.ts. If you ever move to a named database,
// BOTH files and firebase.json must change together.
const db = getFirestore();

const revenueCatWebhookSecret = defineSecret('REVENUECAT_WEBHOOK_SECRET');
const geminiApiKey = defineSecret('GEMINI_API_KEY');

const REGION = 'us-central1';

// ═════════════════════════════════════════════════════════════════════════
// 1. RevenueCat webhook — server-side source of truth for licence state
// ═════════════════════════════════════════════════════════════════════════

const ACTIVE_EVENT_TYPES = new Set([
  'INITIAL_PURCHASE',
  'RENEWAL',
  'UNCANCELLATION',
  'PRODUCT_CHANGE'
]);

const INACTIVE_EVENT_TYPES = new Set(['CANCELLATION', 'EXPIRATION', 'BILLING_ISSUE']);

/**
 * Plan length is inferred from the RevenueCat product_id by string match, so
 * your App Store Connect / Play Console product identifiers MUST contain
 * "annual" for yearly plans (e.g. `pico_pro_annual`). Verify before launch:
 * an annual purchase misread as monthly credits 1 month instead of 12
 * toward the perpetual licence.
 */
const isAnnualProduct = (productId: string | undefined): boolean =>
  (productId || '').toLowerCase().includes('annual');

export const revenueCatWebhook = onRequest(
  { secrets: [revenueCatWebhookSecret], region: REGION },
  async (req, res) => {
    const expected = revenueCatWebhookSecret.value();
    if (!expected || req.header('Authorization') !== expected) {
      logger.warn('[revenueCatWebhook] Rejected request with invalid Authorization header.');
      res.status(401).send('Unauthorized');
      return;
    }

    const event = req.body?.event;
    if (!event || !event.id || !event.type) {
      res.status(400).send('Malformed event payload');
      return;
    }

    // app_user_id was set to the Firebase Auth UID by
    // Purchases.configure({ appUserID: uid }), so it doubles as the storeId.
    const storeId: string | undefined = event.app_user_id;
    if (!storeId) {
      res.status(400).send('Missing app_user_id');
      return;
    }

    const eventType: string = event.type;
    const profileRef = db.doc(`stores/${storeId}/layout/profile`);
    // RevenueCat redelivers events on retry — recording processed IDs stops
    // a redelivered RENEWAL from double-counting a month.
    const processedEventRef = db.doc(`stores/${storeId}/processed_webhook_events/${event.id}`);

    try {
      await db.runTransaction(async (tx) => {
        const alreadyProcessed = await tx.get(processedEventRef);
        if (alreadyProcessed.exists) {
          logger.info(`[revenueCatWebhook] Event ${event.id} already processed, skipping.`);
          return;
        }

        const profileSnap = await tx.get(profileRef);
        const current = profileSnap.exists ? profileSnap.data() || {} : {};

        if (ACTIVE_EVENT_TYPES.has(eventType)) {
          const annual = isAnnualProduct(event.product_id);
          const monthsToAdd = annual ? 12 : 1;
          const prevMonths =
            typeof current.subscriptionMonthsPaid === 'number' ? current.subscriptionMonthsPaid : 0;
          const newMonths = Math.min(12, prevMonths + monthsToAdd);
          const owned = newMonths >= 12;

          tx.set(
            profileRef,
            {
              subscriptionStatus: owned ? 'owned' : annual ? 'annual' : 'monthly',
              subscriptionMonthsPaid: newMonths,
              subscriptionStartDate:
                current.subscriptionStartDate || new Date(event.purchased_at_ms).toISOString(),
              subscriptionNextBillingDate:
                owned || !event.expiration_at_ms
                  ? FieldValue.delete()
                  : new Date(event.expiration_at_ms).toISOString()
            },
            { merge: true }
          );
        } else if (INACTIVE_EVENT_TYPES.has(eventType)) {
          // An 'owned' store finished paying its 12 months — the licence is
          // perpetual and a later cancellation must NOT revoke it. That is
          // the entire promise of the rent-to-own model.
          if (current.subscriptionStatus !== 'owned') {
            tx.set(profileRef, { subscriptionStatus: 'none' }, { merge: true });
          }
        } else {
          logger.info(`[revenueCatWebhook] Ignoring unhandled event type: ${eventType}`);
        }

        tx.set(processedEventRef, {
          type: eventType,
          receivedAt: FieldValue.serverTimestamp()
        });
      });

      res.status(200).send('OK');
    } catch (err) {
      logger.error('[revenueCatWebhook] Failed to process event:', err);
      res.status(500).send('Internal error');
    }
  }
);

// ═════════════════════════════════════════════════════════════════════════
// 2. Gemini proxy — keeps the API key off the device
//
// vite.config.ts used to inline process.env.API_KEY straight into the
// bundle, so anyone who unzips the APK/IPA could read it and bill your
// account. Delete that `define` block when you deploy this.
// ═════════════════════════════════════════════════════════════════════════

interface SalesStats {
  totalRevenue: number;
  totalCost: number;
  netProfit: number;
  itemCounts: Record<string, number>;
  orderCount: number;
}

const assertSignedIn = (auth: { uid?: string } | undefined): string => {
  if (!auth?.uid) {
    throw new HttpsError('unauthenticated', 'You must be signed in.');
  }
  return auth.uid;
};

/**
 * Aggregate stats are still computed on the CLIENT and passed in — only
 * totals and item names leave the device, never customer personal data.
 * Keep it that way: it is what STORE_SUBMISSION_NOTES.md declares to both
 * stores' privacy forms.
 */
export const analyzeBusiness = onCall(
  { secrets: [geminiApiKey], region: REGION },
  async (request) => {
    assertSignedIn(request.auth);

    const stats = request.data?.stats as SalesStats | undefined;
    const storeName =
      typeof request.data?.storeName === 'string' && request.data.storeName
        ? request.data.storeName
        : 'the cafe';

    if (!stats || typeof stats.totalRevenue !== 'number') {
      throw new HttpsError('invalid-argument', 'Missing or malformed sales stats.');
    }

    const ai = new GoogleGenAI({ apiKey: geminiApiKey.value() });

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `
          Analyze the following cafe sales data for "${storeName}".
          Data: ${JSON.stringify(stats)}

          Provide a professional business insight report in ENGLISH.
          Include:
          1. Overall performance summary (Revenue, Cost, Net Profit, Margin).
          2. Best selling items.
          3. Actionable advice to improve sales and reduce costs.

          Format the response using Markdown. Keep it professional and
          executive-summary style.
        `,
        config: {
          systemInstruction:
            'You are an expert Restaurant Business Analyst. You provide critical insights to maximize profit in English.'
        }
      });
      return { text: response.text || 'Analysis completed but no text was generated.' };
    } catch (err) {
      logger.error('[analyzeBusiness] Gemini call failed:', err);
      throw new HttpsError('internal', 'AI Analysis service is currently unavailable.');
    }
  }
);

export const forecastSales = onCall(
  { secrets: [geminiApiKey], region: REGION },
  async (request) => {
    assertSignedIn(request.auth);

    const orderCount = Number(request.data?.orderCount) || 0;
    const revenue = Number(request.data?.revenue) || 0;

    const ai = new GoogleGenAI({ apiKey: geminiApiKey.value() });

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `
          Based on the current sales patterns (Total orders today: ${orderCount},
          Revenue: ${revenue}), predict the sales revenue for the NEXT 7 DAYS.
          Weekends usually see 20% higher traffic.
          Return ONLY a JSON array of objects with 'day' (string, e.g. 'Sat')
          and 'revenue' (number).
        `,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                day: { type: Type.STRING },
                revenue: { type: Type.NUMBER }
              }
            }
          }
        }
      });
      return { text: response.text || '[]' };
    } catch (err) {
      logger.error('[forecastSales] Gemini call failed:', err);
      return { text: '[]' };
    }
  }
);

// ═════════════════════════════════════════════════════════════════════════
// 3. Account deletion — App Store Guideline 5.1.1(v)
//
// An app offering account creation must let the user delete the account
// FROM INSIDE THE APP. A "email us to delete" link is an automatic
// rejection. Play's Data Safety form also wants a documented deletion path.
// ═════════════════════════════════════════════════════════════════════════

export const deleteMyAccount = onCall({ region: REGION }, async (request) => {
  const uid = assertSignedIn(request.auth);

  // Require a typed confirmation so a stray call can't destroy a store's
  // entire sales history.
  if (request.data?.confirm !== 'DELETE') {
    throw new HttpsError('failed-precondition', 'Deletion was not confirmed.');
  }

  try {
    // recursiveDelete walks every subcollection: layout, metadata, menu,
    // orders, daily_summaries, processed_webhook_events.
    await db.recursiveDelete(db.doc(`stores/${uid}`));
    logger.info(`[deleteMyAccount] Firestore data purged for store ${uid}.`);

    await getAuth().deleteUser(uid);
    logger.info(`[deleteMyAccount] Auth user ${uid} deleted.`);

    return { success: true };
  } catch (err) {
    logger.error('[deleteMyAccount] Deletion failed:', err);
    throw new HttpsError('internal', 'Account deletion failed. Please contact support.');
  }
});

// NOTE: this deletes the Firebase side only. An active App Store / Play
// subscription is managed by Apple/Google and must be cancelled by the user
// in their own store account — AccountDangerZone.tsx says so in the
// confirmation dialog. Without that warning, users keep getting billed after
// "deleting" their account, and you get the one-star review.
