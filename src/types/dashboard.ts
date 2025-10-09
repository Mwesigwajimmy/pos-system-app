// src/types/dashboard.ts

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
  stock: number;
  sku: string;
}

export interface CartItem extends SellableProduct {
  quantity: number;
}

export interface ProductRow {
  id: number;
  name:string;
  category_name: string | null;
  total_stock: number;
  variants_count: number;
}


// ========= GENERAL LEDGER & FINANCIALS =========

export interface JournalEntry {
  entry_id: number;
  type: 'DEBIT' | 'CREDIT';
  amount: number;
  account_name: string;
}

export interface Transaction {
  id: number;
  transaction_date: string;
  description: string;
  journal_entries: JournalEntry[];
}

export interface Account {
  id: number;
  name: string;
  type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
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
//  DEFINITIVE ADDITION: MANAGEMENT & HR
//  This new section adds the necessary types for your revolutionary
//  Agent Onboarding and Employee Management features.
// =================================================================== //
export interface Employee {
  id: string; // This is a uuid from auth.users
  full_name: string;
  email: string;
  role: 'admin' | 'manager' | 'cashier' | 'accountant' | 'auditor';
  status: 'Active' | 'Invited'; // 'Active' means they have accepted the invite
}