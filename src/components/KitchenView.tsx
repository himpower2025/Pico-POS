import React, { useState, useEffect } from 'react';
import { Order, Table, StoreProfile } from '../types';
import { ChefHat, Clock, CheckCircle2, Play, Flame, Check, AlertCircle } from 'lucide-react';
import { formatCurrency } from '../lib/utils';

interface KitchenViewProps {
  orders: Order[];
  tables: Table[];
  storeProfile: StoreProfile;
  onUpdateOrders: (orders: Order[]) => void;
}

export const KitchenView: React.FC<KitchenViewProps> = ({
  orders,
  tables,
  storeProfile,
  onUpdateOrders,
}) => {
  const [filter, setFilter] = useState<'all' | 'pending' | 'cooking' | 'ready'>('all');
  const [now, setNow] = useState<Date>(new Date());

  // Update current time every 15 seconds to update "elapsed minutes" counter
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  // Filter orders for active kitchen preparation (not completed or refunded)
  const activeOrders = orders.filter(order => 
    order.status === 'pending' || order.status === 'cooking' || order.status === 'ready'
  );

  const filteredOrders = activeOrders.filter(order => {
    if (filter === 'all') return true;
    return order.status === filter;
  });

  // Sort: Oldest first for preparation queue
  const sortedOrders = [...filteredOrders].sort((a, b) => {
    return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
  });

  const getTableLabel = (tableId: number) => {
    return tables.find(t => t.id === tableId)?.label || `Table #${tableId}`;
  };

  const handleStatusChange = (orderId: string, nextStatus: 'cooking' | 'ready' | 'completed') => {
    const updated = orders.map(o => {
      if (o.id === orderId) {
        return { ...o, status: nextStatus };
      }
      return o;
    });
    onUpdateOrders(updated);
  };

  const getElapsedTime = (timestamp: Date | string) => {
    const orderTime = new Date(timestamp).getTime();
    const elapsedMs = now.getTime() - orderTime;
    const mins = Math.floor(elapsedMs / 60000);
    if (mins < 1) return 'Just now';
    return `${mins}m ago`;
  };

  return (
    <div className="h-full bg-slate-900 text-slate-100 flex flex-col overflow-hidden animate-in fade-in duration-300">
      {/* Header */}
      <div className="bg-slate-950 border-b border-slate-800 px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
            <ChefHat size={22} className="animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              Kitchen Display Board
              <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30 font-bold">
                KDS
              </span>
            </h1>
            <p className="text-xs text-slate-400">Real-time order tracking and kitchen preparation queue</p>
          </div>
        </div>

        {/* Tab Filters */}
        <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 self-start md:self-auto text-xs font-bold">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg transition ${
              filter === 'all' ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Active ({activeOrders.length})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1 ${
              filter === 'pending' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
            Pending ({activeOrders.filter(o => o.status === 'pending').length})
          </button>
          <button
            onClick={() => setFilter('cooking')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1 ${
              filter === 'cooking' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Flame size={12} className="text-indigo-400 fill-indigo-400" />
            Cooking ({activeOrders.filter(o => o.status === 'cooking').length})
          </button>
          <button
            onClick={() => setFilter('ready')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1 ${
              filter === 'ready' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <CheckCircle2 size={12} className="text-emerald-400" />
            Ready ({activeOrders.filter(o => o.status === 'ready').length})
          </button>
        </div>
      </div>

      {/* Main Grid Scroll Area */}
      <div className="flex-1 overflow-y-auto p-6">
        {sortedOrders.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-4 py-20">
            <ChefHat size={48} className="text-slate-700 opacity-40" />
            <div className="text-center">
              <p className="text-base font-bold text-slate-400">No active kitchen orders</p>
              <p className="text-xs text-slate-600 mt-1">Pending order cards will pop up here automatically.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {sortedOrders.map((order, idx) => {
              const minutesElapsed = Math.floor((now.getTime() - new Date(order.timestamp).getTime()) / 60000);
              const isUrgent = minutesElapsed >= 15 && order.status !== 'ready';

              return (
                <div 
                  key={order.id} 
                  className={`bg-slate-950 rounded-2xl border flex flex-col overflow-hidden shadow-xl transition-all duration-300 transform hover:scale-[1.01] ${
                    isUrgent 
                      ? 'border-red-500/60 shadow-red-500/5' 
                      : order.status === 'ready'
                        ? 'border-emerald-500/40 shadow-emerald-500/5'
                        : order.status === 'cooking'
                          ? 'border-indigo-500/40'
                          : 'border-slate-800'
                  }`}
                >
                  {/* Card Header */}
                  <div className={`px-4 py-3 border-b flex justify-between items-center ${
                    isUrgent 
                      ? 'bg-red-950/40 border-red-500/20' 
                      : order.status === 'ready'
                        ? 'bg-emerald-950/20 border-emerald-500/20'
                        : order.status === 'cooking'
                          ? 'bg-indigo-950/20 border-indigo-500/20'
                          : 'bg-slate-900/50 border-slate-800'
                  }`}>
                    <div>
                      <div className="font-extrabold text-sm text-white flex items-center gap-2">
                        {getTableLabel(order.tableId)}
                        <span className="text-[10px] text-slate-400 font-mono">
                          #{idx + 1}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        ID: {order.id.slice(0, 8)}
                      </div>
                    </div>
                    
                    {/* Timer / Badge */}
                    <div className="flex flex-col items-end gap-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                        isUrgent 
                          ? 'bg-red-500/20 text-red-400 animate-pulse border border-red-500/30' 
                          : 'bg-slate-800 text-slate-300 border border-slate-700'
                      }`}>
                        <Clock size={10} />
                        {getElapsedTime(order.timestamp)}
                      </span>
                      {isUrgent && (
                        <span className="text-[8px] bg-red-600 text-white font-black px-1 rounded animate-pulse">
                          DELAYED
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Order Items */}
                  <div className="flex-1 p-4 space-y-3 overflow-y-auto max-h-60 scrollbar-thin scrollbar-thumb-slate-800">
                    {order.items.map((item, itemIdx) => (
                      <div key={itemIdx} className="flex justify-between items-start gap-2 border-b border-slate-900 pb-2 last:border-b-0">
                        <div className="flex-1">
                          <div className="font-bold text-sm text-slate-100 flex items-center gap-1.5">
                            <span className="text-indigo-400 font-black text-base">
                              {item.quantity}x
                            </span>
                            {item.name}
                          </div>
                          {item.notes && (
                            <div className="text-[11px] text-amber-400 font-medium bg-amber-500/10 border border-amber-500/15 rounded px-2 py-0.5 mt-1 inline-block">
                              ✍️ {item.notes}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Card Actions Footer */}
                  <div className="p-3 bg-slate-950 border-t border-slate-900 mt-auto flex gap-2">
                    {order.status === 'pending' && (
                      <button
                        onClick={() => handleStatusChange(order.id, 'cooking')}
                        className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 active:scale-95"
                      >
                        <Play size={14} fill="currentColor" />
                        Start Cooking
                      </button>
                    )}

                    {order.status === 'cooking' && (
                      <button
                        onClick={() => handleStatusChange(order.id, 'ready')}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 active:scale-95 shadow-lg shadow-indigo-600/15 border border-indigo-500"
                      >
                        <Check size={14} />
                        Mark as Ready
                      </button>
                    )}

                    {order.status === 'ready' && (
                      <button
                        onClick={() => handleStatusChange(order.id, 'completed')}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 active:scale-95 shadow-lg shadow-emerald-600/15 border border-emerald-500"
                      >
                        <CheckCircle2 size={14} />
                        Served & Dismiss
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
