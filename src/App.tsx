import React, { useState, useEffect, useRef } from 'react';
import { AppMode, Order, Table, MenuItem, OrderItem, StoreProfile } from './types';
import PosView from './components/PosView';
import DashboardView from './components/DashboardView';
import SettingsView from './components/SettingsView';
import ReceiptModal from './components/ReceiptModal';
import LoginView from './components/LoginView';
import { LayoutGrid, MonitorPlay, LogOut, Settings, MountainSnow, CloudSun, Coffee, Loader2 } from 'lucide-react';
import { 
  syncMenuWithCache, 
  updateServerMenuItem, 
  deleteServerMenuItem, 
  placeFirebaseOrder, 
  refundFirebaseOrder, 
  getDetailedOrders, 
  syncTablesWithFirebase, 
  saveTablesToFirebase, 
  saveStoreProfileToFirebase 
} from './services/firebaseService';

// Mock Initial Data (Global Currency Prices & Images)
const INITIAL_MENU: MenuItem[] = [
  { 
    id: '1', 
    name: 'Americano', 
    category: 'coffee', 
    price: 3.50, 
    cost: 0.80, 
    stock: 100,
    color: 'bg-amber-800',
    image: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=600&q=80'
  },
  { 
    id: '2', 
    name: 'Cafe Latte', 
    category: 'coffee', 
    price: 4.50, 
    cost: 1.20, 
    stock: 80,
    color: 'bg-amber-100',
    image: 'https://images.unsplash.com/photo-1561047029-3000c68339ca?auto=format&fit=crop&w=600&q=80'
  },
  { 
    id: '3', 
    name: 'Cappuccino', 
    category: 'coffee', 
    price: 4.50, 
    cost: 1.20, 
    stock: 50,
    color: 'bg-amber-100',
    image: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?auto=format&fit=crop&w=600&q=80'
  },
  { 
    id: '4', 
    name: 'Vanilla Latte', 
    category: 'coffee', 
    price: 5.00, 
    cost: 1.50, 
    stock: 40,
    color: 'bg-amber-100',
    image: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&w=600&q=80'
  },
  { 
    id: '5', 
    name: 'Lemonade', 
    category: 'beverage', 
    price: 4.00, 
    cost: 0.50, 
    stock: 30,
    color: 'bg-yellow-200',
    image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80'
  },
  { 
    id: '6', 
    name: 'Mint Mojito', 
    category: 'beverage', 
    price: 5.50, 
    cost: 1.00, 
    stock: 25,
    color: 'bg-green-200',
    image: 'https://images.unsplash.com/photo-1621263764928-df1444c5e859?auto=format&fit=crop&w=600&q=80'
  },
  { 
    id: '7', 
    name: 'Chocolate Cake', 
    category: 'dessert', 
    price: 6.50, 
    cost: 2.00, 
    stock: 10, // Low stock demo
    color: 'bg-brown-400',
    image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=600&q=80'
  },
  { 
    id: '8', 
    name: 'Cheese Cake', 
    category: 'dessert', 
    price: 7.00, 
    cost: 2.50, 
    stock: 0, // Out of stock demo
    color: 'bg-yellow-100',
    image: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=600&q=80'
  },
  { 
    id: '9', 
    name: 'Club Sandwich', 
    category: 'meal', 
    price: 12.00, 
    cost: 4.00, 
    stock: 20,
    color: 'bg-green-100',
    image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=600&q=80'
  },
];

// Initialize tables with some default grid-like coordinates (percentages)
const INITIAL_TABLES: Table[] = [
  { id: 1, label: 'T-1', x: 5, y: 5, status: 'empty' },
  { id: 2, label: 'T-2', x: 25, y: 5, status: 'empty' },
  { id: 3, label: 'T-3', x: 45, y: 5, status: 'empty' },
  { id: 4, label: 'T-4', x: 5, y: 30, status: 'empty' },
  { id: 5, label: 'T-5', x: 25, y: 30, status: 'empty' },
  { id: 6, label: 'T-6', x: 45, y: 30, status: 'empty' },
  { id: 7, label: 'VIP-1', x: 70, y: 5, status: 'empty' },
  { id: 8, label: 'VIP-2', x: 70, y: 30, status: 'empty' },
  { id: 9, label: 'W-1', x: 5, y: 60, status: 'empty' },
  { id: 10, label: 'W-2', x: 25, y: 60, status: 'empty' },
  { id: 11, label: 'W-3', x: 45, y: 60, status: 'empty' },
  { id: 12, label: 'Patio', x: 70, y: 60, status: 'empty' },
];

