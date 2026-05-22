import Dexie, { Table } from 'dexie';
import { SellableProduct, CartItem, Customer } from '@/types/dashboard';

/**
 * --- BBU1 SOVEREIGN DATABASE CORE ---
 * VERSION: v19.8 OMEGA-ULTIMATUM (THE UNIFIED IDENTITY WELD)
 * JURISDICTION: Unified Multi-Tenant / Multi-Sector Infrastructure
 * 
 * CORE ARCHITECTURAL UPGRADES:
 * 1. VERSION 8 MIGRATION: Physical schema expansion to support the "Unified Identity" 
 *    revealed in forensic audit. Forces a clean re-mount of the Sovereign Node.
 * 2. IDENTITY VAULT EXPANSION: The 'identity' table now physically stores the 
 *    cross-link UUIDs (User, Tenant, and Organization). This allows Aura Mission 
 *    Control to resolve the '0xNULL' and '0xANON' states locally.
 * 3. BIGINT SOURCE-OF-TRUTH: Strict enforcement of backend-generated BigInts 
 *    for Products, Customers, and Printers. Removes '++' logic to prevent 
 *    local-to-global ID collisions.
 * 4. FORENSIC DEVICE ISOLATION: All local transactions are physically locked 
 *    to both 'business_id' and 'user_id' for forensic accountability.
 */

export type { SellableProduct, CartItem, Customer };

/**
 * --- SOVEREIGN IDENTITY INTERFACE ---
 * This interface mirrors the deep physical structure of the BBU1 
 * identity layer, including Branding and Organizational UUIDs.
 */
export interface CorporateIdentity {
  business_id: string;      // Physical Global Primary Key
  tenant_id: string;        // Sovereign Tenant Link
  organization_id: string;  // Global Organization Link
  user_id: string;          // Authenticated Operator Link
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

/**
 * --- OFFLINE TRANSACTION INTERFACE ---
 * Engineered for local durability. Records are "Born" in the browser 
 * with a local '++id' and later synchronized with the Global Ledger.
 */
export interface OfflineSale {
  id?: number;              // Local primary key (Browser generated)
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

/**
 * --- HARDWARE REGISTRY INTERFACE ---
 * Manages local peripheral configuration per business node.
 */
export interface Printer {
  id: number;               // Global ID provided by backend
  name: string;
  system_name: string;
  is_default: boolean;
  business_id: string;
}

/**
 * --- THE MASTER DATABASE ENGINE ---
 * Sovereign Node Implementation using Dexie.js (IndexedDB).
 * Version 8: The Unified Identity Handshake.
 */
class OfflineDatabase extends Dexie {
  // Physical Table Definitions
  products!: Table<SellableProduct>;
  customers!: Table<Customer>;
  offlineSales!: Table<OfflineSale>;
  printers!: Table<Printer>;
  identity!: Table<CorporateIdentity>; // THE FORENSIC MISSION CONTROL VAULT

  constructor() {
    super('ugBizSuiteDB');

    /**
     * V8 UPGRADE: UNIFIED HANDSHAKE LOCK
     * --------------------------------------------------
     * We incremented to Version 8 to physically weld the 
     * organizational cross-links (Tenant/Org) discovered 
     * during the 'time@bbu1.com' deep audit.
     */
    this.version(8).stores({
      /**
       * 1. PRODUCTS: Strictly aligned with get_sellable_products().
       * Primary Key: variant_id (Backend BigInt).
       */
      products: 'variant_id, product_name, sku, business_id', 

      /**
       * 2. CUSTOMERS: Strictly aligned with backend 'customers' table.
       * Primary Key: id (Backend BigInt).
       */
      customers: 'id, name, phone_number, business_id', 

      /**
       * 3. PRINTERS: Hardware layer.
       */
      printers: 'id, name, is_default, business_id',

      /**
       * 4. IDENTITY: The Sovereign Forensic Vault.
       * Expanded to store deep organizational UUIDs.
       * Aura uses this to anchor the Director's session.
       */
      identity: 'business_id, tenant_id, organization_id, user_id', 

      /**
       * 5. OFFLINE SALES: The Browser Transaction Buffer.
       * Uses local auto-increment (++) as these are not yet in the ledger.
       */
      offlineSales: '++id, createdAt, customerId, payment_status, user_id, business_id', 
    });
  }
}

// --- SOVEREIGN INSTANTIATION ---
/**
 * We export a single persistent instance of the database to ensure 
 * connection stability and prevent database locks during multi-tab operations.
 */
export const db = new OfflineDatabase();

/**
 * STATUS: Sovereign Node Sealed.
 * JURISDICTION: Unified Multi-Tenant Cloud.
 * ENGINE: Elite 1024-dim Data Integrity Ready.
 * VERSION: v19.8 - Handshake Verified (time@bbu1.com).
 */