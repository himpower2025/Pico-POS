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
  QueryDocumentSnapshot
} from 'firebase/firestore';
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

// A unique ID or email to partition store data securely
const getStoreSlug = (profile: StoreProfile) => {
  return profile.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
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
  const storeSlug = getStoreSlug(profile);
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
  const storeSlug = getStoreSlug(profile);
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
  const storeSlug = getStoreSlug(profile);
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
  const storeSlug = getStoreSlug(profile);
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
  const storeSlug = getStoreSlug(profile);
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
  const storeSlug = getStoreSlug(profile);
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
  const storeSlug = getStoreSlug(profile);
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
 * Fetch detailed orders (for transaction list)
 */
export const getDetailedOrders = async (profile: StoreProfile): Promise<Order[]> => {
  const storeSlug = getStoreSlug(profile);
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
 * Synchronize tables status securely
 */
export const syncTablesWithFirebase = async (profile: StoreProfile, tables: any[]): Promise<any[]> => {
  const storeSlug = getStoreSlug(profile);
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
  const storeSlug = getStoreSlug(profile);
  const tablesDocRef = doc(db, `stores/${storeSlug}/layout`, 'tables');
  await setDoc(tablesDocRef, { tables });
};

/**
 * Save store profile changes to cloud
 */
export const saveStoreProfileToFirebase = async (profile: StoreProfile) => {
  const storeSlug = getStoreSlug(profile);
  const profileDocRef = doc(db, `stores/${storeSlug}/layout`, 'profile');
  await setDoc(profileDocRef, profile);
};

/**
 * Load store profile from cloud if exists
 */
export const loadStoreProfileFromFirebase = async (email: string): Promise<StoreProfile | null> => {
  const storeSlug = email.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const profileDocRef = doc(db, `stores/${storeSlug}/layout`, 'profile');
  
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
