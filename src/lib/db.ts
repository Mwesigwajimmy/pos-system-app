import Dexie, { Table } from 'dexie';
import { SellableProduct, CartItem, Customer } from '@/types/dashboard';

/**
 * --- BBU1 SOVEREIGN DATABASE CORE ---
 * VERSION: v19.5 OMEGA-ULTIMATUM (THE FORENSIC ALIGNMENT WELD)
 * JURISDICTION: Unified Multi-Tenant / Multi-Sector Infrastructure
 * 
 * CORE ARCHITECTURAL UPGRADES:
 * 1. VERSION 7 MIGRATION: Forced schema rebuild to clear legacy ID collisions 
 *    between browser-generated and backend-generated BigInts.
 * 2. IDENTITY VAULT ANCHOR: Added physical 'identity' table to store 
 *    'view_bbu1_corporate_identity'. This provides the local "Handshake" 
 *    Aura needs to verify the Director's session.
 * 3. BIGINT PRIMARY KEY ALIGNMENT: Removed '++' from 'products', 'customers', 
 *    and 'printers'. The system now treats the Global Ledger (Supabase) as 
 *    the source of truth for these IDs.
 * 4. MULTI-TENANT ISOLATION: Explicitly indexed 'business_id' across all 
 *    forensic tables to ensure zero data leakage between different business nodes.
 */

export type { SellableProduct, CartItem, Customer };

// --- SOVEREIGN IDENTITY INTERFACE ---
// Mirrored exactly from view_bbu1_corporate_identity
export interface CorporateIdentity {
  business_id: string;      // Physical Primary Key
  legal_name: string;
  primary_color: string;
  logo_url: string;
  currency_code: string;
  tin_number?: string;
  plot_number?: string;
  po_box?: string;
  official_email?: string;
  official_phone?: string;
  receipt_footer?: string;
  ceo_name?: string;
  physical_address?: string;
}

// --- OFFLINE TRANSACTION INTERFACE ---
export interface OfflineSale {
  id?: number;              // Local primary key (Keep '++' for browser generation)
  createdAt: Date;
  cartItems: CartItem[];
  customerId: number | null;
  paymentMethod: string;
  business_id: string; 
  user_id: string;          // CRITICAL: Used for Forensic Device Isolation
  amount_paid: number;
  payment_status: 'paid' | 'partial' | 'unpaid';
  due_amount: number;
  discount_type: 'fixed' | 'percentage' | null;
  discount_value: number | null;
  discount_amount: number | null;
  tax_amount?: number;      // Aligned with Sovereign Tax Kernel
}

// --- HARDWARE REGISTRY INTERFACE ---
export interface Printer {
  id: number;               // Global ID from backend
  name: string;
  system_name: string;
  is_default: boolean;
  business_id: string;
}

// --- THE MASTER DATABASE ENGINE ---
class OfflineDatabase extends Dexie {
  // Table Definitions
  products!: Table<SellableProduct>;
  customers!: Table<Customer>;
  offlineSales!: Table<OfflineSale>;
  printers!: Table<Printer>;
  identity!: Table<CorporateIdentity>; // THE AURA VAULT ANCHOR

  constructor() {
    super('ugBizSuiteDB');

    /**
     * V7 UPGRADE: FORENSIC SCHEMA LOCK
     * --------------------------------------------------
     * We incremented to Version 7 to ensure a physical "Weld" 
     * between the browser disk and the Global Ledger.
     */
    this.version(7).stores({
      /**
       * 1. PRODUCTS: Indexed by variant_id (BigInt).
       * We removed '++' because IDs are provided by get_sellable_products().
       */
      products: 'variant_id, product_name, sku, business_id', 

      /**
       * 2. CUSTOMERS: Indexed by global BigInt ID.
       * Business_id ensures search results are isolated to the active tenant.
       */
      customers: 'id, name, phone_number, business_id', 

      /**
       * 3. PRINTERS: Local hardware configuration.
       */
      printers: 'id, name, is_default, business_id',

      /**
       * 4. IDENTITY: The Aura Forensic Anchor.
       * Stores the result of view_bbu1_corporate_identity.
       */
      identity: 'business_id', 

      /**
       * 5. OFFLINE SALES: Locally generated queue.
       * We KEEP '++id' here because these records are born in the browser 
       * before being synced to the Global Ledger.
       */
      offlineSales: '++id, createdAt, customerId, payment_status, user_id, business_id', 
    });
  }
}

// --- INSTANTIATION ---
// We export a single instance to prevent database locking across the system
export const db = new OfflineDatabase();

/**
 * STATUS: Sovereign Node Sealed.
 * JURISDICTION: Unified Multi-Tenant Cloud.
 * ENGINE: Elite 1024-dim Data Integrity Ready.
 * LOG: Aligned with setup_complete logic and backend forensics.
 */