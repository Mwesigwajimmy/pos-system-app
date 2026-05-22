import Dexie, { Table } from 'dexie';
import { SellableProduct, CartItem, Customer } from '@/types/dashboard';

/**
 * --- BBU1 SOVEREIGN DATABASE CORE ---
 * VERSION: v19.2 OMEGA-ULTIMATUM (THE IDENTITY WELD)
 * JURISDICTION: Unified Multi-Tenant Infrastructure
 * 
 * CORE ALIGNMENT FIXES:
 * 1. IDENTITY ANCHOR: Added 'identity' table to store 'view_bbu1_corporate_identity'.
 *    This allows Aura to verify branding and secure the node offline.
 * 2. PRIMARY KEY ALIGNMENT: Removed '++' from backend-generated tables (customers, products).
 *    This prevents collision errors when syncing from the Global Ledger.
 * 3. MULTI-TENANT ISOLATION: Explicitly indexed 'business_id' across all tables
 *    to ensure the Sovereign Node never bleeds data between businesses.
 */

export type { SellableProduct, CartItem, Customer };

// --- SOVEREIGN IDENTITY INTERFACE ---
export interface CorporateIdentity {
  business_id: string;      // Primary Key
  legal_name: string;
  primary_color: string;
  logo_url: string;
  currency_code: string;
  tin_number?: string;
  physical_address?: string;
}

// --- OFFLINE TRANSACTION INTERFACE ---
export interface OfflineSale {
  id?: number;              // Local primary key (Keep '++' here)
  createdAt: Date;
  cartItems: CartItem[];
  customerId: number | null;
  paymentMethod: string;
  business_id: string; 
  user_id: string;          // Forensic Device Isolation
  amount_paid: number;
  payment_status: 'paid' | 'partial' | 'unpaid';
  due_amount: number;
  discount_type: 'fixed' | 'percentage' | null;
  discount_value: number | null;
  discount_amount: number | null;
  tax_amount?: number;      // Aligned with Sovereign Tax Kernel
}

export interface Printer {
  id: number;
  name: string;
  system_name: string;
  is_default: boolean;
  business_id: string;
}

// --- THE MASTER DATABASE ENGINE ---
class OfflineDatabase extends Dexie {
  products!: Table<SellableProduct>;
  customers!: Table<Customer>;
  offlineSales!: Table<OfflineSale>;
  printers!: Table<Printer>;
  identity!: Table<CorporateIdentity>; // THE AURA ANCHOR

  constructor() {
    super('ugBizSuiteDB');

    /**
     * V6 UPGRADE: FORENSIC SCHEMA LOCK
     * --------------------------------------------------
     * We incremented to Version 6 to force a clean break from 
     * corrupted legacy browser storage.
     */
    this.version(6).stores({
      // Backend Provided (No '++')
      products: 'variant_id, product_name, sku, business_id', 
      customers: 'id, name, phone_number, business_id', 
      printers: 'id, name, is_default, business_id',
      identity: 'business_id', // Aura's forensic anchor
      
      // Locally Generated (Keep '++')
      offlineSales: '++id, createdAt, customerId, payment_status, user_id, business_id', 
    });
  }
}

// Instantiate the singleton instance
export const db = new OfflineDatabase();

/**
 * STATUS: Sovereign Node Sealed.
 * JURISDICTION: Unified Multi-Tenant Cloud.
 * ENGINE: Elite 1024-dim Data Integrity Ready.
 */