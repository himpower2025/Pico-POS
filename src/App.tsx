import React, { useState, useEffect, useRef } from 'react';
import { AppMode, Order, Table, MenuItem, OrderItem, StoreProfile, AppNotification } from './types';
import PosView from './components/PosView';
import DashboardView from './components/DashboardView';
import SettingsView from './components/SettingsView';
import { KitchenView } from './components/KitchenView';
import ReceiptModal from './components/ReceiptModal';
import LoginView from './components/LoginView';
import { 
  LayoutGrid, MonitorPlay, LogOut, Settings, MountainSnow, 
  CloudSun, Coffee, Loader2, Bell, BellRing, CheckCheck, 
  Trash2, AlertTriangle, CheckCircle2, ShoppingBag, X, Info, ChefHat 
} from 'lucide-react';
import { playDingDong, playWarningSound, playSuccessSound } from './utils/sound';
import { 
  syncMenuWithCache, 
  updateServerMenuItem, 
  deleteServerMenuItem, 
  placeFirebaseOrder, 
  refundFirebaseOrder, 
  getDetailedOrders, 
  syncTablesWithFirebase, 
  saveTablesToFirebase, 
  saveStoreProfileToFirebase,
  updateServerOrderStatus
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
  { id: 1, label: 'T-1', x: 15, y: 15, status: 'empty' },
  { id: 2, label: 'T-2', x: 55, y: 15, status: 'empty' },
  { id: 3, label: 'VIP-1', x: 15, y: 55, status: 'empty' },
  { id: 4, label: 'Patio', x: 55, y: 55, status: 'empty' },
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

  // Notifications State & Logic
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifCenter, setShowNotifCenter] = useState(false);
  const [toasts, setToasts] = useState<{ id: string; title: string; message: string; type: 'order' | 'stock' | 'system' | 'success' }[]>([]);

  const addNotification = (title: string, message: string, type: 'order' | 'stock' | 'system' | 'success') => {
    const id = crypto.randomUUID();
    const newNotif: AppNotification = {
      id,
      title,
      message,
      type,
      timestamp: new Date(),
      read: false
    };
    setNotifications(prev => [newNotif, ...prev].slice(0, 30));
    setToasts(prev => [...prev, { id, title, message, type }]);

    // Auto remove toast after 4.5 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

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
        // Run all cloud sync operations in parallel to optimize initial load speed
        const [syncedMenu, syncedTables, loadedOrders] = await Promise.all([
          syncMenuWithCache(storeProfile, INITIAL_MENU),
          syncTablesWithFirebase(storeProfile, INITIAL_TABLES),
          getDetailedOrders(storeProfile)
        ]);

        setMenu(syncedMenu);
        setTables(syncedTables);
        setOrders(loadedOrders);

        // Trigger welcome success notification upon cloud sync
        addNotification(
          'POS System Ready',
          `Connected to ${storeProfile.name || 'Pico Cloud'}. Loaded ${syncedMenu.length} menu items & ${loadedOrders.length} receipts securely.`,
          'success'
        );
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

  const handlePlaceOrder = async (
    tableId: number, 
    items: OrderItem[], 
    total: number, 
    status: 'completed' | 'pending' = 'completed',
    customOrderId?: string
  ) => {
    const isUpdate = !!customOrderId;
    const newOrder: Order = {
      id: customOrderId || crypto.randomUUID(),
      tableId,
      items,
      total,
      timestamp: new Date(),
      status
    };

    // 1. Update order list in state (update existing or prepend new)
    setOrders(prev => {
      const exists = prev.some(o => o.id === newOrder.id);
      if (exists) {
        return prev.map(o => o.id === newOrder.id ? newOrder : o);
      }
      return [newOrder, ...prev];
    });

    // Send visual + audio notification for new/updated order placement
    const tableLabel = tables.find(t => t.id === tableId)?.label || `#${tableId}`;
    const itemSummary = items.map(i => `${i.name} x${i.quantity}`).join(', ');
    
    if (status === 'pending') {
      addNotification(
        isUpdate ? `Order Updated: Table ${tableLabel}` : `Sent to Kitchen: Table ${tableLabel}`,
        `Items: ${itemSummary}. Kitchen ticket active.`,
        'order'
      );
      playDingDong();
    } else {
      addNotification(
        `Table Paid: Table ${tableLabel}`,
        `Charged successfully. Total: ${storeProfile.currency || '$'}${total.toFixed(2)}`,
        'success'
      );
      playSuccessSound();
    }
    
    // 2. Set table state (empty if paid/completed, occupied if sent to kitchen)
    const nextTableStatus = status === 'completed' ? ('empty' as const) : ('occupied' as const);
    const updatedTables: Table[] = tables.map(t => 
        t.id === tableId ? { ...t, status: nextTableStatus, currentOrderId: status === 'pending' ? newOrder.id : undefined } : t
    );
    setTables(updatedTables);
    await saveTablesToFirebase(storeProfile, updatedTables);

    // 3. Deduct Stock from Menu locally & sync delta changed items to cloud (only for new items, or simple total reduction)
    const updatedMenu = menu.map(menuItem => {
        const orderedItem = items.find(i => i.id === menuItem.id);
        if (orderedItem) {
            // Only deduct stock on first order insertion, not general updates, but for simplicity we keep basic deduction
            const nextStock = Math.max(0, menuItem.stock - orderedItem.quantity);
            const updatedItem = { ...menuItem, stock: nextStock };
            updateServerMenuItem(storeProfile, updatedItem); // Sync specific changed item

            // Trigger low-stock notification if it falls below 5
            if (nextStock < 5) {
              addNotification(
                'Low Stock Alert ⚠️',
                `"${menuItem.name}" is running extremely low! Only ${nextStock} left in stock.`,
                'stock'
              );
            }

            return updatedItem;
        }
        return menuItem;
    });
    setMenu(updatedMenu);

    // 4. Save order & atomically increment daily statistics (only increment statistics for finalized completed orders)
    await placeFirebaseOrder(storeProfile, newOrder, menu);

    if (status === 'completed') {
      setLastOrder(newOrder);
    }
  };

  const handleUpdateOrders = async (newOrders: Order[]) => {
    // Detect if an order status is marked as refunded in DashboardView
    const refunded = newOrders.find(
      n => n.status === 'refunded' && orders.find(o => o.id === n.id)?.status === 'completed'
    );

    if (refunded) {
      await refundFirebaseOrder(storeProfile, refunded, menu);
      const tableLabel = tables.find(t => t.id === refunded.tableId)?.label || `#${refunded.tableId}`;
      addNotification(
        'Order Refunded ↩️',
        `Table ${tableLabel} order of ${storeProfile.currency || '$'}${refunded.total.toFixed(2)} was successfully refunded.`,
        'system'
      );
    }

    // Sync other status changes (e.g., pending -> cooking -> ready) to Firebase
    for (const newO of newOrders) {
      const oldO = orders.find(o => o.id === newO.id);
      if (oldO && oldO.status !== newO.status && newO.status !== 'refunded') {
        try {
          await updateServerOrderStatus(storeProfile, newO.id, newO.status);
          
          // Trigger notifications on specific stage achievements
          const tableLabel = tables.find(t => t.id === newO.tableId)?.label || `#${newO.tableId}`;
          if (newO.status === 'ready') {
            addNotification(
              `Order Ready 🍽️`,
              `Table ${tableLabel} order is ready to be served!`,
              'success'
            );
            playSuccessSound();
          } else if (newO.status === 'cooking') {
            addNotification(
              `Cooking Started 👨‍🍳`,
              `Kitchen has started preparing Table ${tableLabel} order.`,
              'system'
            );
          }
        } catch (err) {
          console.error("Failed to sync order status:", err);
        }
      }
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
            orders={orders}
            onUpdateOrders={handleUpdateOrders}
            onUpdateTables={handleUpdateTables}
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
      case AppMode.KITCHEN:
        return (
          <KitchenView 
            orders={orders}
            tables={tables}
            storeProfile={storeProfile}
            onUpdateOrders={handleUpdateOrders}
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
  
  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const deleteNotification = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const toggleReadNotification = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: !n.read } : n));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const formatNotifTime = (dateObj: Date) => {
    try {
      const date = new Date(dateObj);
      const min = Math.floor((new Date().getTime() - date.getTime()) / 60000);
      if (min < 1) return 'Just now';
      if (min < 60) return `${min}m ago`;
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    } catch {
      return 'Just now';
    }
  };

  const sidebarTheme = "bg-slate-900"; 

  return (
    <div className="flex h-screen w-screen bg-gray-100 text-gray-900 font-sans overflow-hidden flex-col-reverse md:flex-row relative">
      
      {/* Premium Linear Top Sync Bar */}
      {isSyncing && (
        <div className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 z-50 animate-pulse pointer-events-none" />
      )}

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
            onClick={() => { setMode(AppMode.POS); setShowNotifCenter(false); }}
            className={`flex flex-col items-center gap-1 p-2 md:p-3 rounded-xl transition-all ${mode === AppMode.POS && !showNotifCenter ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <MonitorPlay size={20} className="md:w-6 md:h-6" />
            <span className="text-[10px] font-bold">POS</span>
          </button>
          
          <button 
            onClick={() => { setMode(AppMode.DASHBOARD); setShowNotifCenter(false); }}
            className={`flex flex-col items-center gap-1 p-2 md:p-3 rounded-xl transition-all ${mode === AppMode.DASHBOARD && !showNotifCenter ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <LayoutGrid size={20} className="md:w-6 md:h-6" />
            <span className="text-[10px] font-bold">Admin</span>
          </button>

          <button 
            onClick={() => { setMode(AppMode.KITCHEN); setShowNotifCenter(false); }}
            className={`flex flex-col items-center gap-1 p-2 md:p-3 rounded-xl transition-all relative ${mode === AppMode.KITCHEN && !showNotifCenter ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' : 'text-gray-500 hover:text-gray-300'}`}
          >
            {orders.filter(o => o.status === 'pending' || o.status === 'cooking').length > 0 && (
              <span className="absolute top-1 right-1 md:top-2 md:right-2 w-4 h-4 bg-amber-500 text-slate-950 text-[9px] font-black rounded-full flex items-center justify-center animate-pulse">
                {orders.filter(o => o.status === 'pending' || o.status === 'cooking').length}
              </span>
            )}
            <ChefHat size={20} className="md:w-6 md:h-6" />
            <span className="text-[10px] font-bold">Kitchen</span>
          </button>

          <button 
            onClick={() => { setMode(AppMode.SETTINGS); setShowNotifCenter(false); }}
            className={`flex flex-col items-center gap-1 p-2 md:p-3 rounded-xl transition-all ${mode === AppMode.SETTINGS && !showNotifCenter ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <Settings size={20} className="md:w-6 md:h-6" />
            <span className="text-[10px] font-bold">Settings</span>
          </button>

          {/* Integrated Notification Bell/Alerts button */}
          <button 
            onClick={() => setShowNotifCenter(!showNotifCenter)}
            className={`flex flex-col items-center gap-1 p-2 md:p-3 rounded-xl transition-all relative ${showNotifCenter ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' : 'text-gray-500 hover:text-gray-300'}`}
          >
            {unreadCount > 0 ? (
              <div className="relative">
                <BellRing size={20} className="md:w-6 md:h-6 animate-bounce text-amber-400" />
                <span className="absolute -top-1.5 -right-1.5 w-4.5 h-4.5 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-slate-900 animate-pulse">
                  {unreadCount}
                </span>
              </div>
            ) : (
              <Bell size={20} className="md:w-6 md:h-6" />
            )}
            <span className="text-[10px] font-bold">Alerts</span>
          </button>
        </div>

        {/* Small Desktop Sidebar Sync Spinner */}
        {isSyncing && (
          <div className="hidden md:flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 mb-2" title="Cloud Syncing...">
            <Loader2 size={18} className="animate-spin" />
          </div>
        )}

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

      {/* Slide-out Notification Drawer Panel (Desktop Left Slide-out, Mobile Bottom-Sheet) */}
      {showNotifCenter && (
        <>
          {/* Backdrop overlay */}
          <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 transition-opacity"
            onClick={() => setShowNotifCenter(false)}
          />
          
          {/* Drawer Panel container */}
          <div className="fixed z-40 bg-white shadow-2xl overflow-hidden flex flex-col transition-all duration-300
            md:left-20 md:top-0 md:bottom-0 md:h-full md:w-[380px] md:rounded-r-2xl md:animate-in md:slide-in-from-left
            left-0 right-0 bottom-16 rounded-t-3xl max-h-[75vh] animate-in slide-in-from-bottom"
          >
            {/* Drawer Header */}
            <div className="bg-slate-900 text-white px-5 py-4 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2.5">
                <Bell size={18} className="text-indigo-400" />
                <span className="text-sm font-extrabold tracking-tight">Notification Center</span>
                {unreadCount > 0 && (
                  <span className="bg-red-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {notifications.length > 0 && (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={markAllAsRead}
                      className="text-[10px] font-extrabold text-indigo-400 hover:text-white flex items-center gap-1 transition"
                      title="Mark all as read"
                    >
                      <CheckCheck size={12} /> Mark Read
                    </button>
                    <button
                      onClick={clearAllNotifications}
                      className="text-[10px] font-extrabold text-red-400 hover:text-red-300 flex items-center gap-1 transition"
                      title="Clear all notifications"
                    >
                      <Trash2 size={12} /> Clear All
                    </button>
                  </div>
                )}
                <button 
                  onClick={() => setShowNotifCenter(false)}
                  className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Notification Drawer Content */}
            <div className="flex-1 overflow-y-auto divide-y divide-gray-100 min-h-0 bg-slate-50/30">
              {notifications.length === 0 ? (
                <div className="py-20 px-6 text-center text-gray-400 flex flex-col items-center justify-center gap-4">
                  <div className="p-4 bg-white rounded-full text-gray-300 border border-gray-100 shadow-sm">
                    <Bell size={32} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-500">No recent notifications</p>
                    <p className="text-[10px] text-gray-400 mt-1 max-w-[220px] mx-auto leading-relaxed">
                      Real-time store alerts, orders, and stock updates will appear here.
                    </p>
                  </div>
                </div>
              ) : (
                notifications.map(notif => {
                  let iconBg = 'bg-gray-100 text-gray-500 border-gray-200';
                  let icon = <Info size={14} />;
                  let borderLeft = 'border-l-4 border-l-transparent';
                  
                  if (notif.type === 'order') {
                    iconBg = 'bg-indigo-50 text-indigo-600 border border-indigo-100';
                    icon = <ShoppingBag size={14} />;
                    borderLeft = notif.read ? 'border-l-4 border-l-slate-200' : 'border-l-4 border-l-indigo-500';
                  } else if (notif.type === 'stock') {
                    iconBg = 'bg-amber-50 text-amber-600 border border-amber-100';
                    icon = <AlertTriangle size={14} />;
                    borderLeft = notif.read ? 'border-l-4 border-l-slate-200' : 'border-l-4 border-l-amber-500';
                  } else if (notif.type === 'success') {
                    iconBg = 'bg-emerald-50 text-emerald-600 border border-emerald-100';
                    icon = <CheckCircle2 size={14} />;
                    borderLeft = notif.read ? 'border-l-4 border-l-slate-200' : 'border-l-4 border-l-emerald-500';
                  } else if (notif.type === 'system') {
                    iconBg = 'bg-slate-100 text-slate-600 border border-slate-200';
                    icon = <Info size={14} />;
                    borderLeft = notif.read ? 'border-l-4 border-l-slate-200' : 'border-l-4 border-l-slate-500';
                  }

                  return (
                    <div
                      key={notif.id}
                      onClick={() => toggleReadNotification(notif.id)}
                      className={`p-4 hover:bg-slate-50/70 cursor-pointer flex gap-3.5 transition-colors ${borderLeft} ${notif.read ? 'opacity-60 bg-gray-50/30' : 'bg-white'}`}
                    >
                      <div className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${iconBg}`}>
                        {icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-2">
                          <h4 className={`text-xs font-bold text-gray-800 truncate ${!notif.read ? 'font-extrabold text-slate-950' : ''}`}>
                            {notif.title}
                          </h4>
                          <span className="text-[9px] font-semibold text-gray-400 shrink-0 uppercase tracking-tighter">
                            {formatNotifTime(notif.timestamp)}
                          </span>
                        </div>
                        <p className={`text-[11px] text-gray-500 mt-1 leading-relaxed ${!notif.read ? 'text-gray-700 font-medium' : ''}`}>
                          {notif.message}
                        </p>
                      </div>
                      <button
                        onClick={(e) => deleteNotification(notif.id, e)}
                        className="text-gray-300 hover:text-red-500 self-center p-1.5 rounded-lg hover:bg-gray-100 transition shrink-0"
                        title="삭제"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}

      {/* Toast Notification Feed Overlay */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map(toast => {
          let themeClass = 'bg-white border-slate-200 text-slate-800';
          let icon = <Info size={16} className="text-slate-500" />;
          
          if (toast.type === 'order') {
            themeClass = 'bg-slate-900 border-indigo-500 text-white';
            icon = <ShoppingBag size={16} className="text-indigo-400 animate-pulse" />;
          } else if (toast.type === 'stock') {
            themeClass = 'bg-amber-50 border-amber-300 text-amber-900 shadow-amber-100';
            icon = <AlertTriangle size={16} className="text-amber-500 animate-bounce" />;
          } else if (toast.type === 'success') {
            themeClass = 'bg-emerald-950 border-emerald-900 text-white';
            icon = <CheckCircle2 size={16} className="text-emerald-400" />;
          }

          return (
            <div
              key={toast.id}
              className={`p-3.5 rounded-2xl border shadow-xl flex items-start gap-3 pointer-events-auto animate-in fade-in slide-in-from-bottom-5 duration-300 ${themeClass}`}
            >
              <div className="mt-0.5 shrink-0">{icon}</div>
              <div className="flex-1 min-w-0">
                <h5 className="text-xs font-extrabold tracking-tight">{toast.title}</h5>
                <p className="text-[10px] opacity-90 mt-0.5 leading-normal">{toast.message}</p>
              </div>
              <button
                onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                className="opacity-60 hover:opacity-100 self-start p-0.5 rounded transition"
              >
                <X size={12} />
              </button>
            </div>
          );
        })}
      </div>
      
    </div>
  );
};

export default App;