const App: React.FC = () => {
  const [storeProfile, setStoreProfile] = useState<StoreProfile | null>(null);
  const [mode, setMode] = useState<AppMode>(AppMode.POS);
  const [orders, setOrders] = useState<Order[]>([]);
  const [tables, setTables] = useState<Table[]>(INITIAL_TABLES);
  const [menu, setMenu] = useState<MenuItem[]>(INITIAL_MENU);
  const [lastOrder, setLastOrder] = useState<Order | null>(null);
  const [posKey, setPosKey] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const hasLoadedRef = useRef(false);

  // Load cloud data upon login
  useEffect(() => {
    if (!storeProfile) {
      hasLoadedRef.current = false;
      return;
    }

    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    const loadCloudData = async () => {
      setIsSyncing(true);
      try {
        // 1. Sync menu using Cache-First strategy (Strategy 1)
        const syncedMenu = await syncMenuWithCache(storeProfile, INITIAL_MENU);
        setMenu(syncedMenu);

        // 2. Sync layout tables from cloud
        const syncedTables = await syncTablesWithFirebase(storeProfile, INITIAL_TABLES);
        setTables(syncedTables);

        // 3. Load all transaction receipts from cloud
        const loadedOrders = await getDetailedOrders(storeProfile);
        setOrders(loadedOrders);
      } catch (err) {
        console.error('[Firebase Sync Error]', err);
      } finally {
        setIsSyncing(false);
      }
    };

    loadCloudData();
  }, [storeProfile]);

  // If not logged in, show Login View
  if (!storeProfile) {
    return <LoginView onLogin={(profile) => setStoreProfile(profile)} />;
  }

  const handlePlaceOrder = async (tableId: number, items: OrderItem[], total: number) => {
    const newOrder: Order = {
      id: crypto.randomUUID(),
      tableId,
      items,
      total,
      timestamp: new Date(),
      status: 'completed'
    };

    // 1. Prepend order to local state
    setOrders(prev => [newOrder, ...prev]);
    
    // 2. Free up the table locally & sync to layout db
    const updatedTables: Table[] = tables.map(t => 
        t.id === tableId ? { ...t, status: 'empty' as const } : t
    );
    setTables(updatedTables);
    await saveTablesToFirebase(storeProfile, updatedTables);

    // 3. Deduct Stock from Menu locally & sync delta changed items to cloud
    const updatedMenu = menu.map(menuItem => {
        const orderedItem = items.find(i => i.id === menuItem.id);
        if (orderedItem) {
            const updatedItem = { ...menuItem, stock: Math.max(0, menuItem.stock - orderedItem.quantity) };
            updateServerMenuItem(storeProfile, updatedItem); // Sync specific changed item
            return updatedItem;
        }
        return menuItem;
    });
    setMenu(updatedMenu);

    // 4. Save order & atomically increment daily statistics (Strategy 3)
    await placeFirebaseOrder(storeProfile, newOrder, menu);

    setLastOrder(newOrder);
  };

  const handleUpdateOrders = async (newOrders: Order[]) => {
    // Detect if an order status is marked as refunded in DashboardView
    const refunded = newOrders.find(
      n => n.status === 'refunded' && orders.find(o => o.id === n.id)?.status === 'completed'
    );

    if (refunded) {
      await refundFirebaseOrder(storeProfile, refunded, menu);
    }
    setOrders(newOrders);
  };

  const handleUpdateProfile = async (newProfile: StoreProfile) => {
    setStoreProfile(newProfile);
    await saveStoreProfileToFirebase(newProfile);
  };

  const handleUpdateMenu = async (newMenu: MenuItem[]) => {
    setMenu(newMenu);
    
    // Deleted items sync
    const deleted = menu.filter(item => !newMenu.some(n => n.id === item.id));
    for (const d of deleted) {
      await deleteServerMenuItem(storeProfile, d.id);
    }

    // Created or edited items sync
    const updated = newMenu.filter(n => {
      const orig = menu.find(o => o.id === n.id);
      return !orig || JSON.stringify(orig) !== JSON.stringify(n);
    });
    for (const u of updated) {
      await updateServerMenuItem(storeProfile, u);
    }
  };

  const handleUpdateTables = async (newTables: Table[]) => {
    setTables(newTables);
    await saveTablesToFirebase(storeProfile, newTables);
  };

  const handleLogoClick = () => {
      setMode(AppMode.POS);
      setPosKey(prev => prev + 1);
  };

  const handleLogout = () => {
    setStoreProfile(null);
    setOrders([]); 
  };

  const renderContent = () => {
    switch (mode) {
      case AppMode.POS:
        return (
          <PosView 
            key={posKey}
            tables={tables} 
            menu={menu} 
            onPlaceOrder={handlePlaceOrder} 
            storeProfile={storeProfile}
          />
        );
      case AppMode.DASHBOARD:
        return (
          <DashboardView 
            orders={orders}
            onUpdateOrders={handleUpdateOrders} // Intercept order status updates (refunds)
            menu={menu}
            storeProfile={storeProfile}
          />
        );
      case AppMode.SETTINGS:
        return (
          <SettingsView 
            storeProfile={storeProfile} 
            onUpdateProfile={handleUpdateProfile}
            menu={menu}
            onUpdateMenu={handleUpdateMenu}
            tables={tables}
            onUpdateTables={handleUpdateTables}
          />
        );
      default:
        return null;
    }
  };

  const getLogo = () => {
    switch (storeProfile.logoIcon) {
        case 'mountain': return <MountainSnow className="text-white" size={24} />;
        case 'cloud': return <CloudSun className="text-white" size={24} />;
        default: return <Coffee className="text-white" size={24} />;
    }
  };

  const sidebarTheme = "bg-slate-900"; 

  return (
    <div className="flex h-screen w-screen bg-gray-100 text-gray-900 font-sans overflow-hidden flex-col-reverse md:flex-row relative">
      
      {/* Navigation */}
      <nav className={`w-full md:w-20 ${sidebarTheme} flex flex-row md:flex-col items-center justify-between md:justify-start py-2 md:py-6 px-6 md:px-0 gap-0 md:gap-8 shadow-2xl z-20 shrink-0`}>
        <button 
          onClick={handleLogoClick}
          className={`w-10 h-10 md:w-12 md:h-12 rounded-xl hidden md:flex items-center justify-center shadow-lg shadow-indigo-500/30 hover:bg-white/10 transition active:scale-95 ${storeProfile.themeColor || 'bg-indigo-600'}`}
          title={storeProfile.name}
        >
           {getLogo()}
        </button>

        <div className="flex-1 flex flex-row md:flex-col justify-around md:justify-start gap-1 md:gap-6 w-full md:px-2">
          <button 
            onClick={() => setMode(AppMode.POS)}
            className={`flex flex-col items-center gap-1 p-2 md:p-3 rounded-xl transition-all ${mode === AppMode.POS ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <MonitorPlay size={20} className="md:w-6 md:h-6" />
            <span className="text-[10px] font-bold">POS</span>
          </button>
          
          <button 
            onClick={() => setMode(AppMode.DASHBOARD)}
            className={`flex flex-col items-center gap-1 p-2 md:p-3 rounded-xl transition-all ${mode === AppMode.DASHBOARD ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <LayoutGrid size={20} className="md:w-6 md:h-6" />
            <span className="text-[10px] font-bold">Admin</span>
          </button>

          <button 
            onClick={() => setMode(AppMode.SETTINGS)}
            className={`flex flex-col items-center gap-1 p-2 md:p-3 rounded-xl transition-all ${mode === AppMode.SETTINGS ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <Settings size={20} className="md:w-6 md:h-6" />
            <span className="text-[10px] font-bold">Settings</span>
          </button>
        </div>

        <button onClick={handleLogout} className="text-gray-500 hover:text-red-400 p-3 hidden md:block" title="Logout">
          <LogOut size={24} />
        </button>

        <div className="mt-auto pb-4 hidden md:flex flex-col items-center gap-1 opacity-20 hover:opacity-100 transition-opacity cursor-default">
           <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-[10px] font-black text-white border border-white/10">HP</div>
           <span className="text-[8px] text-gray-500 font-bold uppercase tracking-tighter">Himpower</span>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 relative overflow-hidden">
        {renderContent()}
      </main>

      {/* Overlays */}
      <ReceiptModal 
        order={lastOrder} 
        onClose={() => setLastOrder(null)}
        storeProfile={storeProfile} 
      />

      {/* Floating Background Sync Status Indicator */}
      {isSyncing && (
        <div className="absolute top-4 right-4 z-50 bg-slate-900/90 text-white backdrop-blur-md border border-slate-700/50 rounded-full px-3.5 py-1.5 flex items-center gap-2 text-xs font-semibold shadow-lg animate-in fade-in slide-in-from-top-2">
          <Loader2 size={13} className="animate-spin text-indigo-400" />
          <span className="text-[11px] font-bold tracking-tight text-slate-100">Syncing Cloud...</span>
        </div>
      )}
      
    </div>
  );
};

export default App;