import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  increment,
  writeBatch,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  onSnapshot,
  QueryDocumentSnapshot,
  type Unsubscribe,
  type QueryConstraint
} from 'firebase/firestore';
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithCredential,
  GoogleAuthProvider,
  OAuthProvider,
  signOut,
  sendPasswordResetEmail,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  indexedDBLocalPersistence,
  type User,
  type UserCredential
} from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { MenuItem, Order, StoreProfile } from '../types';

// ═══════════════════════════════════════════════════════════════════════
// Configuration
//
// All values come from environment variables — no hardcoded fallbacks.
// The previous version fell back to the `himpower-2b10b` project, which
// is NOT the production project, so a missing .env silently pointed the
// app at the wrong database. Failing loudly is better.
//
// Copy .env.example → .env.local and fill in from:
//   Firebase Console → pico-pos → Project settings → Your apps → Web app
// ═══════════════════════════════════════════════════════════════════════

const env = (import.meta as any).env;

const required = (key: string): string => {
  const value = env[key];
  if (!value) {
    throw new Error(
      `[Pico] Missing environment variable ${key}. ` +
        `Copy .env.example to .env.local and fill in the Firebase config for the pico-pos project.`
    );
  }
  return value;
};

const firebaseConfig = {
  projectId: required('VITE_FIREBASE_PROJECT_ID'),
  appId: required('VITE_FIREBASE_APP_ID'),
  apiKey: required('VITE_FIREBASE_API_KEY'),
  authDomain: required('VITE_FIREBASE_AUTH_DOMAIN'),
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: required('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || ''
};

const app: FirebaseApp = initializeApp(firebaseConfig);

// NOTE: no databaseId argument — this app now uses the "(default)" Firestore
// database. The Admin SDK in functions/ also uses the default, so the
// RevenueCat webhook and the client finally read/write the same place.
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

export const auth = getAuth(app);
const functions = getFunctions(app, 'us-central1');

const isNative = (): boolean => Capacitor.isNativePlatform();

// ═══════════════════════════════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════════════════════════════

/**
 * "Remember me". On native, browserLocalPersistence isn't available inside
 * the WebView in the same way — indexedDBLocalPersistence is the correct
 * choice there, and there is no meaningful "session only" mode because the
 * WebView process is the app.
 */
export const setAuthPersistence = (rememberMe: boolean) => {
  if (isNative()) {
    return setPersistence(auth, indexedDBLocalPersistence);
  }
  return setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
};

export const registerWithEmail = (email: string, password: string): Promise<UserCredential> =>
  createUserWithEmailAndPassword(auth, email, password);

export const signInWithEmail = (email: string, password: string): Promise<UserCredential> =>
  signInWithEmailAndPassword(auth, email, password);

export const sendPasswordReset = (email: string): Promise<void> =>
  sendPasswordResetEmail(auth, email);

/**
 * Google sign-in.
 *
 * WHY THIS IS SPLIT BY PLATFORM: signInWithPopup opens a Google OAuth page
 * inside the app's WebView, and Google BLOCKS OAuth in embedded WebViews
 * (`disallowed_useragent`). That means the old implementation silently
 * failed on both iOS and Android builds. On native we hand off to the
 * system browser / Google Sign-In SDK via the Capacitor plugin, then feed
 * the returned ID token back into the JS SDK so Firestore sees the session.
 *
 * Requires `skipNativeAuth: true` in capacitor.config.ts — see
 * MIGRATION_GUIDE.md § Native auth setup.
 */
export const signInWithGoogleAccount = async (): Promise<UserCredential> => {
  if (!isNative()) {
    return signInWithPopup(auth, new GoogleAuthProvider());
  }

  const result = await FirebaseAuthentication.signInWithGoogle({ skipNativeAuth: true });
  const idToken = result.credential?.idToken;
  if (!idToken) {
    throw { code: 'auth/no-credential' };
  }
  const credential = GoogleAuthProvider.credential(idToken);
  return signInWithCredential(auth, credential);
};

/**
 * Sign in with Apple.
 *
 * NOT optional: App Store Review Guideline 4.8 requires that any app
 * offering a third-party login (Google, in our case) also offers a login
 * option that limits collection to name + email, lets the user hide their
 * email, and does no ad tracking. Sign in with Apple is the accepted way to
 * satisfy it. Shipping Google-only is a guaranteed iOS rejection.
 *
 * The nonce handling matters: Apple returns an ID token bound to a nonce,
 * and Firebase needs the RAW nonce to verify it. The Capacitor plugin
 * generates and returns it for us.
 */
export const signInWithAppleAccount = async (): Promise<UserCredential> => {
  const provider = new OAuthProvider('apple.com');
  provider.addScope('email');
  provider.addScope('name');

  if (!isNative()) {
    // Web / PWA path — requires Apple to be enabled as a provider in the
    // Firebase console, plus a Services ID configured in the Apple
    // Developer portal.
    return signInWithPopup(auth, provider);
  }

  const result = await FirebaseAuthentication.signInWithApple({ skipNativeAuth: true });
  const idToken = result.credential?.idToken;
  if (!idToken) {
    throw { code: 'auth/no-credential' };
  }
  const credential = provider.credential({
    idToken,
    rawNonce: result.credential?.nonce
  });
  return signInWithCredential(auth, credential);
};

/**
 * Apple only ever sends the user's display name on the VERY FIRST
 * authorization. If you don't capture it then, it's gone forever. We don't
 * currently store a personal name (the store name is what matters), so this
 * is a no-op today — kept as a reminder not to add a "full name" field
 * later and wonder why it's always empty for Apple users.
 */

export const signOutUser = async (): Promise<void> => {
  if (isNative()) {
    await FirebaseAuthentication.signOut().catch(() => {});
  }
  return signOut(auth);
};

export const subscribeToAuthChanges = (callback: (user: User | null) => void) =>
  onAuthStateChanged(auth, callback);

/**
 * When the account was created, as recorded by Firebase Auth itself.
 *
 * This is what the free trial is measured from. Deliberately NOT a
 * Firestore field: anything in Firestore that the owner can write is
 * something they can back-date to give themselves an unlimited trial.
 * Auth metadata is server-issued and read-only.
 */
export const getAccountCreatedAt = (): string | null =>
  auth.currentUser?.metadata?.creationTime ?? null;

/**
 * Permanently delete the signed-in user's account and all store data.
 * Required by App Store Review Guideline 5.1.1(v) — an "email us to
 * delete" link is an automatic rejection.
 */
export const deleteMyAccount = async (): Promise<void> => {
  const call = httpsCallable<{ confirm: string }, { success: boolean }>(
    functions,
    'deleteMyAccount'
  );
  await call({ confirm: 'DELETE' });
  await signOutUser();
};

// ═══════════════════════════════════════════════════════════════════════
// AI (server-proxied — the Gemini key never reaches the device)
// ═══════════════════════════════════════════════════════════════════════

export const callAnalyzeBusiness = async (stats: unknown, storeName: string): Promise<string> => {
  const call = httpsCallable<{ stats: unknown; storeName: string }, { text: string }>(
    functions,
    'analyzeBusiness'
  );
  const result = await call({ stats, storeName });
  return result.data.text;
};

export const callForecastSales = async (orderCount: number, revenue: number): Promise<string> => {
  const call = httpsCallable<{ orderCount: number; revenue: number }, { text: string }>(
    functions,
    'forecastSales'
  );
  const result = await call({ orderCount, revenue });
  return result.data.text;
};

// ═══════════════════════════════════════════════════════════════════════
// STORE DATA
// ═══════════════════════════════════════════════════════════════════════

const getStoreId = (profile: StoreProfile) => {
  if (!profile.ownerId) {
    throw new Error('StoreProfile is missing ownerId (Firebase Auth UID). Cannot resolve store path.');
  }
  return profile.ownerId;
};

/**
 * Cache-first menu loading: read one tiny version document instead of the
 * whole menu collection, and only re-fetch when the version changed.
 */
export const syncMenuWithCache = async (
  profile: StoreProfile,
  initialMenu: MenuItem[]
): Promise<MenuItem[]> => {
  const storeSlug = getStoreId(profile);
  const metaDocRef = doc(db, `stores/${storeSlug}/metadata`, 'menu_version');
  const menuColRef = collection(db, `stores/${storeSlug}/menu`);

  const localCacheKey = `pico_menu_cache_${storeSlug}`;
  const localVerKey = `pico_menu_version_${storeSlug}`;

  let cachedMenu: MenuItem[] = [];
  const cachedMenuRaw = localStorage.getItem(localCacheKey);
  if (cachedMenuRaw) {
    try {
      cachedMenu = JSON.parse(cachedMenuRaw);
    } catch {
      cachedMenu = [];
    }
  }
  const cachedVersion = localStorage.getItem(localVerKey) || '';

  try {
    const metaSnap = await getDoc(metaDocRef);

    if (metaSnap.exists()) {
      const serverVersion = metaSnap.data().lastUpdated || '';

      if (cachedVersion === serverVersion && cachedMenu.length > 0) {
        return cachedMenu;
      }

      const querySnap = await getDocs(menuColRef);
      const serverMenu: MenuItem[] = [];
      querySnap.forEach((docSnap: QueryDocumentSnapshot) => {
        serverMenu.push({ id: docSnap.id, ...docSnap.data() } as MenuItem);
      });

      if (serverMenu.length > 0) {
        localStorage.setItem(localCacheKey, JSON.stringify(serverMenu));
        localStorage.setItem(localVerKey, serverVersion);
        return serverMenu;
      }
    } else {
      // First-time setup: seed the sample menu.
      const batch = writeBatch(db);
      initialMenu.forEach((item) => {
        batch.set(doc(db, `stores/${storeSlug}/menu`, item.id), item);
      });
      const nowStr = new Date().toISOString();
      batch.set(metaDocRef, { lastUpdated: nowStr });
      await batch.commit();

      localStorage.setItem(localCacheKey, JSON.stringify(initialMenu));
      localStorage.setItem(localVerKey, nowStr);
      return initialMenu;
    }
  } catch (err) {
    console.warn('[Firebase Cache] Error syncing menu, falling back to local storage:', err);
  }

  return cachedMenu.length > 0 ? cachedMenu : initialMenu;
};

export const updateServerMenuItem = async (profile: StoreProfile, item: MenuItem) => {
  const storeSlug = getStoreId(profile);
  const metaDocRef = doc(db, `stores/${storeSlug}/metadata`, 'menu_version');

  await setDoc(doc(db, `stores/${storeSlug}/menu`, item.id), item);

  const nowStr = new Date().toISOString();
  await setDoc(metaDocRef, { lastUpdated: nowStr }, { merge: true });

  const localCacheKey = `pico_menu_cache_${storeSlug}`;
  const cachedMenuRaw = localStorage.getItem(localCacheKey);
  if (cachedMenuRaw) {
    try {
      const cachedMenu = JSON.parse(cachedMenuRaw) as MenuItem[];
      const updated = cachedMenu.map((m) => (m.id === item.id ? item : m));
      if (!updated.some((m) => m.id === item.id)) updated.push(item);
      localStorage.setItem(localCacheKey, JSON.stringify(updated));
      localStorage.setItem(`pico_menu_version_${storeSlug}`, nowStr);
    } catch {
      /* ignored */
    }
  }
};

export const deleteServerMenuItem = async (profile: StoreProfile, itemId: string) => {
  const storeSlug = getStoreId(profile);
  const metaDocRef = doc(db, `stores/${storeSlug}/metadata`, 'menu_version');

  await deleteDoc(doc(db, `stores/${storeSlug}/menu`, itemId));

  const nowStr = new Date().toISOString();
  await setDoc(metaDocRef, { lastUpdated: nowStr }, { merge: true });

  const localCacheKey = `pico_menu_cache_${storeSlug}`;
  const cachedMenuRaw = localStorage.getItem(localCacheKey);
  if (cachedMenuRaw) {
    try {
      const cachedMenu = JSON.parse(cachedMenuRaw) as MenuItem[];
      localStorage.setItem(localCacheKey, JSON.stringify(cachedMenu.filter((m) => m.id !== itemId)));
      localStorage.setItem(`pico_menu_version_${storeSlug}`, nowStr);
    } catch {
      /* ignored */
    }
  }
};

export const placeFirebaseOrder = async (profile: StoreProfile, order: Order, menu: MenuItem[]) => {
  const storeSlug = getStoreId(profile);
  const dateStr = new Date(order.timestamp).toISOString().split('T')[0];

  const orderRef = doc(db, `stores/${storeSlug}/orders`, order.id);
  const dailySummaryRef = doc(db, `stores/${storeSlug}/daily_summaries`, dateStr);

  let totalCost = 0;
  order.items.forEach((item) => {
    const menuItem = menu.find((m) => m.id === item.id);
    totalCost += (menuItem ? menuItem.cost : 0) * item.quantity;
  });
  const profit = order.total - totalCost;

  await setDoc(orderRef, {
    ...order,
    timestamp: order.timestamp.toISOString
      ? order.timestamp.toISOString()
      : new Date(order.timestamp).toISOString()
  });

  if (order.status === 'completed') {
    await setDoc(
      dailySummaryRef,
      {
        date: dateStr,
        revenue: increment(order.total),
        profit: increment(profit),
        orderCount: increment(1)
      },
      { merge: true }
    );
  }
};

export const updateServerOrderStatus = async (
  profile: StoreProfile,
  orderId: string,
  status: string
) => {
  const storeSlug = getStoreId(profile);
  await updateDoc(doc(db, `stores/${storeSlug}/orders`, orderId), { status });
};

export const refundFirebaseOrder = async (
  profile: StoreProfile,
  order: Order,
  menu: MenuItem[]
) => {
  const storeSlug = getStoreId(profile);
  const dateStr = new Date(order.timestamp).toISOString().split('T')[0];

  let totalCost = 0;
  order.items.forEach((item) => {
    const menuItem = menu.find((m) => m.id === item.id);
    totalCost += (menuItem ? menuItem.cost : 0) * item.quantity;
  });
  const profit = order.total - totalCost;

  await updateDoc(doc(db, `stores/${storeSlug}/orders`, order.id), { status: 'refunded' });

  await setDoc(
    doc(db, `stores/${storeSlug}/daily_summaries`, dateStr),
    {
      revenue: increment(-order.total),
      profit: increment(-profit),
      orderCount: increment(-1)
    },
    { merge: true }
  );
};

export const getSalesSummaries = async (profile: StoreProfile): Promise<any[]> => {
  const storeSlug = getStoreId(profile);
  try {
    const querySnap = await getDocs(collection(db, `stores/${storeSlug}/daily_summaries`));
    const summaries: any[] = [];
    querySnap.forEach((docSnap: QueryDocumentSnapshot) => {
      summaries.push({ id: docSnap.id, ...docSnap.data() });
    });
    return summaries;
  } catch (err) {
    console.error('[Firebase] Failed to fetch sales summaries:', err);
    return [];
  }
};

/**
 * ⚠️ Expensive: reads the store's entire order history. Export/backup only.
 * Note this is also the function that makes the "your data is never held
 * hostage" promise real — an owner whose trial lapsed can still export.
 */
export const getDetailedOrders = async (profile: StoreProfile): Promise<Order[]> => {
  const storeSlug = getStoreId(profile);
  try {
    const querySnap = await getDocs(collection(db, `stores/${storeSlug}/orders`));
    const orders: Order[] = [];
    querySnap.forEach((docSnap: QueryDocumentSnapshot) => {
      const data = docSnap.data();
      orders.push({ ...data, id: docSnap.id, timestamp: new Date(data.timestamp) } as Order);
    });
    return orders.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  } catch (err) {
    console.error('[Firebase] Failed to fetch detailed orders:', err);
    return [];
  }
};

export const getRecentOrders = async (
  profile: StoreProfile,
  options?: { days?: number; pageSize?: number; startAfterDoc?: QueryDocumentSnapshot }
): Promise<{ orders: Order[]; lastDoc: QueryDocumentSnapshot | null }> => {
  const storeSlug = getStoreId(profile);
  const ordersColRef = collection(db, `stores/${storeSlug}/orders`);
  const days = options?.days ?? 7;
  const pageSize = options?.pageSize ?? 50;

  const constraints: QueryConstraint[] = [orderBy('timestamp', 'desc')];

  if (options?.startAfterDoc) {
    constraints.push(startAfter(options.startAfterDoc));
  } else {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    constraints.unshift(where('timestamp', '>=', cutoff.toISOString()));
  }
  constraints.push(limit(pageSize));

  try {
    const querySnap = await getDocs(query(ordersColRef, ...constraints));
    const orders: Order[] = [];
    querySnap.forEach((docSnap: QueryDocumentSnapshot) => {
      const data = docSnap.data();
      orders.push({ ...data, id: docSnap.id, timestamp: new Date(data.timestamp) } as Order);
    });
    const lastDoc = querySnap.docs.length > 0 ? querySnap.docs[querySnap.docs.length - 1] : null;
    return { orders, lastDoc };
  } catch (err) {
    console.error('[Firebase] Failed to fetch recent orders:', err);
    return { orders: [], lastDoc: null };
  }
};

export const subscribeToTodaysOrders = (
  profile: StoreProfile,
  onChange: (orders: Order[]) => void,
  onError?: (error: Error) => void
): Unsubscribe => {
  const storeSlug = getStoreId(profile);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const q = query(
    collection(db, `stores/${storeSlug}/orders`),
    where('timestamp', '>=', todayStart.toISOString())
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const orders: Order[] = [];
      snapshot.forEach((docSnap: QueryDocumentSnapshot) => {
        const data = docSnap.data();
        orders.push({ ...data, id: docSnap.id, timestamp: new Date(data.timestamp) } as Order);
      });
      orders.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      onChange(orders);
    },
    (err) => {
      console.error("[Firebase Realtime] Failed to listen to today's orders:", err);
      onError?.(err as Error);
    }
  );
};

