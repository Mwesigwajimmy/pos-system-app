// src/types/dashboard.ts

// The DateRange type is needed for our new filter interface.
import { DateRange } from 'react-day-picker';

// ========= OVERVIEW DASHBOARD & KPIS =========

export interface Kpis {
  total_sales: number;
  total_cost: number;
  gross_profit: number;
  transaction_count: number;
}

export interface DailyTrendItem {
  date: string;
  sales: number;
}

export interface DashboardData {
  kpis: Kpis;
  daily_trend: DailyTrendItem[];
}


// ========= POINT OF SALE (POS) & INVENTORY =========

export interface Customer {
  id: number;
  created_at: string;
  name: string;
  email?: string;
  phone_number?: string;
  // Enterprise Addition: Assign customer to a specific business entity
  business_entity_id?: string;
}

export interface Category {
    id: number;
    name: string;
    description: string | null;
}

export interface SellableProduct {
  variant_id: number;
  product_name: string;
  variant_name: string;
  price: number;
  stock: number; // This might become a calculated field across warehouses
  sku: string;
}

export interface CartItem extends SellableProduct {
  quantity: number;
  // Enterprise Addition: Track lot/serial for sale
  lot_serial_number?: string;
}

export interface ProductRow {
  id: number;
  name:string;
  category_name: string | null;
  total_stock: number;
  variants_count: number;
  business_entity_name?: string;
}

// =================================================================== //
// ENTERPRISE ADDITION: Advanced Inventory & Warehouse Management
// =================================================================== //

export interface Warehouse {
    id: string; // uuid
    name: string;
    location: string;
    is_primary: boolean;
}

export interface InventoryLot {
    id: string; // uuid
    product_variant_id: number;
    lot_serial_number: string;
    quantity: number;
    cost_basis: number; // Cost per unit for this lot
    expiry_date?: string;
    warehouse_id: string;
}

export type StockLedgerEventType = 'IN' | 'OUT' | 'TRANSFER' | 'ADJUSTMENT';

export interface StockLedgerEntry {
    id: string; // uuid
    product_variant_id: number;
    warehouse_id: string;
    quantity_change: number; // Positive for IN, negative for OUT
    event_type: StockLedgerEventType;
    notes?: string;
    reference_id?: string; // e.g., PO ID, Sale ID, Transfer ID
    created_at: string;
}

export interface PickPackShipFlow {
    id: string; // uuid
    sale_id: number;
    status: 'PENDING_PICK' | 'PICKED' | 'PACKED' | 'SHIPPED';
    picker_id?: string; // Employee ID
    packer_id?: string; // Employee ID
    shipper_id?: string; // Employee ID
    tracking_number?: string;
    updated_at: string;
}


// ========= GENERAL LEDGER & FINANCIALS =========

/**
 * Defines the structure for the filters that can be applied
 * when fetching transactions from the API. THIS WAS THE MISSING PIECE.
 */
export interface TransactionFilters {
  date: DateRange;
  searchText: string | null;
  accountId: number | null;
  page: number;
  pageSize: number;
}

// =================================================================== //
// ENTERPRISE ADDITION: Multi-Currency & Multi-Book Accounting
// =================================================================== //

export interface Currency {
    code: string; // e.g., 'UGX', 'USD'
    name: string;
    symbol: string;
}

export interface ExchangeRate {
    id: number;
    from_currency: string;
    to_currency: string;
    rate: number;
    effective_date: string;
}

export interface Book {
    id: string; // uuid
    name: string; // e.g., "Primary Book (UGX)", "USD Book"
    currency_code: string;
    business_entity_id: string;
}

export interface FinancialPeriod {
    id: number;
    start_date: string;
    end_date: string;
    status: 'OPEN' | 'CLOSED';
    book_id: string;
}

export interface JournalEntry {
  entry_id: number;
  type: 'DEBIT' | 'CREDIT';
  amount: number; // Amount in the transaction's currency
  account_name: string;
  // Enterprise Additions for Multi-Currency
  amount_base_currency?: number; // Amount in the book's base currency
}

export interface Transaction {
  id: number;
  transaction_date: string;
  description: string;
  account_name: string;
  amount: number;
  journal_entries: JournalEntry[];
  // Enterprise Additions for Multi-Book/Currency
  book_id?: string;
  currency_code?: string;
  exchange_rate?: number;
}

export interface Account {
  id: number;
  name: string;
  type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
  // Enterprise Addition for Multi-Book
  book_id?: string;
}


// ========= AUDIT & COMPLIANCE =========

export interface AuditLogEntry {
  id: number;
  user_email: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  table_name: string;
  record_id: string;
  description: string;
  created_at: string;
  old_data?: Record<string, any>;
  new_data?: Record<string, any>;
}

export interface TaxReport {
  tax_type: string;
  start_date: string;
  end_date: string;
  total_sales: number;
  taxable_sales: number;
  tax_liability: number;
  payments_made: number;
  balance_due: number;
}

// =================================================================== //
// ENTERPRISE ADDITION: Identity, Security & Compliance
// =================================================================== //

export interface SSOProvider {
    id: string; // e.g., 'saml-okta', 'oauth-google'
    name: string;
    type: 'SAML' | 'OAuth';
    is_enabled: boolean;
}

export type SecurityCertification = 'SOC2' | 'ISO27001';


// =================================================================== //
// ENTERPRISE ADDITION: Multi-Entity / Multi-Branch Architecture
// =================================================================== //

export interface BusinessEntity {
    id: string; // uuid
    name: string; // e.g., "BBU1 Kampala Branch", "BBU1 Mbarara Franchise"
    parent_entity_id?: string; // For hierarchical structures
    is_active: boolean;
}


// =================================================================== //
//  DEFINITIVE ADDITION: MANAGEMENT & HR
// =================================================================== //
export interface Employee {
  id: string; // This is a uuid from auth.users
  full_name: string;
  email: string;
  role: 'admin' | 'manager' | 'cashier' | 'accountant' | 'auditor' | 'warehouse_staff'; // Added new role
  status: 'Active' | 'Invited'; // 'Active' means they have accepted the invite
  // Enterprise Addition: Assign employee to specific entities
  business_entity_id?: string;
}