import { Capacitor } from '@capacitor/core';
import { Purchases, LOG_LEVEL, type PurchasesOffering, type CustomerInfo } from '@revenuecat/purchases-capacitor';

// RevenueCat gives you a separate public API key per platform (iOS / Android)
// under the same project — these are safe to ship in client code (they're
// scoped to "make a purchase", not to read/modify billing data).
const REVENUECAT_API_KEYS: Record<string, string> = {
  ios: (import.meta as any).env.VITE_REVENUECAT_IOS_KEY || '',
  android: (import.meta as any).env.VITE_REVENUECAT_ANDROID_KEY || ''
};

/**
 * True only when running inside the wrapped native app (App Store / Google
 * Play build). False in the browser/PWA — RevenueCat's native purchase
 * flow simply doesn't exist there, so callers should fall back to the web
 * checkout path (Paddle) in that case.
 */
export const isNativePurchasesAvailable = (): boolean => Capacitor.isNativePlatform();

/**
 * Initialize RevenueCat for the signed-in store owner. `uid` is the Firebase
 * Auth UID — using it as RevenueCat's appUserID means a subscriber's
 * RevenueCat identity and their Firestore storeId are always the same
 * value, so the webhook handler needs no separate mapping table.
 */
export const initializePurchases = async (uid: string): Promise<void> => {
  if (!isNativePurchasesAvailable()) return;

  const platform = Capacitor.getPlatform(); // 'ios' | 'android'
  const apiKey = REVENUECAT_API_KEYS[platform];
  if (!apiKey) {
    console.warn(`[Purchases] No RevenueCat API key configured for platform "${platform}".`);
    return;
  }

  if ((import.meta as any).env.DEV) {
    await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
  }

  await Purchases.configure({ apiKey, appUserID: uid });
};

/**
 * Fetch the current offering (the Monthly / Annual packages configured in
 * the RevenueCat dashboard, which mirror the App Store Connect / Google
 * Play Console products).
 */
export const getCurrentOffering = async (): Promise<PurchasesOffering | null> => {
  const { current } = await Purchases.getOfferings();
  return current ?? null;
};

/**
 * Trigger the native purchase sheet for a package (e.g. offering.monthly or
 * offering.annual). Resolves with the updated CustomerInfo on success;
 * throws if the user cancels or the purchase fails — callers should catch
 * and show an inline message rather than a blocking alert.
 */
export const purchaseSubscription = async (
  packageToPurchase: NonNullable<PurchasesOffering['availablePackages']>[number]
): Promise<CustomerInfo> => {
  const result = await Purchases.purchasePackage({ aPackage: packageToPurchase });
  return result.customerInfo;
};

export const restoreSubscription = async (): Promise<CustomerInfo> => {
  const result = await Purchases.restorePurchases();
  return result.customerInfo;
};

export const getCurrentCustomerInfo = async (): Promise<CustomerInfo> => {
  const result = await Purchases.getCustomerInfo();
  return result.customerInfo;
};

/**
 * Subscribe to live subscription-status changes (e.g. a renewal or
 * cancellation that happened outside this session). Returns an unsubscribe
 * function — call it in your component's cleanup.
 */
export const subscribeToCustomerInfoUpdates = (
  onChange: (info: CustomerInfo) => void
): (() => void) => {
  if (!isNativePurchasesAvailable()) return () => {};

  const listenerPromise = Purchases.addCustomerInfoUpdateListener((info) => {
    onChange(info);
  });

  return () => {
    listenerPromise.then((listener) => listener.remove()).catch(() => {});
  };
};