export const subscribeToTodaySummary = (
  profile: StoreProfile,
  onChange: (summary: {
    id: string;
    date: string;
    revenue: number;
    profit: number;
    orderCount: number;
  }) => void,
  onError?: (error: Error) => void
): Unsubscribe => {
  const storeSlug = getStoreId(profile);
  const dateStr = new Date().toISOString().split('T')[0];

  return onSnapshot(
    doc(db, `stores/${storeSlug}/daily_summaries`, dateStr),
    (snap) => {
      const data = snap.exists() ? snap.data() : {};
      onChange({
        id: dateStr,
        date: dateStr,
        revenue: data.revenue || 0,
        profit: data.profit || 0,
        orderCount: data.orderCount || 0
      });
    },
    (err) => {
      console.error("[Firebase Realtime] Failed to listen to today's summary:", err);
      onError?.(err as Error);
    }
  );
};

export const syncTablesWithFirebase = async (
  profile: StoreProfile,
  tables: any[]
): Promise<any[]> => {
  const storeSlug = getStoreId(profile);
  const tablesDocRef = doc(db, `stores/${storeSlug}/layout`, 'tables');

  try {
    const docSnap = await getDoc(tablesDocRef);
    if (docSnap.exists()) {
      return docSnap.data().tables || tables;
    }
    await setDoc(tablesDocRef, { tables });
    return tables;
  } catch (err) {
    console.warn('[Firebase] Tables layout sync fallback:', err);
    return tables;
  }
};

