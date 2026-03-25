import Dexie, { Table } from 'dexie';
import { SellableProduct, CartItem, Customer } from '@/types/dashboard';

export type { SellableProduct, CartItem, Customer };

export interface OfflineSale {
  id?: number;
  createdAt: Date;
  cartItems: CartItem[];
  customerId: number | null;
  paymentMethod: string;
  business_id: string; 
  user_id: string; // CRITICAL: Used for Device Isolation
  amount_paid: number;
  payment_status: 'paid' | 'partial' | 'unpaid';
  due_amount: number;
  discount_type: 'fixed' | 'percentage' | null;
  discount_value: number | null;
  discount_amount: number | null;
  tax_amount?: number; // UPGRADE: Aligned with Sovereign Tax Kernel
}

export interface Printer {
  id: number;
  name: string;
  system_name: string;
  is_default: boolean;
}

class OfflineDatabase extends Dexie {
  products!: Table<SellableProduct>;
  customers!: Table<Customer>;
  offlineSales!: Table<OfflineSale>;
  printers!: Table<Printer>;

  constructor() {
    super('ugBizSuiteDB');

    // V-REVOLUTION: ENTERPRISE SCHEMA UPGRADE
    // We added user_id and business_id to the indexes.
    // This allows the POS to lock the sync to the current session only.
    this.version(4).stores({
      products: '++variant_id, product_name, sku', 
      customers: '++id, name, phone_number',
      offlineSales: '++id, createdAt, customerId, payment_status, user_id, business_id', 
      printers: '++id, name, is_default',
    });
  }
}

export const db = new OfflineDatabase();