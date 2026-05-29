import Dexie, { Table } from 'dexie';
import { SellableProduct, CartItem, Customer } from '@/types/dashboard';

/**
 * --- BBU1 SOVEREIGN DATABASE CORE ---
 * VERSION: v20.5 OMEGA-ULTIMATUM (THE APEX ALIGNMENT WELD)
 * JURISDICTION: Unified Multi-Tenant / Multi-Sector Infrastructure
 * 
 * CORE ARCHITECTURAL UPGRADES:
 * 1. VERSION 8 MIGRATION: Physical schema rebuild to align with the 
 *    'get_aura_handshake' Omniscient Payload (v20.0). Forces a clean 
 *    re-mount of the Sovereign Node to clear legacy '0xNULL' states.
 * 2. UNIFIED IDENTITY ANCHOR: Table 'identity' now mirrors the backend JSON 
 *    structure perfectly (userId, businessId, businessName, logo, is_ready).
 * 3. BIGINT PRIMARY KEY ALIGNMENT: Strictly aligned with backend-generated 
 *    BigInts for Products and Customers to prevent 'ConstraintError' during Sync.
 * 4. MULTI-TENANT ISOLATION: Explicitly indexed 'businessId' and 'userId' to 
 *    ensure data integrity and forensic accountability across the global node.
 * 5. HANDSHAKE WELD: Added 'related_deal_id' to align with the Wide-System 
 *    CRM/Procurement triggers and prevent Handshake Interruptions.
 */

export type { SellableProduct, CartItem, Customer };

/**
 * --- SOVEREIGN IDENTITY INTERFACE ---
 * This interface is a 1:1 physical mirror of the 'get_aura_handshake' 
 * result combined with the deep organizational UUID audit.
 */
export interface CorporateIdentity {
  userId: string;           // Physical Primary Key (Sovereign UUID)
  businessId: string;       // Physical Global Primary Key
  tenantId: string;         // Forensic Tenant Link
  organizationId: string;   // Global Organization Link
  businessName: string;
  logo: string | null;
  status: string;
  is_ready: boolean;
  primary_color: string;
  currency_code: string;
  official_email?: string;
  official_phone?: string;
  tin_number?: string;
  plot_number?: string;
  po_box?: string;
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
  related_deal_id?: string | null; // DEEP WELD: Aligns with wide-system CRM/Procurement Handshake
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
 * Version 8: The Unified Handshake Weld (time@bbu1.com).
 */
class OfflineDatabase extends Dexie {
  // Physical Table Definitions
  products!: Table<SellableProduct>;
  customers!: Table<Customer>;
  offlineSales!: Table<OfflineSale>;
  printers!: Table<Printer>;
  identity!: Table<CorporateIdentity>; // THE NEURAL HANDSHAKE VAULT

  constructor() {
    super('ugBizSuiteDB');

    /**
     * V8 UPGRADE: APEX HANDSHAKE LOCK
     * --------------------------------------------------
     * We incremented to Version 8 to physically weld the 
     * organizational cross-links (Tenant/Org) and the camelCase 
     * handshake payload keys into the browser disk.
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
       * Handshake alignment: maps the 5918cefa... UUIDs discovered 
       * in the deep audit to the Mission Control UI.
       */
      identity: 'userId, businessId, tenantId, organizationId', 

      /**
       * 5. OFFLINE SALES: The Browser Transaction Buffer.
       * Added 'related_deal_id' to the index to finalize the CRM/Procurement Weld.
       */
      offlineSales: '++id, createdAt, customerId, payment_status, user_id, business_id, related_deal_id', 
    });
  }
}

// --- SOVEREIGN INSTANTIATION ---
/**
 * We export a single persistent instance of the database to ensure 
 * connection stability and prevent database locks during multi-tab operations.
 */
export const db = new OfflineDatabase();