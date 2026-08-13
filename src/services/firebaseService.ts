import { initializeApp } from 'firebase/app';
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
  serverTimestamp,
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
  GoogleAuthProvider,
  signOut,
  sendPasswordResetEmail,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  type User,
  type UserCredential
} from 'firebase/auth';
import { MenuItem, Order, StoreProfile } from '../types';
// Firebase configuration with environment variable support and default fallbacks for AI Studio/local development
const firebaseConfig = {
  projectId: (import.meta as any).env.VITE_FIREBASE_PROJECT_ID || "himpower-2b10b",
  appId: (import.meta as any).env.VITE_FIREBASE_APP_ID || "1:877849012676:web:d841108fa16ad8d2cadc91",
  apiKey: (import.meta as any).env.VITE_FIREBASE_API_KEY || "AIzaSyBoZYams0NPnz4PQwmo65lZjECskbYdUpw",
  authDomain: (import.meta as any).env.VITE_FIREBASE_AUTH_DOMAIN || "himpower-2b10b.firebaseapp.com",
  firestoreDatabaseId: (import.meta as any).env.VITE_FIREBASE_DATABASE_ID || "ai-studio-picoposbyhimpowe-63fcd72d-cd61-44bb-8ac6-eb9312bd69a4",
  storageBucket: (import.meta as any).env.VITE_FIREBASE_STORAGE_BUCKET || "himpower-2b10b.firebasestorage.app",
  messagingSenderId: (import.meta as any).env.VITE_FIREBASE_MESSAGING_SENDER_ID || "877849012676",
  measurementId: (import.meta as any).env.VITE_FIREBASE_MEASUREMENT_ID || "",
};

// Initialize Firebase with persistent local offline cache enabled automatically
const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
}, firebaseConfig.firestoreDatabaseId);

// Firebase Authentication instance. All store data is now partitioned by the
// signed-in owner's Auth UID, so this MUST be initialized before any store
// data is read or written.
export const auth = getAuth(app);

/**
 * AUTH: Set whether the session should persist across browser restarts
 * ("Remember me") or only for the current tab/session. Call this before
 * signing in or registering.
 */
export const setAuthPersistence = (rememberMe: boolean) => {
  return setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
};

/**
 * AUTH: Create a new store owner account with email + password.
 */
export const registerWithEmail = (email: string, password: string): Promise<UserCredential> => {
  return createUserWithEmailAndPassword(auth, email, password);
};

/**
 * AUTH: Sign in an existing store owner with email + password.
 */
export const signInWithEmail = (email: string, password: string): Promise<UserCredential> => {
  return signInWithEmailAndPassword(auth, email, password);
};

/**
 * AUTH: Sign in (or, on first use, sign up) with a Google account via popup.
 */
export const signInWithGoogleAccount = (): Promise<UserCredential> => {
  const provider = new GoogleAuthProvider();
  return signInWithPopup(auth, provider);
};

/**
 * AUTH: Send a password reset email to the given address.
 */
export const sendPasswordReset = (email: string): Promise<void> => {
  return sendPasswordResetEmail(auth, email);
};

/**
 * AUTH: Sign the current user out.
 */
export const signOutUser = (): Promise<void> => {
  return signOut(auth);
};

/**
 * AUTH: Subscribe to auth state changes (e.g. to restore a session on app
 * load without forcing the user to log in again). Returns the unsubscribe
 * function.
 */
export const subscribeToAuthChanges = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

// The store's unique path identifier is always the Firebase Auth UID of its
// owner (profile.ownerId). This keeps every data path in sync with the
// Firestore security rules, which only allow a signed-in user to read/write
// documents stored under their own UID — no name- or email-derived slugs.
const getStoreId = (profile: StoreProfile) => {
  if (!profile.ownerId) {
    throw new Error('StoreProfile is missing ownerId (Firebase Auth UID). Cannot resolve store path.');
  }
  return profile.ownerId;
};

