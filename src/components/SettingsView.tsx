import React, { useState, useRef } from 'react';
import { CreditCard, Zap, Wifi, Edit, Plus, Trash2, LayoutTemplate, Coffee, Printer, Bluetooth, Building2, PaintBucket, CheckCircle2 } from 'lucide-react';
import { StoreProfile, MenuItem, Table } from '../types';

interface SettingsViewProps {
    storeProfile: StoreProfile;
    onUpdateProfile: (p: StoreProfile) => void;
    menu: MenuItem[];
    onUpdateMenu: (m: MenuItem[]) => void;
    tables: Table[];
    onUpdateTables: (t: Table[]) => void;
}

type Tab = 'profile' | 'menu' | 'floor' | 'hardware';

const SettingsView: React.FC<SettingsViewProps> = ({ 
    storeProfile, onUpdateProfile, 
    menu, onUpdateMenu,
    tables, onUpdateTables
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  
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
                                value={storeProfile.currency}
                                onChange={(e) => onUpdateProfile({...storeProfile, currency: e.target.value})}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white"
                              >
                                <option>USD</option>
                                <option>KRW</option>
                                <option>NPR</option>
                                <option>EUR</option>
                              </select>
                           </div>
                           <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Tax Rate (%)</label>
                                <input 
                                    type="number" 
                                    value={storeProfile.taxRate}
                                    onChange={(e) => onUpdateProfile({...storeProfile, taxRate: Number(e.target.value)})}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200"
                                />
                           </div>
                        </div>

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
                                        {item.category} • Cost: {item.cost} • <span className={item.stock < 10 ? 'text-red-600 font-bold' : 'text-gray-600'}>Stock: {item.stock}</span>
                                    </p>
                                </div>
                                <div className="text-right mr-4">
                                    <p className="font-bold text-indigo-600">{storeProfile.currency} {item.price}</p>
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

        </div>
      </div>
    </div>
  );
};

export default SettingsView;