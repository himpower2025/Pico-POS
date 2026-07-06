import React, { useState, useMemo } from 'react';
import { Order, MenuItem, StoreProfile } from '../types';
import { analyzeBusiness, forecastSales } from '../services/geminiService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Sparkles, TrendingUp, DollarSign, Activity, BrainCircuit, Coins, Calendar, Zap, ListChecks, RotateCcw, Printer } from 'lucide-react';
import ReceiptModal from './ReceiptModal';
import { formatCurrency, getCurrencyConfig } from '../lib/utils';

interface OperationalExpense {
  id: string;
  description: string;
  amount: number; // in USD (base)
  date: string;
  category: 'Rent' | 'Salary' | 'Utilities' | 'Ingredients' | 'Marketing' | 'Other';
}

interface DashboardViewProps {
  orders: Order[];
  onUpdateOrders: (orders: Order[]) => void;
  menu: MenuItem[];
  storeProfile: StoreProfile;
}

const DashboardView: React.FC<DashboardViewProps> = ({ orders, onUpdateOrders, menu, storeProfile }) => {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [forecast, setForecast] = useState<any[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'ai' | 'transactions'>('overview');
  const [timeRange, setTimeRange] = useState<'day' | 'month' | 'year'>('day');
  const [aiCredits, setAiCredits] = useState(50);
  
  // State for reprinting/viewing specific past orders
  const [previewOrder, setPreviewOrder] = useState<Order | null>(null);

  // Custom operational expenses
  const [expenses, setExpenses] = useState<OperationalExpense[]>(() => {
    try {
      const saved = localStorage.getItem('pico_operating_expenses');
      return saved ? JSON.parse(saved) : [
        { id: 'exp-1', description: 'Monthly Shop Rent', amount: 350, date: new Date().toISOString().split('T')[0], category: 'Rent' },
        { id: 'exp-2', description: 'Electricity & Water Utilities', amount: 80, date: new Date().toISOString().split('T')[0], category: 'Utilities' },
        { id: 'exp-3', description: 'Store Marketing Flyers', amount: 45, date: new Date().toISOString().split('T')[0], category: 'Marketing' }
      ];
    } catch (e) {
      return [];
    }
  });

  const saveExpenses = (updatedExpenses: OperationalExpense[]) => {
    setExpenses(updatedExpenses);
    localStorage.setItem('pico_operating_expenses', JSON.stringify(updatedExpenses));
  };

  const currencyConfig = getCurrencyConfig(storeProfile.currency);

  const [newExpDesc, setNewExpDesc] = useState('');
  const [newExpAmount, setNewExpAmount] = useState('');
  const [newExpCategory, setNewExpCategory] = useState<'Rent' | 'Salary' | 'Utilities' | 'Ingredients' | 'Marketing' | 'Other'>('Utilities');
  const [newExpDate, setNewExpDate] = useState(() => new Date().toISOString().split('T')[0]);

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const localAmount = parseFloat(newExpAmount);
    if (!newExpDesc.trim() || isNaN(localAmount) || localAmount <= 0) {
      alert('Please enter a valid description and positive amount.');
      return;
    }

    // Convert local input currency amount to USD base
    const baseAmount = localAmount / currencyConfig.rate;

    const newExpense: OperationalExpense = {
      id: `exp-${Date.now()}`,
      description: newExpDesc.trim(),
      amount: baseAmount,
      date: newExpDate,
      category: newExpCategory
    };

    saveExpenses([...expenses, newExpense]);
    setNewExpDesc('');
    setNewExpAmount('');
  };

  const handleDeleteExpense = (id: string) => {
    if (confirm('Are you sure you want to delete this expense record?')) {
      saveExpenses(expenses.filter(e => e.id !== id));
    }
  };

  // Calculate real-time stats including custom operational expenses
  const stats = useMemo(() => {
    let revenue = 0;
    let ingredientCost = 0;
    // Filter out refunded orders from stats
    const validOrders = orders.filter(o => o.status === 'completed');
    
    validOrders.forEach(order => {
      revenue += order.total;
      order.items.forEach(item => {
        const menuItem = menu.find(m => m.id === item.id);
        const itemCost = menuItem ? menuItem.cost : 0;
        ingredientCost += itemCost * item.quantity;
      });
    });

    const customExpensesSum = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const totalCost = ingredientCost + customExpensesSum;

    return {
      revenue,
      ingredientCost,
      customExpensesSum,
      cost: totalCost,
      profit: revenue - totalCost,
      count: validOrders.length,
      avgValue: validOrders.length > 0 ? Math.floor(revenue / validOrders.length) : 0
    };
  }, [orders, menu, expenses]);

  // Mock data generation
  const chartData = useMemo(() => {
    if (timeRange === 'day') {
      return Array.from({ length: 12 }, (_, i) => ({
        name: `${i + 10}:00`,
        sales: Math.floor(Math.random() * 20000) + 5000,
        profit: Math.floor(Math.random() * 10000) + 2000
      }));
    } else if (timeRange === 'month') {
        return Array.from({ length: 30 }, (_, i) => ({
            name: `${i + 1}`,
            sales: Math.floor(Math.random() * 100000) + 30000,
            profit: Math.floor(Math.random() * 50000) + 10000
        }));
    } else {
        return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(m => ({
            name: m,
            sales: Math.floor(Math.random() * 500000) + 100000,
            profit: Math.floor(Math.random() * 200000) + 50000
        }));
    }
  }, [timeRange]);

  const handleRunAnalysis = async () => {
    if (aiCredits <= 0) {
        alert("Insufficient AI Credits. Please upgrade your plan in Settings.");
        return;
    }
    setIsAnalyzing(true);
    setAiCredits(prev => prev - 1); 
    try {
      const [aiText, aiForecastJson] = await Promise.all([
        analyzeBusiness(orders.filter(o => o.status === 'completed'), menu),
        forecastSales(orders.filter(o => o.status === 'completed'))
      ]);
      setAnalysis(aiText);
      setForecast(JSON.parse(aiForecastJson));
    } catch (e) {
      console.error(e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRefund = (orderId: string) => {
      if (confirm("Are you sure you want to refund this order? This cannot be undone.")) {
          onUpdateOrders(orders.map(o => 
             o.id === orderId ? { ...o, status: 'refunded' } : o
          ));
      }
  };

  return (
    <div className="h-full overflow-y-auto bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-500">Real-time Analytics & AI Business Intelligence</p>
          </div>
          <div className="flex items-center gap-4">
             {/* Time Range Toggle */}
             <div className="bg-white rounded-lg p-1 shadow-sm border border-gray-200 flex">
                {(['day', 'month', 'year'] as const).map((r) => (
                    <button
                        key={r}
                        onClick={() => setTimeRange(r)}
                        className={`px-3 py-1 text-sm font-medium rounded-md capitalize transition-all ${timeRange === r ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100'}`}
                    >
                        {r}
                    </button>
                ))}
             </div>

             <div className="h-6 w-px bg-gray-300"></div>

             <div className="flex gap-2">
                <button 
                    onClick={() => setActiveTab('overview')}
                    className={`px-4 py-2 rounded-lg font-medium transition ${activeTab === 'overview' ? 'bg-white text-blue-600 shadow' : 'text-gray-600 hover:bg-gray-200'}`}
                >
                    Overview
                </button>
                <button 
                    onClick={() => setActiveTab('transactions')}
                    className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 ${activeTab === 'transactions' ? 'bg-white text-orange-600 shadow' : 'text-gray-600 hover:bg-gray-200'}`}
                >
                    <ListChecks size={16} /> Transactions
                </button>
                <button 
                    onClick={() => setActiveTab('ai')}
                    className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 ${activeTab === 'ai' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-gray-600 hover:bg-gray-200'}`}
                >
                    <Sparkles size={16} /> AI Analyst
                </button>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><DollarSign size={20} /></div>
                  <span className="text-sm text-gray-500 font-medium">Total Revenue</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900">{formatCurrency(stats.revenue, storeProfile.currency)}</h3>
            </div>
            <div className="text-[10px] text-gray-400 mt-2 pt-2 border-t border-gray-100">
              Automatic sales calculation
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-red-100 text-red-600 rounded-lg"><Coins size={20} /></div>
                  <span className="text-sm text-gray-500 font-medium">Total Cost</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900">{formatCurrency(stats.cost, storeProfile.currency)}</h3>
            </div>
            <div className="text-[10px] text-gray-400 flex justify-between mt-2 pt-2 border-t border-gray-100">
              <span>COGS: {formatCurrency(stats.ingredientCost, storeProfile.currency)}</span>
              <span>Ops: {formatCurrency(stats.customExpensesSum, storeProfile.currency)}</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-green-100 text-green-600 rounded-lg"><TrendingUp size={20} /></div>
                  <span className="text-sm text-gray-500 font-medium">Net Profit</span>
              </div>
              <h3 className="text-2xl font-bold text-green-600">{formatCurrency(stats.profit, storeProfile.currency)}</h3>
            </div>
            <div className="text-xs text-green-500 font-medium flex justify-between mt-2 pt-2 border-t border-gray-100">
              <span>{stats.revenue > 0 ? ((stats.profit / stats.revenue) * 100).toFixed(1) : 0}% Margin</span>
              <span className="text-[10px] text-gray-400 font-normal">Revenue - Total Cost</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-purple-100 text-purple-600 rounded-lg"><Activity size={20} /></div>
                  <span className="text-sm text-gray-500 font-medium">Total Orders</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900">{stats.count}</h3>
            </div>
            <div className="text-[10px] text-gray-400 mt-2 pt-2 border-t border-gray-100">
              Completed transactions
            </div>
          </div>
        </div>

        {activeTab === 'overview' && (
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4 duration-500">
             {/* Main Chart */}
             <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
               <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <Calendar size={18} className="text-gray-400"/>
                        Revenue & Profit Trends ({timeRange})
                    </h3>
               </div>
               <div className="h-80">
                 <ResponsiveContainer width="100%" height="100%">
                   <AreaChart data={chartData}>
                     <defs>
                       <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                         <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                         <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                       </linearGradient>
                       <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                         <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                         <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                       </linearGradient>
                     </defs>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                     <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                     <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} tickFormatter={(value) => `${value/1000}k`} />
                     <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        formatter={(value: number) => [formatCurrency(value, storeProfile.currency)]}
                     />
                     <Area type="monotone" dataKey="sales" name="Revenue" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                     <Area type="monotone" dataKey="profit" name="Net Profit" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorProfit)" />
                   </AreaChart>
                 </ResponsiveContainer>
               </div>
             </div>

             {/* Custom Operating Expenses Panel */}
             <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center justify-between">
                    <span>Operating Expenses</span>
                    <span className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded-lg font-mono font-bold">
                      {formatCurrency(stats.customExpensesSum, storeProfile.currency)}
                    </span>
                  </h3>

                  {/* Add Expense Form */}
                  <form onSubmit={handleAddExpense} className="space-y-3 mb-5 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Category</label>
                        <select
                          value={newExpCategory}
                          onChange={(e) => setNewExpCategory(e.target.value as any)}
                          className="w-full text-xs px-2 py-1.5 rounded-lg border border-gray-200 bg-white font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                        >
                          <option value="Rent">Rent</option>
                          <option value="Salary">Salary</option>
                          <option value="Utilities">Utilities</option>
                          <option value="Ingredients">Ingredients</option>
                          <option value="Marketing">Marketing</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Date</label>
                        <input
                          type="date"
                          value={newExpDate}
                          onChange={(e) => setNewExpDate(e.target.value)}
                          className="w-full text-xs px-2 py-1.5 rounded-lg border border-gray-200 bg-white font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Description</label>
                      <input
                        type="text"
                        placeholder="e.g. Electricity, Water, Rent..."
                        value={newExpDesc}
                        onChange={(e) => setNewExpDesc(e.target.value)}
                        className="w-full text-xs px-3 py-1.5 rounded-lg border border-gray-200 bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                        Amount ({currencyConfig.symbol})
                      </label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-2 text-xs text-gray-400 font-mono font-bold">{currencyConfig.symbol}</span>
                        <input
                          type="number"
                          step="any"
                          placeholder="0.00"
                          value={newExpAmount}
                          onChange={(e) => setNewExpAmount(e.target.value)}
                          className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg border border-gray-200 bg-white font-mono font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                          required
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="w-full bg-gray-900 text-white text-xs font-bold py-2 rounded-lg hover:bg-gray-800 transition active:scale-[0.98]"
                    >
                      + Record Expense
                    </button>
                  </form>

                  {/* Expenses List */}
                  <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                    {expenses.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-6">No custom expenses recorded.</p>
                    ) : (
                      expenses.slice().reverse().map((exp) => (
                        <div key={exp.id} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl hover:bg-gray-100/70 transition border border-gray-100">
                          <div className="min-w-0 flex-1 pr-2">
                            <p className="text-xs font-semibold text-gray-800 truncate">{exp.description}</p>
                            <div className="flex gap-1.5 mt-0.5 items-center">
                              <span className="text-[9px] bg-red-50 text-red-600 px-1.5 py-0.2 rounded font-bold uppercase tracking-wider">
                                {exp.category}
                              </span>
                              <span className="text-[9px] text-gray-400 font-mono">{exp.date}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-black text-red-600 whitespace-nowrap">
                              -{formatCurrency(exp.amount, storeProfile.currency)}
                            </span>
                            <button
                              onClick={() => handleDeleteExpense(exp.id)}
                              className="text-gray-300 hover:text-red-500 transition text-[10px] font-bold p-1"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
             </div>
           </div>
        )}

        {/* TRANSACTIONS TAB */}
        {activeTab === 'transactions' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
                 <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-gray-800">Transaction History</h3>
                    <div className="text-sm text-gray-500">Total: {orders.length} records</div>
                 </div>
                 <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-xs text-gray-500 uppercase font-semibold tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Order ID</th>
                                <th className="px-6 py-4">Time</th>
                                <th className="px-6 py-4">Items</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Total</th>
                                <th className="px-6 py-4 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-sm">
                            {orders.slice().reverse().map((order) => (
                                <tr key={order.id} className="hover:bg-gray-50 transition">
                                    <td className="px-6 py-4 font-mono text-gray-500">{order.id.slice(0, 8)}</td>
                                    <td className="px-6 py-4 text-gray-700">{order.timestamp.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-gray-700 max-w-xs truncate">
                                        {order.items.map(i => `${i.name} (${i.quantity})`).join(', ')}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${order.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {order.status.toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right font-bold text-gray-900">
                                        {formatCurrency(order.total, storeProfile.currency)}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex justify-center gap-2">
                                            <button 
                                                onClick={() => setPreviewOrder(order)}
                                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg tooltip-trigger"
                                                title="View/Reprint"
                                            >
                                                <Printer size={16} />
                                            </button>
                                            {order.status === 'completed' && (
                                                <button 
                                                    onClick={() => handleRefund(order.id)}
                                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg tooltip-trigger"
                                                    title="Refund Order"
                                                >
                                                    <RotateCcw size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {orders.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                                        No transactions found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                 </div>
            </div>
        )}

        {activeTab === 'ai' && (
          <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
             {/* AI Control Panel */}
             <div className="bg-gradient-to-r from-indigo-600 to-purple-700 rounded-2xl p-8 text-white shadow-xl">
               <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                 <div>
                   <h2 className="text-2xl font-bold flex items-center gap-2">
                     <BrainCircuit className="text-indigo-200" />
                     Gemini Business Intelligence
                   </h2>
                   <p className="text-indigo-100 mt-2 max-w-xl">
                     Analysis consumes <strong>1 Credit</strong>. Current Balance: <strong>{aiCredits} Credits</strong>.
                     <br/>
                     Get deep insights into local trends, ingredient cost optimization, and sales forecasting.
                   </p>
                 </div>
                 <button 
                   onClick={handleRunAnalysis}
                   disabled={isAnalyzing}
                   className="bg-white text-indigo-700 hover:bg-indigo-50 font-bold py-3 px-8 rounded-xl shadow-lg transition transform hover:scale-105 disabled:opacity-70 disabled:scale-100 flex items-center gap-2"
                 >
                   {isAnalyzing ? (
                     <><div className="animate-spin h-5 w-5 border-2 border-indigo-700 border-t-transparent rounded-full"></div> Analyzing...</>
                   ) : (
                     <><Zap size={20} className={aiCredits > 0 ? "fill-indigo-700" : "text-gray-400"} /> Run Analysis (-1 Credit)</>
                   )}
                 </button>
               </div>
             </div>

             {/* Results Area */}
             {(analysis || forecast.length > 0) && (
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 {/* Text Report */}
                 <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                      <Sparkles className="text-yellow-500" size={18} />
                      AI Strategy Report
                    </h3>
                    <div className="prose prose-sm prose-indigo text-gray-700 bg-gray-50 p-4 rounded-xl leading-relaxed whitespace-pre-line max-h-96 overflow-y-auto">
                      {analysis}
                    </div>
                 </div>

                 {/* Forecast Chart */}
                 <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                   <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                      <TrendingUp className="text-green-500" size={18} />
                      7-Day Revenue Forecast
                   </h3>
                   <div className="h-64">
                     {forecast.length > 0 ? (
                       <ResponsiveContainer width="100%" height="100%">
                         <BarChart data={forecast}>
                           <CartesianGrid strokeDasharray="3 3" vertical={false} />
                           <XAxis dataKey="day" axisLine={false} tickLine={false} />
                           <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `${value/1000}k`} />
                           <Tooltip 
                             cursor={{fill: '#f1f5f9'}}
                             contentStyle={{ borderRadius: '8px', border: 'none' }}
                             formatter={(value: number) => [formatCurrency(value, storeProfile.currency), 'Revenue']}
                           />
                           <Bar dataKey="revenue" fill="#6366f1" radius={[4, 4, 0, 0]} />
                         </BarChart>
                       </ResponsiveContainer>
                     ) : (
                        <div className="h-full flex items-center justify-center text-gray-400">No Data Available</div>
                     )}
                   </div>
                   <p className="text-xs text-gray-400 mt-4 text-center">
                     * Forecast generated by Gemini based on seasonality (e.g., Tourist Season).
                   </p>
                 </div>
               </div>
             )}
          </div>
        )}
      </div>

      <ReceiptModal 
        order={previewOrder} 
        onClose={() => setPreviewOrder(null)} 
        storeProfile={storeProfile}
      />
    </div>
  );
};

export default DashboardView;