/**
 * STRATEGY 1: Cache-First Product Menu Loading (Source: Cache Strategy)
 * Instead of reading the entire menu from Firestore on every reload (which incurs high read costs),
 * we check a tiny metadata document containing the last updated timestamp.
 * If the local timestamp matches the server timestamp, we load the menu from localStorage (0 read cost).
 * Otherwise, we pull from the Firestore server and refresh our local cache.
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

  // 1. Get cached menu & version from localStorage
  let cachedMenu: MenuItem[] = [];
  const cachedMenuRaw = localStorage.getItem(localCacheKey);
  if (cachedMenuRaw) {
    try {
      cachedMenu = JSON.parse(cachedMenuRaw);
    } catch (e) {
      cachedMenu = [];
    }
  }
  const cachedVersion = localStorage.getItem(localVerKey) || '';

  try {
    // 2. Fetch server metadata timestamp (Only 1 document read!)
    const metaSnap = await getDoc(metaDocRef);
    
    if (metaSnap.exists()) {
      const serverVersion = metaSnap.data().lastUpdated || '';
      
      // If matches, return cached menu immediately (Saving Firestore reads!)
      if (cachedVersion === serverVersion && cachedMenu.length > 0) {
        console.log('[Firebase Cache] Menu is up to date. Loading from local storage.');
        return cachedMenu;
      }

      // If version mismatch, fetch full menu from server
      console.log('[Firebase Cache] Menu version mismatch. Fetching from Firestore server...');
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
      // First-time setup: Seed database with initial menu items
      console.log('[Firebase Cache] First time setup. Seeding initial menu to Firestore...');
      const batch = writeBatch(db);
      
      initialMenu.forEach((item) => {
        const itemRef = doc(db, `stores/${storeSlug}/menu`, item.id);
        batch.set(itemRef, item);
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

  // Fallback to local cache if offline or error
  return cachedMenu.length > 0 ? cachedMenu : initialMenu;
};

/**
 * Triggers a menu modification on the server and increments menu version
 */
export const updateServerMenuItem = async (profile: StoreProfile, item: MenuItem) => {
  const storeSlug = getStoreId(profile);
  const itemRef = doc(db, `stores/${storeSlug}/menu`, item.id);
  const metaDocRef = doc(db, `stores/${storeSlug}/metadata`, 'menu_version');

  await setDoc(itemRef, item);
  
  const nowStr = new Date().toISOString();
  await setDoc(metaDocRef, { lastUpdated: nowStr }, { merge: true });

  // Update local storage cache to keep client in sync immediately
  const localCacheKey = `pico_menu_cache_${storeSlug}`;
  const localVerKey = `pico_menu_version_${storeSlug}`;
  
  const cachedMenuRaw = localStorage.getItem(localCacheKey);
  if (cachedMenuRaw) {
    try {
      const cachedMenu = JSON.parse(cachedMenuRaw) as MenuItem[];
      const updated = cachedMenu.map(m => m.id === item.id ? item : m);
      if (!updated.some(m => m.id === item.id)) updated.push(item);
      localStorage.setItem(localCacheKey, JSON.stringify(updated));
      localStorage.setItem(localVerKey, nowStr);
    } catch (e) {
      // Ignored
    }
  }
};

/**
 * Deletes a menu item on the server and increments version
 */
export const deleteServerMenuItem = async (profile: StoreProfile, itemId: string) => {
  const storeSlug = getStoreId(profile);
  const itemRef = doc(db, `stores/${storeSlug}/menu`, itemId);
  const metaDocRef = doc(db, `stores/${storeSlug}/metadata`, 'menu_version');

  await deleteDoc(itemRef);
  
  const nowStr = new Date().toISOString();
  await setDoc(metaDocRef, { lastUpdated: nowStr }, { merge: true });

  // Update local storage cache
  const localCacheKey = `pico_menu_cache_${storeSlug}`;
  const localVerKey = `pico_menu_version_${storeSlug}`;
  
  const cachedMenuRaw = localStorage.getItem(localCacheKey);
  if (cachedMenuRaw) {
    try {
      const cachedMenu = JSON.parse(cachedMenuRaw) as MenuItem[];
      const updated = cachedMenu.filter(m => m.id !== itemId);
      localStorage.setItem(localCacheKey, JSON.stringify(updated));
      localStorage.setItem(localVerKey, nowStr);
    } catch (e) {
      // Ignored
    }
  }
};


