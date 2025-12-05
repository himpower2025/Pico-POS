import { GoogleGenAI, Type } from "@google/genai";
import { Order, MenuItem } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

// Helper to calculate raw stats for the AI
const aggregateSales = (orders: Order[], menu: MenuItem[]) => {
  let totalRevenue = 0;
  let totalCost = 0;
  const itemCounts: Record<string, number> = {};

  orders.forEach(order => {
    totalRevenue += order.total;
    order.items.forEach(item => {
      // Find original cost from menu
      const menuItem = menu.find(m => m.id === item.id);
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

export const analyzeBusiness = async (orders: Order[], menu: MenuItem[]) => {
  const stats = aggregateSales(orders, menu);
  const prompt = `
    Analyze the following cafe sales data for "Pico Cafe".
    Data: ${JSON.stringify(stats)}
    
    Provide a professional business insight report in ENGLISH.
    Include:
    1. Overall performance summary (Revenue, Cost, Net Profit, Margin).
    2. Best selling items.
    3. Actionable advice to improve sales and reduce costs.
    
    Format the response using Markdown. Keep it professional and executive-summary style.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: "You are an expert Restaurant Business Analyst. You provide critical insights to maximize profit in English."
      }
    });
    return response.text;
  } catch (error) {
    console.error("Analysis failed", error);
    return "AI Analysis service is currently unavailable.";
  }
};

export const forecastSales = async (orders: Order[]) => {
  // Simulate historical context for the AI
  const prompt = `
    Based on the current sales patterns (Total orders today: ${orders.length}, Revenue: ${orders.reduce((acc, o) => acc + o.total, 0)}),
    predict the sales revenue for the NEXT 7 DAYS.
    
    Assume today is Friday. Weekends usually see 20% higher traffic.
    
    Return ONLY a JSON array of objects with 'day' (string, e.g., 'Sat') and 'revenue' (number).
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              day: { type: Type.STRING },
              revenue: { type: Type.NUMBER }
            }
          }
        }
      }
    });
    return response.text;
  } catch (error) {
    console.error("Forecast failed", error);
    return "[]";
  }
};