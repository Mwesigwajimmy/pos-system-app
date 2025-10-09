import Dexie, { Table } from 'dexie';
// 1. Import the types from their original location
import { SellableProduct, CartItem, Customer } from '@/types/dashboard';

// --- 2. EXPORT THE IMPORTED TYPES SO OTHER FILES CAN USE THEM ---
export type { SellableProduct, CartItem, Customer };


// --- INTERFACE DEFINITIONS ---

// A record of a sale made while offline, with all necessary IDs for syncing.
export interface OfflineSale {
  id?: number;
  createdAt: Date;
  cartItems: CartItem[];
  customerId: number | null;
  paymentMethod: string;
  business_id: string; 
  user_id: string;
  amount_paid: number;
  payment_status: 'paid' | 'partial' | 'unpaid';
  due_amount: number;
  discount_type: 'fixed' | 'percentage' | null;
  discount_value: number | null;
  discount_amount: number | null;
}

// A record of a configured printer, synced from Supabase for offline access.
export interface Printer {
  id: number;
  name: string;
  system_name: string;
  is_default: boolean;
}

// --- DEXIE DATABASE CLASS ---

class OfflineDatabase extends Dexie {
  // Define our tables (Object Stores)
  products!: Table<SellableProduct>;
  customers!: Table<Customer>;
  offlineSales!: Table<OfflineSale>;
  printers!: Table<Printer>;

  constructor() {
    super('ugBizSuiteDB');

    // Schema definition for the local browser database.
    this.version(3).stores({
      products: '++variant_id, product_name, sku', 
      customers: '++id, name, phone_number',
      offlineSales: '++id, createdAt, customerId, payment_status', 
      printers: '++id, name, is_default',
    });
  }
}

export const db = new OfflineDatabase();