/**
 * STRATEGY 3: Real-time Transaction Sales Aggregation (Aggregation Document Design)
 * Instead of reading thousands of order receipts from Firestore to calculate business statistics 
 * on every dashboard reload, we atomically aggregate sales totals in a single, dedicated daily document.
 * This turns an N-read operation into a single, highly performant 1-read operation.
 */
export const placeFirebaseOrder = async (
  profile: StoreProfile, 
  order: Order,
  menu: MenuItem[]
) => {
  const storeSlug = getStoreId(profile);
  const dateStr = new Date(order.timestamp).toISOString().split('T')[0]; // YYYY-MM-DD
  
  const orderRef = doc(db, `stores/${storeSlug}/orders`, order.id);
  const dailySummaryRef = doc(db, `stores/${storeSlug}/daily_summaries`, dateStr);

  // Calculate Net Profit = Revenue - Total Ingredient Cost
  let totalCost = 0;
  order.items.forEach(item => {
    const menuItem = menu.find(m => m.id === item.id);
    const itemCost = menuItem ? menuItem.cost : 0;
    totalCost += itemCost * item.quantity;
  });
  const profit = order.total - totalCost;

  // Save the complete detailed order receipt
  await setDoc(orderRef, {
    ...order,
    timestamp: order.timestamp.toISOString ? order.timestamp.toISOString() : new Date(order.timestamp).toISOString()
  });

  // Increment summary metrics atomically ONLY if order is completed (paid)
  if (order.status === 'completed') {
    await setDoc(dailySummaryRef, {
      date: dateStr,
      revenue: increment(order.total),
      profit: increment(profit),
      orderCount: increment(1)
    }, { merge: true });
    console.log(`[Firebase Aggregation] Order ${order.id} saved. Atomic summary updated for ${dateStr}.`);
  } else {
    console.log(`[Firebase Aggregation] Kitchen ticket ${order.id} (${order.status}) saved. Summary metrics not modified.`);
  }
};

/**
 * Update an order's status securely on the server
 */
export const updateServerOrderStatus = async (profile: StoreProfile, orderId: string, status: string) => {
  const storeSlug = getStoreId(profile);
  const orderRef = doc(db, `stores/${storeSlug}/orders`, orderId);
  await updateDoc(orderRef, { status });
};

/**
 * Handle Order Refunds
 * Refunded order values are deducted from the daily summary automatically
 */
export const refundFirebaseOrder = async (
  profile: StoreProfile,
  order: Order,
  menu: MenuItem[]
) => {
  const storeSlug = getStoreId(profile);
  const dateStr = new Date(order.timestamp).toISOString().split('T')[0];
  
  const orderRef = doc(db, `stores/${storeSlug}/orders`, order.id);
  const dailySummaryRef = doc(db, `stores/${storeSlug}/daily_summaries`, dateStr);

  // Calculate ingredient cost
  let totalCost = 0;
  order.items.forEach(item => {
    const menuItem = menu.find(m => m.id === item.id);
    const itemCost = menuItem ? menuItem.cost : 0;
    totalCost += itemCost * item.quantity;
  });
  const profit = order.total - totalCost;

  // Update order status to refunded
  await updateDoc(orderRef, { status: 'refunded' });

  // Decrement aggregated revenue and profit atomically
  await setDoc(dailySummaryRef, {
    revenue: increment(-order.total),
    profit: increment(-profit),
    orderCount: increment(-1)
  }, { merge: true });

  console.log(`[Firebase Aggregation] Order ${order.id} refunded. Atomic summary decremented for ${dateStr}.`);
};

/**
 * Fetch Aggregated Sales Summaries (Fast 1-read operation for stats)
 * This loads only summary rows, avoiding fetching thousands of order items.
 */
