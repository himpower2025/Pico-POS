import { Order, MenuItem } from '../types';
import { callAnalyzeBusiness, callForecastSales } from './firebaseService';

// ═══════════════════════════════════════════════════════════════════════
// AI insights
//
// The Gemini API key used to live here, injected at build time by
// vite.config.ts (`define: { 'process.env.API_KEY': ... }`). Vite's `define`
// substitutes the literal string into the JS bundle, so anyone who unzipped
// the APK/IPA — or just opened DevTools on the web build — could read the
// key and spend your quota. The key now lives only in Cloud Functions
// secrets, and this file calls those functions instead.
//
// The function signatures are unchanged, so DashboardView needs no edits.
//
// PRIVACY: aggregateSales() still runs on the client and only totals and
// menu item names are sent. No customer data ever leaves the device — this
// is exactly what STORE_SUBMISSION_NOTES.md declares to Apple and Google,
// so keep it that way if you extend this file.
// ═══════════════════════════════════════════════════════════════════════

const aggregateSales = (orders: Order[], menu: MenuItem[]) => {
  let totalRevenue = 0;
  let totalCost = 0;
  const itemCounts: Record<string, number> = {};

  orders.forEach((order) => {
    totalRevenue += order.total;
    order.items.forEach((item) => {
      const menuItem = menu.find((m) => m.id === item.id);
      const cost = menuItem ? menuItem.cost : 0;
      totalCost += cost * item.quantity;
      itemCounts[item.name] = (itemCounts[item.name] || 0) + item.quantity;
    });
  });

  return {
    totalRevenue,
    totalCost,
    netProfit: totalRevenue - totalCost,
    itemCounts,
    orderCount: orders.length
  };
};

export const analyzeBusiness = async (
  orders: Order[],
  menu: MenuItem[],
  storeName: string = 'the cafe'
): Promise<string> => {
  try {
    return await callAnalyzeBusiness(aggregateSales(orders, menu), storeName);
  } catch (error) {
    console.error('Analysis failed', error);
    return 'AI Analysis service is currently unavailable.';
  }
};

export const forecastSales = async (orders: Order[]): Promise<string> => {
  try {
    return await callForecastSales(
      orders.length,
      orders.reduce((acc, o) => acc + o.total, 0)
    );
  } catch (error) {
    console.error('Forecast failed', error);
    return '[]';
  }
};
