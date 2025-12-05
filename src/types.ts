export interface MenuItem {
  id: string;
  name: string;
  category: 'coffee' | 'dessert' | 'meal' | 'beverage';
  price: number;
  cost: number; // For net profit calculation
  stock: number; // Inventory tracking
  color: string;
  image: string; // URL for the menu item image
}

export interface OrderItem extends MenuItem {
  quantity: number;
  notes?: string; // Custom requests (e.g. "Less Ice")
}

export interface Order {
  id: string;
  tableId: number;
  items: OrderItem[];
  total: number;
  timestamp: Date;
  status: 'completed' | 'refunded'; // Added refunded status
}

export interface Table {
  id: number;
  label: string;
  x: number;
  y: number;
  status: 'empty' | 'occupied';
  currentOrderId?: string;
}

export interface StoreProfile {
  name: string;
  location: string;
  currency: string;
  taxRate: number;
  panNumber: string; // New: Tax Registration Number
  settlementAccount: string; // New: Bank or Wallet ID for settlement
  logoIcon: 'coffee' | 'mountain' | 'cloud'; // Simple icon selection for demo
  themeColor: string;
}

export interface SalesData {
  date: string;
  revenue: number;
  profit: number;
}

export enum AppMode {
  POS = 'POS',
  DASHBOARD = 'DASHBOARD',
  SETTINGS = 'SETTINGS'
}