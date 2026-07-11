import React, { useState, useRef } from 'react';
import { CreditCard, Wifi, Edit, Plus, Trash2, LayoutTemplate, Coffee, Printer, Bluetooth, Building2, PaintBucket, CloudSun, ShieldAlert } from 'lucide-react';
import { StoreProfile, MenuItem, Table } from '../types';
import { formatCurrency } from '../lib/utils';
import { LegalDocsView } from './LegalDocs';
import { SubscriptionView } from './SubscriptionView';

interface SettingsViewProps {
    storeProfile: StoreProfile;
    onUpdateProfile: (p: StoreProfile) => void;
    menu: MenuItem[];
    onUpdateMenu: (m: MenuItem[]) => void;
    tables: Table[];
    onUpdateTables: (t: Table[]) => void;
}

type Tab = 'profile' | 'menu' | 'floor' | 'hardware' | 'subscription' | 'legal' | 'about';

const SettingsView: React.FC<SettingsViewProps> = ({ 
    storeProfile, onUpdateProfile, 
    menu, onUpdateMenu,
    tables, onUpdateTables
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('profile');

  // --- Custom Currency State ---
  const PRESET_CURRENCIES = ['USD', 'KRW', 'NPR', 'EUR', 'INR'];
  const isPresetCurrency = PRESET_CURRENCIES.includes(storeProfile.currency);

  const [customCurrencyCode, setCustomCurrencyCode] = useState(() => {
    return isPresetCurrency ? 'CAD' : storeProfile.currency;
  });
  const [customCurrencySymbol, setCustomCurrencySymbol] = useState(() => {
    if (isPresetCurrency) return 'C$';
    try {
      const saved = localStorage.getItem('pico_custom_currencies');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed[storeProfile.currency]) return parsed[storeProfile.currency].symbol;
      }
    } catch (e) {
      // ignore
    }
    return 'C$';
  });
  const [customCurrencyRate, setCustomCurrencyRate] = useState(() => {
    if (isPresetCurrency) return 1.35;
    try {
      const saved = localStorage.getItem('pico_custom_currencies');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed[storeProfile.currency]) return parsed[storeProfile.currency].rate;
      }
    } catch (e) {
      // ignore
    }
    return 1.35;
  });
  const [customCurrencyDecimals, setCustomCurrencyDecimals] = useState<number>(() => {
    if (isPresetCurrency) return 2;
    try {
      const saved = localStorage.getItem('pico_custom_currencies');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed[storeProfile.currency]) return parsed[storeProfile.currency].decimals;
      }
    } catch (e) {
      // ignore
    }
    return 2;
  });

  const handleSaveCustomCurrency = (code: string, symbol: string, rate: number, decimals: number) => {
    const cleanCode = code.trim().toUpperCase() || 'CUSTOM';
    const cleanSymbol = symbol.trim() || '$';
    const cleanRate = Number(rate) || 1.0;
    
    try {
      const saved = localStorage.getItem('pico_custom_currencies');
      const parsed = saved ? JSON.parse(saved) : {};
      parsed[cleanCode] = { rate: cleanRate, symbol: cleanSymbol, decimals };
      localStorage.setItem('pico_custom_currencies', JSON.stringify(parsed));
    } catch (e) {
      console.error(e);
    }

    onUpdateProfile({
      ...storeProfile,
      currency: cleanCode
    });
  };
  
  // Menu Editor State
  const [editingItem, setEditingItem] = useState<Partial<MenuItem> | null>(null);

  // Floor Plan State
  const floorRef = useRef<HTMLDivElement>(null);
  const [draggingTable, setDraggingTable] = useState<number | null>(null);

  // Hardware State
  const [connectedPrinter, setConnectedPrinter] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  // --- Menu Handlers ---
  const handleSaveItem = () => {
    if (!editingItem || !editingItem.name || !editingItem.price) return;
    
    if (editingItem.id) {
        // Edit existing
        onUpdateMenu(menu.map(item => item.id === editingItem.id ? { ...item, ...editingItem } as MenuItem : item));
    } else {
        // Create new
        const newItem: MenuItem = {
            id: crypto.randomUUID(),
            name: editingItem.name,
            category: editingItem.category || 'coffee',
            price: Number(editingItem.price),
            cost: Number(editingItem.cost) || 0,
            stock: Number(editingItem.stock) || 0,
            color: 'bg-indigo-100',
            image: editingItem.image || 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80'
        };
        onUpdateMenu([...menu, newItem]);
    }
    setEditingItem(null);
  };

  const handleDeleteItem = (id: string) => {
    if (confirm("Are you sure you want to delete this item?")) {
        onUpdateMenu(menu.filter(item => item.id !== id));
    }
  };

  // --- Floor Plan Handlers ---
  const handleAddTable = () => {
      const newId = Math.max(...tables.map(t => t.id), 0) + 1;
      onUpdateTables([...tables, { 
          id: newId, 
          label: `T-${newId}`, 
          x: 10, 
          y: 10, 
          status: 'empty' 
      }]);
  };

  const handleRemoveTable = (id: number) => {
      if (confirm("Delete this table?")) {
          onUpdateTables(tables.filter(t => t.id !== id));
      }
  };

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent, id: number) => {
      setDraggingTable(id);
  };

  const handleDragMove = (e: React.MouseEvent | React.TouchEvent) => {
      if (draggingTable === null || !floorRef.current) return;

      const rect = floorRef.current.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

      // Calculate percentage relative to container
      let x = ((clientX - rect.left) / rect.width) * 100;
      let y = ((clientY - rect.top) / rect.height) * 100;

      // Constrain
      x = Math.max(0, Math.min(90, x)); // 90 to allow width of table
      y = Math.max(0, Math.min(90, y));

      onUpdateTables(tables.map(t => t.id === draggingTable ? { ...t, x, y } : t));
  };

  const handleDragEnd = () => {
      setDraggingTable(null);
  };

  // --- Hardware Handlers ---
  const connectPrinter = async () => {
    setIsScanning(true);
    try {
        // Fix: Cast navigator to any to avoid TS error with bluetooth
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const nav = navigator as any;
        
        if (!nav.bluetooth) {
            alert("Web Bluetooth is not supported in this browser. Try using Chrome or Edge.");
            setIsScanning(false);
            return;
        }

        const device = await nav.bluetooth.requestDevice({
            acceptAllDevices: true,
            optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb'] // Standard 16-bit UUID for Print Service
        });
        
        if (device) {
            setConnectedPrinter(device.name || "Unknown Printer");
        }
    } catch (error) {
        console.error("Bluetooth Error:", error);
        // User cancelled or error
    } finally {
        setIsScanning(false);
    }
  };

  return (
    <div className="h-full overflow-hidden bg-gray-50 flex flex-col"
         onMouseMove={draggingTable !== null ? (e) => handleDragMove(e) : undefined}
         onMouseUp={handleDragEnd}
         onTouchMove={draggingTable !== null ? (e) => handleDragMove(e) : undefined}
         onTouchEnd={handleDragEnd}
    >
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center shrink-0">
         <h1 className="text-2xl font-bold text-gray-900">Store Settings</h1>
         <div className="flex gap-2">
            <button 
                onClick={() => setActiveTab('profile')}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition ${activeTab === 'profile' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >
                Profile
            </button>
            <button 
                onClick={() => setActiveTab('menu')}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition ${activeTab === 'menu' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >
                Menu
            </button>
            <button 
                onClick={() => setActiveTab('floor')}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition ${activeTab === 'floor' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >
                Floor
            </button>
            <button 
                onClick={() => setActiveTab('hardware')}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition flex items-center gap-1 ${activeTab === 'hardware' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >
                Hardware
            </button>
            <button 
                onClick={() => setActiveTab('subscription')}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition flex items-center gap-1 ${activeTab === 'subscription' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >
                Subscription
            </button>
            <button 
                onClick={() => setActiveTab('legal')}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition flex items-center gap-1 ${activeTab === 'legal' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >
                Legal
            </button>
            <button 
                onClick={() => setActiveTab('about')}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition ${activeTab === 'about' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >
                About
            </button>
         </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto">
            
            {/* PROFILE TAB */}
            {activeTab === 'profile' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                   <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-bold text-gray-800">General Information</h2>
                            <p className="text-sm text-gray-500">Update your store details visible on receipts.</p>
                        </div>
                        <div className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-1 rounded-full text-xs font-bold">
                            <Wifi size={14} /> Online
                        </div>
                   </div>

                   <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Store Name</label>
                                <input 
                                    type="text" 
                                    value={storeProfile.name}
                                    onChange={(e) => onUpdateProfile({...storeProfile, name: e.target.value})}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                                <input 
                                    type="text" 
                                    value={storeProfile.location}
                                    onChange={(e) => onUpdateProfile({...storeProfile, location: e.target.value})}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
                              <select 
                                value={['USD', 'KRW', 'NPR', 'EUR', 'INR'].includes(storeProfile.currency) ? storeProfile.currency : 'CUSTOM'}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val === 'CUSTOM') {
                                    const code = customCurrencyCode || 'CUSTOM';
                                    handleSaveCustomCurrency(code, customCurrencySymbol || '$', customCurrencyRate, customCurrencyDecimals);
                                  } else {
                                    onUpdateProfile({...storeProfile, currency: val});
                                  }
                                }}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                              >
                                <option value="USD">USD (US Dollar - $)</option>
                                <option value="KRW">KRW (Korean Won - ₩)</option>
                                <option value="NPR">NPR (Nepalese Rupee - Rs.)</option>
                                <option value="INR">INR (Indian Rupee - ₹)</option>
                                <option value="EUR">EUR (Euro - €)</option>
                                <option value="CUSTOM">Custom (Custom Input)</option>
                              </select>
                           </div>
                           <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Tax Rate (%)</label>
                                <input 
                                    type="number" 
                                    value={storeProfile.taxRate}
                                    onChange={(e) => onUpdateProfile({...storeProfile, taxRate: Number(e.target.value)})}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                           </div>
                        </div>

                        {/* Custom Currency Settings Form */}
                        {!['USD', 'KRW', 'NPR', 'EUR', 'INR'].includes(storeProfile.currency) && (
                          <div className="bg-indigo-50/40 p-5 rounded-2xl border border-indigo-100 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-black text-indigo-900">Custom Currency Settings</h4>
                              <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold">Active: {storeProfile.currency}</span>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Currency Code</label>
                                <input 
                                  type="text"
                                  placeholder="e.g. CAD, GBP, AUD"
                                  value={customCurrencyCode}
                                  onChange={(e) => {
                                    const code = e.target.value.toUpperCase().slice(0, 8);
                                    setCustomCurrencyCode(code);
                                    handleSaveCustomCurrency(code, customCurrencySymbol, customCurrencyRate, customCurrencyDecimals);
                                  }}
                                  className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 bg-white font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Currency Symbol</label>
                                <input 
                                  type="text"
                                  placeholder="e.g. C$, £, A$"
                                  value={customCurrencySymbol}
                                  onChange={(e) => {
                                    const sym = e.target.value;
                                    setCustomCurrencySymbol(sym);
                                    handleSaveCustomCurrency(customCurrencyCode, sym, customCurrencyRate, customCurrencyDecimals);
                                  }}
                                  className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Exchange Rate (vs 1 USD)</label>
                                <input 
                                  type="number"
                                  step="0.0001"
                                  placeholder="e.g. 1.35"
                                  value={customCurrencyRate}
                                  onChange={(e) => {
                                    const rate = Number(e.target.value) || 1.0;
                                    setCustomCurrencyRate(rate);
                                    handleSaveCustomCurrency(customCurrencyCode, customCurrencySymbol, rate, customCurrencyDecimals);
                                  }}
                                  className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 bg-white font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Decimal Places</label>
                                <select 
                                  value={customCurrencyDecimals}
                                  onChange={(e) => {
                                    const dec = Number(e.target.value);
                                    setCustomCurrencyDecimals(dec);
                                    handleSaveCustomCurrency(customCurrencyCode, customCurrencySymbol, customCurrencyRate, dec);
                                  }}
                                  className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                >
                                  <option value={0}>0 (No decimals - e.g. ₩)</option>
                                  <option value={2}>2 (Two decimals - e.g. $)</option>
                                </select>
                              </div>
                            </div>
                            <p className="text-xs text-indigo-700/80 leading-relaxed">
                              Configure any global currency! The exchange rate converts base values, and the symbol is rendered across the POS layout, receipt headers, and history grids.
                            </p>
                          </div>
                        )}

                         {/* Theme Customization */}
                         <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2"><PaintBucket size={16}/> Theme Color</label>
                            <div className="flex gap-3">
                                {['bg-indigo-600', 'bg-blue-600', 'bg-emerald-600', 'bg-rose-600', 'bg-slate-800'].map((color) => (
                                    <button
                                        key={color}
                                        onClick={() => onUpdateProfile({...storeProfile, themeColor: color})}
                                        className={`w-10 h-10 rounded-full ${color} shadow-md transition-transform hover:scale-110 flex items-center justify-center`}
                                    >
                                        {storeProfile.themeColor === color && <div className="w-4 h-4 bg-white rounded-full"></div>}
                                    </button>
                                ))}
                            </div>
                            <p className="text-xs text-gray-400 mt-2">Customize the POS sidebar and button colors.</p>
                        </div>
                   </div>

                   {/* Tax & Settlement Section */}
                   <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
                        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                             <Building2 size={18} className="text-gray-500"/> Tax & Settlement
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">PAN / VAT Number</label>
                                <input 
                                    type="text" 
                                    value={storeProfile.panNumber || ''}
                                    onChange={(e) => onUpdateProfile({...storeProfile, panNumber: e.target.value})}
                                    placeholder="e.g. 300123456"
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                                <p className="text-xs text-gray-400 mt-1">This number will appear on every invoice for tax compliance.</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Settlement Account</label>
                                <input 
                                    type="text" 
                                    value={storeProfile.settlementAccount || ''}
                                    onChange={(e) => onUpdateProfile({...storeProfile, settlementAccount: e.target.value})}
                                    placeholder="e.g. Nabil Bank 001... or eSewa ID"
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                                <p className="text-xs text-gray-400 mt-1">
                                    Funds from credit card terminals are settled here by your bank. eSewa payments go to your Wallet ID.
                                </p>
                            </div>
                        </div>
                   </div>

                   {/* Pricing Plan - Removed as requested */}
                </div>
            )}

            {/* MENU EDITOR TAB */}
            {activeTab === 'menu' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-xl font-bold text-gray-800">Menu Management</h2>
                            <p className="text-sm text-gray-500">Add, edit, or remove items from your POS.</p>
                        </div>
                        <button 
                            onClick={() => setEditingItem({})}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 shadow-md shadow-indigo-200 transition"
                        >
                            <Plus size={18} /> Add Item
                        </button>
                    </div>

                    {/* Edit Form */}
                    {editingItem && (
                        <div className="bg-white p-6 rounded-2xl shadow-lg border border-indigo-100 mb-6 ring-2 ring-indigo-50">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">{editingItem.id ? 'Edit Item' : 'New Item'}</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <input 
                                    placeholder="Item Name" 
                                    value={editingItem.name || ''}
                                    onChange={e => setEditingItem({...editingItem, name: e.target.value})}
                                    className="px-4 py-2 border rounded-lg"
                                />
                                <select 
                                    value={editingItem.category || 'coffee'}
                                    onChange={e => setEditingItem({...editingItem, category: e.target.value as any})}
                                    className="px-4 py-2 border rounded-lg bg-white"
                                >
                                    <option value="coffee">Coffee</option>
                                    <option value="beverage">Beverage</option>
                                    <option value="dessert">Dessert</option>
                                    <option value="meal">Meal</option>
                                </select>
                                <input 
                                    type="number" 
                                    placeholder="Price" 
                                    value={editingItem.price || ''}
                                    onChange={e => setEditingItem({...editingItem, price: Number(e.target.value)})}
                                    className="px-4 py-2 border rounded-lg"
                                />
                                <input 
                                    type="number" 
                                    placeholder="Cost (for Profit Calc)" 
                                    value={editingItem.cost || ''}
                                    onChange={e => setEditingItem({...editingItem, cost: Number(e.target.value)})}
                                    className="px-4 py-2 border rounded-lg"
                                />
                                <input 
                                    type="number" 
                                    placeholder="Initial Stock" 
                                    value={editingItem.stock || ''}
                                    onChange={e => setEditingItem({...editingItem, stock: Number(e.target.value)})}
                                    className="px-4 py-2 border rounded-lg"
                                />
                                <input 
                                    placeholder="Image URL" 
                                    value={editingItem.image || ''}
                                    onChange={e => setEditingItem({...editingItem, image: e.target.value})}
                                    className="px-4 py-2 border rounded-lg md:col-span-2"
                                />
                            </div>
                            <div className="flex justify-end gap-2 mt-4">
                                <button onClick={() => setEditingItem(null)} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg">Cancel</button>
                                <button onClick={handleSaveItem} className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700">Save</button>
                            </div>
                        </div>
                    )}

                    {/* Menu List */}
                    <div className="grid grid-cols-1 gap-4">
                        {menu.map(item => (
                            <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4 group hover:border-indigo-300 transition">
                                <img src={item.image} alt={item.name} className="w-16 h-16 rounded-lg object-cover bg-gray-200" />
                                <div className="flex-1">
                                    <h4 className="font-bold text-gray-900">{item.name}</h4>
                                    <p className="text-sm text-gray-500 capitalize">
                                        {item.category} • Cost: {formatCurrency(item.cost, storeProfile.currency)} • <span className={item.stock < 10 ? 'text-red-600 font-bold' : 'text-gray-600'}>Stock: {item.stock}</span>
                                    </p>
                                </div>
                                <div className="text-right mr-4">
                                    <p className="font-bold text-indigo-600">{formatCurrency(item.price, storeProfile.currency)}</p>
                                </div>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => setEditingItem(item)} className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg">
                                        <Edit size={18} />
                                    </button>
                                    <button onClick={() => handleDeleteItem(item.id)} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg">
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* FLOOR PLAN TAB */}
            {activeTab === 'floor' && (
                <div className="space-y-6 h-full flex flex-col animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex justify-between items-center shrink-0">
                         <div>
                            <h2 className="text-xl font-bold text-gray-800">Floor Plan</h2>
                            <p className="text-sm text-gray-500">Drag tables to match your physical store layout.</p>
                        </div>
                        <button 
                            onClick={handleAddTable}
                            className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-xl font-bold flex items-center gap-2 shadow-sm"
                        >
                            <LayoutTemplate size={18} /> Add Table
                        </button>
                    </div>

                    {/* Canvas */}
                    <div 
                        ref={floorRef}
                        className="bg-slate-200 rounded-xl shadow-inner border-2 border-slate-300 relative overflow-hidden flex-1 min-h-[500px]"
                        style={{ 
                            backgroundImage: 'radial-gradient(#cbd5e1 2px, transparent 2px)', 
                            backgroundSize: '30px 30px' 
                        }}
                    >
                        {tables.map(table => (
                            <div 
                                key={table.id}
                                onMouseDown={(e) => handleDragStart(e, table.id)}
                                onTouchStart={(e) => handleDragStart(e, table.id)}
                                className={`
                                    absolute w-24 h-24 bg-white rounded-full shadow-lg border-4 
                                    flex flex-col items-center justify-center cursor-move select-none
                                    transition-transform active:scale-110 active:shadow-2xl z-10
                                    ${draggingTable === table.id ? 'border-indigo-500 z-50' : 'border-gray-200'}
                                `}
                                style={{ 
                                    left: `${table.x}%`, 
                                    top: `${table.y}%`,
                                    // Adjust for center anchor point visually if needed, though simple % is easier for logic
                                }}
                            >
                                <Coffee size={20} className="text-gray-400 mb-1" />
                                <span className="font-bold text-gray-800">{table.label}</span>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleRemoveTable(table.id); }}
                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow hover:bg-red-600"
                                    title="Remove Table"
                                >
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        ))}

                        {/* Entrance Hint */}
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 bg-slate-300 px-6 py-1 rounded-t-lg text-xs font-bold text-slate-500 uppercase">Entrance</div>
                    </div>
                    
                    <p className="text-center text-xs text-gray-400">Tips: Drag tables to position. Changes save automatically.</p>
                </div>
            )}

             {/* HARDWARE TAB */}
             {activeTab === 'hardware' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                     <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-xl font-bold text-gray-800">Hardware Connection</h2>
                            <p className="text-sm text-gray-500">Connect receipt printers and card readers.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Printer Section */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-64">
                            <div>
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-3 bg-blue-100 text-blue-600 rounded-xl"><Printer size={24} /></div>
                                    <div>
                                        <h3 className="font-bold text-gray-900">Receipt Printer</h3>
                                        <p className="text-sm text-gray-500">Bluetooth / USB / Network</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className={`w-3 h-3 rounded-full ${connectedPrinter ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                                    <span className="text-sm font-medium text-gray-700">
                                        {connectedPrinter ? `Connected: ${connectedPrinter}` : 'No printer connected'}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-400">
                                    For iOS/Android Tablets: Use system settings to pair your printer first. Then use the standard "Print Invoice" button.
                                </p>
                            </div>
                            <button 
                                onClick={connectPrinter}
                                disabled={isScanning}
                                className="w-full bg-slate-900 hover:bg-black text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition"
                            >
                                {isScanning ? (
                                    <>Scanning...</>
                                ) : (
                                    <><Bluetooth size={18} /> Scan Bluetooth Printer (Web API)</>
                                )}
                            </button>
                        </div>

                         {/* Card Reader Placeholder */}
                         <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-64 opacity-60">
                            <div>
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-3 bg-gray-100 text-gray-500 rounded-xl"><CreditCard size={24} /></div>
                                    <div>
                                        <h3 className="font-bold text-gray-900">Card Reader</h3>
                                        <p className="text-sm text-gray-500">Stripe / Square Terminal</p>
                                    </div>
                                </div>
                                <p className="text-sm text-gray-500">Coming Soon</p>
                            </div>
                            <button disabled={true} className="w-full bg-gray-200 text-gray-500 py-3 rounded-xl font-bold cursor-not-allowed">
                                Connect Reader
                            </button>
                        </div>
                    </div>
                </div>
             )}

            {/* ABOUT TAB */}
            {activeTab === 'about' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                    <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
                        <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-12 text-white text-center relative">
                            <div className="relative z-10">
                                <div className="w-24 h-24 bg-white/20 backdrop-blur-md rounded-3xl mx-auto mb-6 flex items-center justify-center border border-white/20 shadow-inner">
                                    <CloudSun size={48} className="text-white" />
                                </div>
                                <h2 className="text-4xl font-black tracking-tight mb-2">Pico POS</h2>
                                <p className="text-indigo-100 text-lg font-light opacity-80">Version 2.4.0 (Enterprise Edition)</p>
                            </div>
                            
                            {/* Decorative elements */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
                            <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-400/20 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl"></div>
                        </div>
                        
                        <div className="p-12 space-y-10">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                <div className="space-y-4">
                                    <h3 className="text-xs font-black text-indigo-600 uppercase tracking-[0.2em]">Developer Information</h3>
                                    <div className="space-y-2">
                                        <p className="text-2xl font-bold text-gray-900">Himpower Pvt. Ltd.</p>
                                        <p className="text-gray-500 leading-relaxed">
                                            A leading technology solutions provider specializing in retail automation, 
                                            cloud-based POS systems, and business intelligence analytics.
                                        </p>
                                    </div>
                                    <div className="pt-4 flex flex-col gap-3">
                                        <div className="flex items-center gap-3 text-gray-600">
                                            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center"><Building2 size={16}/></div>
                                            <span className="text-sm font-medium">Headquarters: Kathmandu, Nepal</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-gray-600">
                                            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center"><Wifi size={16}/></div>
                                            <span className="text-sm font-medium">
                                                Website:{" "}
                                                <a 
                                                    href="http://himpower.com.np" 
                                                    target="_blank" 
                                                    rel="noopener noreferrer" 
                                                    className="text-indigo-600 hover:text-indigo-800 hover:underline transition-all duration-200"
                                                >
                                                    himpower.com.np
                                                </a>
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="space-y-4">
                                    <h3 className="text-xs font-black text-indigo-600 uppercase tracking-[0.2em]">Legal & Compliance</h3>
                                    <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                                        <p className="text-sm text-gray-600 leading-relaxed italic">
                                            "This software is the intellectual property of Himpower Pvt. Ltd. 
                                            Unauthorized duplication, distribution, or reverse engineering of this 
                                            product is strictly prohibited under international copyright laws."
                                        </p>
                                        <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase">License: Enterprise</span>
                                            <span className="text-[10px] font-bold text-gray-400 uppercase">ID: HP-POS-2026-X99</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="pt-8 border-t border-gray-100 text-center">
                                <p className="text-xs text-gray-400 font-medium">© 2026 Himpower Pvt. Ltd. All Rights Reserved.</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* LEGAL TAB */}
            {activeTab === 'legal' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-xl font-bold text-gray-800">Legal & Compliance</h2>
                            <p className="text-sm text-gray-500">Essential legal documents required for official application registration and licensing compliance.</p>
                        </div>
                    </div>
                    <LegalDocsView />
                </div>
            )}

            {/* SUBSCRIPTION TAB */}
            {activeTab === 'subscription' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                    <SubscriptionView 
                        storeProfile={storeProfile} 
                        onUpdateProfile={onUpdateProfile} 
                    />
                </div>
            )}

        </div>
      </div>
    </div>
  );
};

export default SettingsView;