export const getSalesSummaries = async (profile: StoreProfile): Promise<any[]> => {
  const storeSlug = getStoreId(profile);
  const summariesColRef = collection(db, `stores/${storeSlug}/daily_summaries`);
  
  try {
    const querySnap = await getDocs(summariesColRef);
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
 * Fetch ALL detailed orders, no date limit, no pagination.
 * ⚠️ Expensive: cost scales with the store's entire order history. Only use
 * this for a full export/backup — the transaction list screen should use
 * getRecentOrders() below instead.
 */
export const getDetailedOrders = async (profile: StoreProfile): Promise<Order[]> => {
  const storeSlug = getStoreId(profile);
  const ordersColRef = collection(db, `stores/${storeSlug}/orders`);
  
  try {
    const querySnap = await getDocs(ordersColRef);
    const orders: Order[] = [];
    querySnap.forEach((docSnap: QueryDocumentSnapshot) => {
      const data = docSnap.data();
      orders.push({
        ...data,
        id: docSnap.id,
        timestamp: new Date(data.timestamp)
      } as Order);
    });
    // Sort by newest first
    return orders.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  } catch (err) {
    console.error('[Firebase] Failed to fetch detailed orders:', err);
    return [];
  }
};

/**
 * Fetch a page of recent orders for the transaction list screen.
 * The FIRST page (no startAfterDoc) is bounded to the last `days` days, so a
 * routine screen visit only pays for a small, predictable slice. Once the
 * user explicitly asks for older data (passing startAfterDoc), the day
 * cutoff is dropped and pagination just continues back through history by
 * cursor — so cost only grows when the store owner actually asks to see
 * further back, `pageSize` rows at a time.
 */
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
    // Paging further back into history at the user's explicit request —
    // no day cutoff, just continue from where the last page left off.
    constraints.push(startAfter(options.startAfterDoc));
  } else {
    // First page of a fresh screen visit — bound the read to a recent window.
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
      orders.push({
        ...data,
        id: docSnap.id,
        timestamp: new Date(data.timestamp)
      } as Order);
    });
    const lastDoc = querySnap.docs.length > 0 ? querySnap.docs[querySnap.docs.length - 1] : null;
    return { orders, lastDoc };
  } catch (err) {
    console.error('[Firebase] Failed to fetch recent orders:', err);
    return { orders: [], lastDoc: null };
  }
};

/**
 * REAL-TIME: Listen to TODAY's orders — every status, not just active ones.
 * This is what keeps multiple terminals (counter, kitchen display, a
 * manager's dashboard) in sync: a new ticket created at the counter shows
 * up on the kitchen board immediately, and a status change made on the
 * kitchen board (cooking → ready → completed) is reflected everywhere else
 * too, since it's the same underlying order document.
 *
 * Scoped to today only (Strategy ①) — cost is bounded by today's order
 * volume, not the store's entire history. Cross-device visibility into
 * changes on OLDER orders (e.g. refunding a 3-day-old order from another
 * device) is not covered by this listener; those reconcile on next login.
 *
 * Call the returned unsubscribe function in your component's useEffect
 * cleanup so the listener doesn't keep running after the screen unmounts.
 */
export const subscribeToTodaysOrders = (
  profile: StoreProfile,
  onChange: (orders: Order[]) => void,
  onError?: (error: Error) => void
): Unsubscribe => {
  const storeSlug = getStoreId(profile);
  const ordersColRef = collection(db, `stores/${storeSlug}/orders`);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const q = query(ordersColRef, where('timestamp', '>=', todayStart.toISOString()));

  return onSnapshot(
    q,
    (snapshot) => {
      const orders: Order[] = [];
      snapshot.forEach((docSnap: QueryDocumentSnapshot) => {
        const data = docSnap.data();
        orders.push({
          ...data,
          id: docSnap.id,
          timestamp: new Date(data.timestamp)
        } as Order);
      });
      orders.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      onChange(orders);
    },
    (err) => {
      console.error('[Firebase Realtime] Failed to listen to today\'s orders:', err);
      onError?.(err as Error);
    }
  );
};