export const saveTablesToFirebase = async (profile: StoreProfile, tables: any[]) => {
  const storeSlug = getStoreId(profile);
  await setDoc(doc(db, `stores/${storeSlug}/layout`, 'tables'), { tables });
};

/**
 * Save store profile changes.
 *
 * TWO FIXES vs. the old one-liner `setDoc(ref, profile)`:
 *
 *  1. `{ merge: true }`. A full overwrite meant that editing an unrelated
 *     setting (store name, tax rate) with a slightly stale local copy would
 *     silently erase subscriptionMonthsPaid. In a 12-month rent-to-own
 *     model, that is a customer losing paid months — a refund dispute.
 *
 *  2. Subscription fields are stripped. They are owned by the RevenueCat
 *     webhook (Admin SDK). The hardened security rules now REJECT any
 *     client write that touches them, so leaving them in would make every
 *     settings save fail outright.
 */
export const saveStoreProfileToFirebase = async (profile: StoreProfile) => {
  const storeSlug = getStoreId(profile);

  const {
    subscriptionStatus: _s,
    subscriptionMonthsPaid: _m,
    subscriptionStartDate: _d,
    subscriptionNextBillingDate: _b,
    ...clientOwnedFields
  } = profile;

  await setDoc(doc(db, `stores/${storeSlug}/layout`, 'profile'), clientOwnedFields, {
    merge: true
  });
};

export const subscribeToStoreProfile = (
  profile: StoreProfile,
  onChange: (profile: StoreProfile) => void,
  onError?: (error: Error) => void
): Unsubscribe => {
  const storeSlug = getStoreId(profile);

  return onSnapshot(
    doc(db, `stores/${storeSlug}/layout`, 'profile'),
    (snap) => {
      if (snap.exists()) onChange(snap.data() as StoreProfile);
    },
    (err) => {
      console.error('[Firebase Realtime] Failed to listen to store profile:', err);
      onError?.(err as Error);
    }
  );
};

export const loadStoreProfileFromFirebase = async (uid: string): Promise<StoreProfile | null> => {
  try {
    const docSnap = await getDoc(doc(db, `stores/${uid}/layout`, 'profile'));
    if (docSnap.exists()) return docSnap.data() as StoreProfile;
  } catch (err) {
    console.error('[Firebase] Failed to load profile:', err);
  }
  return null;
};
