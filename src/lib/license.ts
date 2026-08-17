import { StoreProfile } from '../types';

// ═══════════════════════════════════════════════════════════════════════
// Licence & trial state
//
// Design decisions worth remembering:
//
//  · The trial clock is read from Firebase Auth's `creationTime`, NOT from
//    a Firestore field. Anything the store owner can write, they can
//    back-date. Auth metadata is server-issued and read-only.
//
//  · An expired trial LOCKS NEW SALES ONLY. Dashboard, transaction history,
//    export, settings and the subscription screen all stay open. The store
//    owner's sales records are their tax documents — holding them hostage
//    to force a purchase is both a bad look and, in several jurisdictions,
//    legally awkward. Nothing is ever auto-deleted.
//
//  · `owned` (12 months paid) is terminal. A later cancellation does not
//    revoke it — that is the whole promise of the rent-to-own model, and
//    the webhook enforces the same rule server-side.
// ═══════════════════════════════════════════════════════════════════════

export const TRIAL_DAYS = 7;

export type LicenseTier = 'trial' | 'trial_expired' | 'monthly' | 'annual' | 'owned';

export interface LicenseState {
  tier: LicenseTier;
  /** True while the store may create new orders. */
  canTakeOrders: boolean;
  /** True for any paid or perpetual state. */
  isPaid: boolean;
  isTrial: boolean;
  /** Whole days remaining, floored at 0. Only meaningful while isTrial. */
  trialDaysLeft: number;
  /** ISO date the trial ends, or null if not on trial. */
  trialEndsAt: string | null;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * @param profile          the store profile (subscription fields are
 *                         server-written and trusted)
 * @param accountCreatedAt `auth.currentUser.metadata.creationTime`
 */
export const resolveLicense = (
  profile: Pick<StoreProfile, 'subscriptionStatus'> | null | undefined,
  accountCreatedAt: string | null | undefined
): LicenseState => {
  const status = profile?.subscriptionStatus ?? 'none';

  if (status === 'owned') {
    return {
      tier: 'owned',
      canTakeOrders: true,
      isPaid: true,
      isTrial: false,
      trialDaysLeft: 0,
      trialEndsAt: null
    };
  }

  if (status === 'monthly' || status === 'annual') {
    return {
      tier: status,
      canTakeOrders: true,
      isPaid: true,
      isTrial: false,
      trialDaysLeft: 0,
      trialEndsAt: null
    };
  }

  // status === 'none' → work out where we are in the trial.
  const createdMs = accountCreatedAt ? Date.parse(accountCreatedAt) : NaN;

  if (Number.isNaN(createdMs)) {
    // We could not read the account creation time (offline first-launch,
    // or currentUser not hydrated yet). Fail OPEN, not closed: a till that
    // refuses to ring up a sale because of a clock lookup is worse than a
    // few extra free days. The next online launch resolves it correctly.
    return {
      tier: 'trial',
      canTakeOrders: true,
      isPaid: false,
      isTrial: true,
      trialDaysLeft: TRIAL_DAYS,
      trialEndsAt: null
    };
  }

  const endsMs = createdMs + TRIAL_DAYS * MS_PER_DAY;
  const msLeft = endsMs - Date.now();
  const daysLeft = Math.max(0, Math.ceil(msLeft / MS_PER_DAY));
  const trialEndsAt = new Date(endsMs).toISOString();

  if (msLeft <= 0) {
    return {
      tier: 'trial_expired',
      canTakeOrders: false,
      isPaid: false,
      isTrial: false,
      trialDaysLeft: 0,
      trialEndsAt
    };
  }

  return {
    tier: 'trial',
    canTakeOrders: true,
    isPaid: false,
    isTrial: true,
    trialDaysLeft: daysLeft,
    trialEndsAt
  };
};

/** Short label for the status badge in the POS header. */
export const licenseLabel = (state: LicenseState): string => {
  switch (state.tier) {
    case 'owned':
      return 'Lifetime Licence';
    case 'annual':
      return 'Annual Subscriber';
    case 'monthly':
      return 'Monthly Subscriber';
    case 'trial':
      return state.trialDaysLeft === 1
        ? 'Free trial — 1 day left'
        : `Free trial — ${state.trialDaysLeft} days left`;
    case 'trial_expired':
      return 'Trial ended';
  }
};
