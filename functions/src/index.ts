import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import * as logger from 'firebase-functions/logger';

initializeApp();
const db = getFirestore();

// Set this in the RevenueCat dashboard under your Webhook integration's
// "Authorization Header Value", then set it here with:
//   firebase functions:secrets:set REVENUECAT_WEBHOOK_SECRET
const revenueCatWebhookSecret = defineSecret('REVENUECAT_WEBHOOK_SECRET');

// Event types that mean "the subscription is active right now."
const ACTIVE_EVENT_TYPES = new Set([
  'INITIAL_PURCHASE',
  'RENEWAL',
  'UNCANCELLATION',
  'PRODUCT_CHANGE'
]);

// Event types that mean "the subscription is no longer active."
const INACTIVE_EVENT_TYPES = new Set([
  'CANCELLATION',
  'EXPIRATION',
  'BILLING_ISSUE'
]);

/**
 * Guess plan length from the RevenueCat product_id. Adjust this to match
 * whatever product identifiers you actually configure in App Store
 * Connect / Google Play Console / RevenueCat — this is a placeholder
 * heuristic, not a fixed contract.
 */
const isAnnualProduct = (productId: string | undefined): boolean =>
  (productId || '').toLowerCase().includes('annual');

export const revenueCatWebhook = onRequest(
  { secrets: [revenueCatWebhookSecret], region: 'us-central1' },
  async (req, res) => {
    // 1. Verify the shared-secret Authorization header configured in the
    // RevenueCat dashboard. This is the only verification method available
    // on RevenueCat's non-Pro plans — if you later upgrade to Pro, prefer
    // switching to HMAC signature verification instead.
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

    // app_user_id was set to the Firebase Auth UID when the app called
    // Purchases.configure({ appUserID: uid }), so it doubles as the
    // Firestore storeId — no separate mapping table needed.
    const storeId: string | undefined = event.app_user_id;
    if (!storeId) {
      res.status(400).send('Missing app_user_id');
      return;
    }

    const eventType: string = event.type;
    const profileRef = db.doc(`stores/${storeId}/layout/profile`);
    // RevenueCat can redeliver the same event on retry — record processed
    // event IDs so a redelivered RENEWAL doesn't double-count a month.
    const processedEventRef = db.doc(`stores/${storeId}/processed_webhook_events/${event.id}`);

    try {
      await db.runTransaction(async (tx) => {
        const alreadyProcessed = await tx.get(processedEventRef);
        if (alreadyProcessed.exists) {
          logger.info(`[revenueCatWebhook] Event ${event.id} already processed, skipping.`);
          return;
        }

        if (ACTIVE_EVENT_TYPES.has(eventType)) {
          const profileSnap = await tx.get(profileRef);
          const current = profileSnap.exists ? profileSnap.data() || {} : {};
          const annual = isAnnualProduct(event.product_id);
          const monthsToAdd = annual ? 12 : 1;
          const prevMonths = typeof current.subscriptionMonthsPaid === 'number' ? current.subscriptionMonthsPaid : 0;
          const newMonths = Math.min(12, prevMonths + monthsToAdd);
          const owned = newMonths >= 12;

          tx.set(
            profileRef,
            {
              subscriptionStatus: owned ? 'owned' : (annual ? 'annual' : 'monthly'),
              subscriptionMonthsPaid: newMonths,
              subscriptionStartDate: current.subscriptionStartDate || new Date(event.purchased_at_ms).toISOString(),
              subscriptionNextBillingDate:
                owned || !event.expiration_at_ms
                  ? FieldValue.delete()
                  : new Date(event.expiration_at_ms).toISOString()
            },
            { merge: true }
          );
        } else if (INACTIVE_EVENT_TYPES.has(eventType)) {
          tx.set(
            profileRef,
            { subscriptionStatus: 'none' },
            { merge: true }
          );
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