/**
 * REAL-TIME: Listen to just today's daily_summaries document (a single
 * document, so this is about as cheap as a listener can be) so the
 * Dashboard's revenue/profit/order-count KPIs stay live across devices as
 * new sales come in, without re-reading any order documents.
 */
export const subscribeToTodaySummary = (
  profile: StoreProfile,
  onChange: (summary: { id: string; date: string; revenue: number; profit: number; orderCount: number }) => void,
  onError?: (error: Error) => void
): Unsubscribe => {
  const storeSlug = getStoreId(profile);
  const dateStr = new Date().toISOString().split('T')[0];
  const summaryRef = doc(db, `stores/${storeSlug}/daily_summaries`, dateStr);

  return onSnapshot(
    summaryRef,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        onChange({ id: snap.id, date: dateStr, revenue: data.revenue || 0, profit: data.profit || 0, orderCount: data.orderCount || 0 });
      } else {
        onChange({ id: dateStr, date: dateStr, revenue: 0, profit: 0, orderCount: 0 });
      }
    },
    (err) => {
      console.error('[Firebase Realtime] Failed to listen to today\'s summary:', err);
      onError?.(err as Error);
    }
  );
};

/**
 * Synchronize tables status securely
 */
export const syncTablesWithFirebase = async (profile: StoreProfile, tables: any[]): Promise<any[]> => {
  const storeSlug = getStoreId(profile);
  const tablesDocRef = doc(db, `stores/${storeSlug}/layout`, 'tables');

  try {
    const docSnap = await getDoc(tablesDocRef);
    if (docSnap.exists()) {
      return docSnap.data().tables || tables;
    } else {
      // Seed initial tables layout
      await setDoc(tablesDocRef, { tables });
      return tables;
    }
  } catch (err) {
    console.warn('[Firebase] Tables layout sync fallback:', err);
    return tables;
  }
};

/**
 * Save updated tables layout securely
 */
export const saveTablesToFirebase = async (profile: StoreProfile, tables: any[]) => {
  const storeSlug = getStoreId(profile);
  const tablesDocRef = doc(db, `stores/${storeSlug}/layout`, 'tables');
  await setDoc(tablesDocRef, { tables });
};

/**
 * Save store profile changes to cloud
 */
export const saveStoreProfileToFirebase = async (profile: StoreProfile) => {
  const storeSlug = getStoreId(profile);
  const profileDocRef = doc(db, `stores/${storeSlug}/layout`, 'profile');
  await setDoc(profileDocRef, profile);
};

/**
 * REAL-TIME: Listen to the store's own profile document. This matters most
 * for subscription status — once RevenueCat webhooks start writing
 * subscriptionStatus/subscriptionMonthsPaid server-side (via Cloud
 * Functions), this is how the client finds out without a manual refresh.
 */
export const subscribeToStoreProfile = (
  profile: StoreProfile,
  onChange: (profile: StoreProfile) => void,
  onError?: (error: Error) => void
): Unsubscribe => {
  const storeSlug = getStoreId(profile);
  const profileDocRef = doc(db, `stores/${storeSlug}/layout`, 'profile');

  return onSnapshot(
    profileDocRef,
    (snap) => {
      if (snap.exists()) {
        onChange(snap.data() as StoreProfile);
      }
    },
    (err) => {
      console.error('[Firebase Realtime] Failed to listen to store profile:', err);
      onError?.(err as Error);
    }
  );
};

/**
 * Load store profile from cloud if exists. `uid` is the Firebase Auth UID of
 * the signed-in owner (previously this took an email address and derived a
 * slug from it, which didn't match the name-based path used everywhere else —
 * using the UID directly fixes that mismatch as well).
 */
export const loadStoreProfileFromFirebase = async (uid: string): Promise<StoreProfile | null> => {
  const profileDocRef = doc(db, `stores/${uid}/layout`, 'profile');
  
  try {
    const docSnap = await getDoc(profileDocRef);
    if (docSnap.exists()) {
      return docSnap.data() as StoreProfile;
    }
  } catch (err) {
    console.error('[Firebase] Failed to load profile:', err);
  }
  return null;
};
