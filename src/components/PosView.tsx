import React, { useState } from 'react';
import { Table, MenuItem, OrderItem, StoreProfile } from '../types';
import { Coffee, Utensils, CupSoda, Cake, ShoppingCart, User, ChevronRight, Minus, Plus, Map, StickyNote } from 'lucide-react';

interface PosViewProps {
  tables: Table[];
  menu: MenuItem[];
  onPlaceOrder: (tableId: number, items: OrderItem[], total: number) => void;
  storeProfile: StoreProfile;
}

const PosView: React.FC<PosViewProps> = ({ tables, menu, onPlaceOrder, storeProfile }) => {
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null);
  const [currentOrder, setCurrentOrder] = useState<OrderItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [noteInputId, setNoteInputId] = useState<string | null>(null); // Track which item is adding a note

  const categories = [
    { id: 'all', label: 'All', icon: <Utensils size={18} /> },
    { id: 'coffee', label: 'Coffee', icon: <Coffee size={18} /> },
    { id: 'beverage', label: 'Beverage', icon: <CupSoda size={18} /> },
    { id: 'dessert', label: 'Dessert', icon: <Cake size={18} /> },
    { id: 'meal', label: 'Meal', icon: <Utensils size={18} /> },
  ];

  const filteredMenu = activeCategory === 'all' 
    ? menu 
    : menu.filter(item => item.category === activeCategory);

  const handleTableClick = (id: number) => {
    setSelectedTableId(id);
    setCurrentOrder([]); 
  };

  const addToOrder = (item: MenuItem) => {
    if (!selectedTableId) return;
    if (item.stock <= 0) return; // Prevent out of stock
    
    setCurrentOrder(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        // Check if we have enough stock to add more
        if (existing.quantity >= item.stock) {
            alert("Not enough stock!");
            return prev;
        }
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, quantity: 1, notes: '' }];
    });
  };

  const updateQuantity = (itemId: string, delta: number) => {
    const itemInMenu = menu.find(m => m.id === itemId);
    
    setCurrentOrder(prev => prev.map(item => {
      if (item.id === itemId) {
        const newQty = item.quantity + delta;
        
        // Stock check on increase
        if (delta > 0 && itemInMenu && newQty > itemInMenu.stock) {
            return item;
        }
        
        return { ...item, quantity: Math.max(0, newQty) };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const updateNote = (itemId: string, note: string) => {
      setCurrentOrder(prev => prev.map(item => 
          item.id === itemId ? { ...item, notes: note } : item
      ));
  };

  const orderTotal = currentOrder.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handlePayment = () => {
    if (selectedTableId && currentOrder.length > 0) {
      onPlaceOrder(selectedTableId, currentOrder, orderTotal);
      setCurrentOrder([]);
      setSelectedTableId(null);
    }
  };

  // If no table selected, show table MAP
  if (!selectedTableId) {
    return (
      <div className="h-full bg-slate-100 flex flex-col">
        <div className="p-6 pb-2 shrink-0 flex justify-between items-end">
           <div>
              <h2 className="text-2xl font-bold text-gray-800">Floor View</h2>
              <p className="text-gray-500">Select a table to start an order.</p>
           </div>
           <div className="bg-white px-3 py-1 rounded-full shadow-sm text-xs font-bold text-gray-500 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-white border-2 border-green-500"></span> Empty
              <span className="w-2 h-2 rounded-full bg-orange-100 border-2 border-orange-500 ml-2"></span> Occupied
           </div>
        </div>
        
        <div className="flex-1 relative overflow-hidden m-6 bg-white rounded-3xl shadow-sm border border-slate-200">
             {/* Background Grid Pattern */}
             <div className="absolute inset-0 opacity-20" 
                  style={{ backgroundImage: 'radial-gradient(#94a3b8 2px, transparent 2px)', backgroundSize: '40px 40px' }}>
             </div>

             {tables.map(table => (
                <button
                  key={table.id}
                  onClick={() => handleTableClick(table.id)}
                  style={{ left: `${table.x}%`, top: `${table.y}%` }}
                  className={`
                    absolute w-24 h-24 md:w-28 md:h-28 rounded-full border-4 shadow-lg transition-all transform hover:scale-105
                    flex flex-col items-center justify-center gap-1 z-10
                    ${table.status === 'occupied' 
                      ? 'bg-orange-50 border-orange-400 text-orange-800' 
                      : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-500 hover:text-indigo-600'}
                  `}
                >
                  <User size={24} className={table.status === 'occupied' ? 'fill-orange-200' : 'text-gray-300'} />
                  <span className="font-bold text-lg">{table.label}</span>
                  {table.status === 'occupied' && <span className="text-[10px] font-bold uppercase tracking-wider">Active</span>}
                </button>
             ))}

             {/* Entrance Indicator */}
             <div className="absolute bottom-0 left-1/2 -translate-x-1/2 bg-slate-200 px-8 py-2 rounded-t-xl text-xs font-bold text-slate-500 tracking-widest uppercase shadow-inner">
                Entrance
             </div>
        </div>
      </div>
    );
  }

  // Ordering Interface
  return (
    <div className="flex h-full bg-white overflow-hidden flex-col lg:flex-row animate-in slide-in-from-right duration-300">
      {/* Menu Section */}
      <div className="flex-1 flex flex-col h-[60%] lg:h-full overflow-hidden border-b lg:border-b-0 lg:border-r border-gray-200">
        {/* Categories */}
        <div className="p-3 md:p-4 bg-white border-b border-gray-100 overflow-x-auto whitespace-nowrap scrollbar-hide">
            <div className="flex gap-2 md:gap-3">
              <button 
                onClick={() => setSelectedTableId(null)}
                className="px-4 py-2 md:py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-medium flex items-center gap-2 text-sm md:text-base shadow-lg shadow-slate-200 transition-all"
              >
                <Map size={18} /> <span className="hidden md:inline">Floor Plan</span>
              </button>
              <div className="w-px h-8 bg-gray-200 mx-2"></div>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`
                    px-4 md:px-6 py-2 md:py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2
                    ${activeCategory === cat.id 
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' 
                      : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}
                  `}
                >
                  <span className="hidden md:inline">{cat.icon}</span>
                  {cat.label}
                </button>
              ))}
            </div>
        </div>

        {/* Menu Grid */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50">
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4 pb-20 lg:pb-0">
            {filteredMenu.map(item => {
              const isOutOfStock = item.stock <= 0;
              return (
                <button
                    key={item.id}
                    onClick={() => addToOrder(item)}
                    disabled={isOutOfStock}
                    className={`
                        bg-white rounded-xl shadow-sm border transition-all text-left flex flex-col h-48 md:h-56 group overflow-hidden relative
                        ${isOutOfStock ? 'opacity-60 grayscale cursor-not-allowed border-gray-200' : 'border-gray-100 hover:border-indigo-400 hover:shadow-lg'}
                    `}
                >
                    {isOutOfStock && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/10">
                            <span className="bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider transform -rotate-12 shadow-lg">Sold Out</span>
                        </div>
                    )}
                    
                    {/* Image Area */}
                    <div className="h-24 md:h-32 w-full overflow-hidden bg-gray-100 relative">
                    <img 
                        src={item.image} 
                        alt={item.name} 
                        className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500" 
                        />
                        <div className="absolute top-2 right-2 bg-black/60 text-white px-2 py-0.5 rounded-md text-[10px] backdrop-blur-sm">
                            Stock: {item.stock}
                        </div>
                    </div>
                    
                    {/* Text Area */}
                    <div className="p-3 md:p-4 flex-1 flex flex-col justify-between">
                        <div>
                            <div className="font-bold text-gray-800 text-sm md:text-lg leading-tight mb-1 line-clamp-1">{item.name}</div>
                            <span className="text-gray-400 text-xs capitalize">{item.category}</span>
                        </div>
                        <div className="flex justify-between items-end">
                            <span className="font-bold text-sm md:text-lg text-indigo-600">{storeProfile.currency} {item.price.toLocaleString()}</span>
                            {!isOutOfStock && (
                                <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 hidden lg:flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Plus size={16} />
                                </div>
                            )}
                        </div>
                    </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Cart Sidebar */}
      <div className="h-[40%] lg:h-full w-full lg:w-96 bg-white flex flex-col shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] lg:shadow-xl z-20 shrink-0">
        <div className="p-4 md:p-6 border-b border-gray-100 bg-gray-50">
          <div className="flex justify-between items-center mb-1">
            <h2 className="text-lg md:text-xl font-bold text-gray-800">Current Order</h2>
            <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs md:text-sm font-bold border border-indigo-200">
              {tables.find(t => t.id === selectedTableId)?.label}
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3">
          {currentOrder.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-2 md:gap-4 opacity-50">
              <ShoppingCart size={32} className="md:w-12 md:h-12" />
              <p className="text-sm">No items added</p>
            </div>
          ) : (
            currentOrder.map(item => (
              <div key={item.id} className="bg-gray-50 p-2 md:p-3 rounded-lg border border-gray-100 group transition-all">
                <div className="flex gap-3">
                    <div className="w-12 h-12 md:w-16 md:h-16 rounded-md overflow-hidden bg-gray-200 flex-shrink-0">
                        <img src={item.image} className="w-full h-full object-cover" alt={item.name} />
                    </div>
                    <div className="flex-1 flex flex-col justify-between">
                        <div className="flex justify-between items-start">
                            <div className="font-bold text-gray-800 leading-tight text-sm md:text-base">{item.name}</div>
                            <div className="text-xs text-gray-500 mt-1">{storeProfile.currency} {item.price.toLocaleString()}</div>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                             <div className="flex items-center gap-3">
                                <button 
                                    onClick={() => updateQuantity(item.id, -1)}
                                    className="w-6 h-6 rounded-full bg-white border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100"
                                >
                                    <Minus size={12} />
                                </button>
                                <span className="font-bold w-4 text-center text-sm">{item.quantity}</span>
                                <button 
                                    onClick={() => updateQuantity(item.id, 1)}
                                    className="w-6 h-6 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 hover:bg-indigo-100"
                                >
                                    <Plus size={12} />
                                </button>
                            </div>
                            <button 
                                onClick={() => setNoteInputId(noteInputId === item.id ? null : item.id)}
                                className={`text-xs flex items-center gap-1 ${item.notes ? 'text-indigo-600 font-bold' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                <StickyNote size={14} /> {item.notes ? 'Edit Note' : 'Note'}
                            </button>
                        </div>
                    </div>
                </div>
                
                {/* Note Input Area */}
                {(noteInputId === item.id || item.notes) && (
                    <div className={`mt-2 ${noteInputId === item.id ? 'block' : item.notes ? 'block' : 'hidden'}`}>
                         <input 
                            type="text"
                            value={item.notes || ''}
                            onChange={(e) => updateNote(item.id, e.target.value)}
                            placeholder="e.g. No Ice, Less Sugar..."
                            className="w-full text-xs p-2 bg-white border border-gray-200 rounded-md focus:outline-none focus:border-indigo-500"
                         />
                    </div>
                )}
              </div>
            ))
          )}
        </div>

        <div className="p-4 md:p-6 bg-white border-t border-gray-100 space-y-3 md:space-y-4">
          <div className="space-y-1 md:space-y-2 text-sm md:text-base">
            <div className="flex justify-between text-gray-500">
              <span>Subtotal</span>
              <span>{storeProfile.currency} {Math.floor(orderTotal * 0.87).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>VAT (13%)</span>
              <span>{storeProfile.currency} {Math.floor(orderTotal * 0.13).toLocaleString()}</span>
            </div>
            <div className="border-t border-dashed border-gray-200 my-2"></div>
            <div className="flex justify-between text-xl md:text-2xl font-bold text-gray-900">
              <span>Total</span>
              <span>{storeProfile.currency} {orderTotal.toLocaleString()}</span>
            </div>
          </div>
          
          <button
            onClick={handlePayment}
            disabled={currentOrder.length === 0}
            className="w-full bg-slate-900 hover:bg-black text-white py-3 md:py-4 rounded-xl font-bold text-base md:text-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <span>Charge {storeProfile.currency} {orderTotal.toLocaleString()}</span>
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PosView;