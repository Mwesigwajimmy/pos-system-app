//==============================================================================
// ENTERPRISE CORE: ACCOUNT TYPES
// Defines the strict classification for all financial accounts in the system.
//==============================================================================

/**
 * A comprehensive set of identifiers for financial account categories.
 * Updated to include professional ERP subtypes required for autonomous logic.
 */
export type AccountType =
  // Assets
  | 'checking'
  | 'savings'
  | 'cash'
  | 'money_market'
  | 'inventory'          // Required for Warehouse interconnect
  | 'accounts_receivable' // Required for Invoice interconnect
  
  // Liabilities
  | 'credit_card'
  | 'line_of_credit'
  | 'accounts_payable'    // Required for Bills interconnect
  | 'mortgage'
  | 'auto_loan'
  | 'student_loan'
  | 'personal_loan'

  // Equity & Investments
  | 'brokerage'
  | '401k'
  | 'ira'
  | 'roth_ira'
  | 'hsa'
  | 'equity'

  // Revenue & Expense (P&L)
  | 'revenue'
  | 'expense'

  // Tangible Assets
  | 'asset_property'
  | 'asset_vehicle'
  | 'other';

/**
 * ENTERPRISE ACCOUNT INTERFACE
 * Represents a single General Ledger account within a tenant's COA.
 */
export interface Account {
  id: string;
  business_id: string; // Multi-tenant isolation (Essential)
  name: string;
  code: string;        // FIXED: Added missing code property for ERP compliance
  type: AccountType | string;
  balance: number;     // Stored as decimal/numeric in DB
  is_active: boolean;  // Control logic for UI dropdowns
  created_at: string;
  user_id?: string;    // Optional link to specific owner
}


//==============================================================================
// TRANSACTION & LEDGER TYPES
// Defines the structure for all financial movements.
//==============================================================================

export type TransactionType = 'income' | 'expense' | 'transfer' | 'adjustment';

export interface Transaction {
  id: string;
  business_id: string;
  account_id: string;
  date: string;
  description: string;
  amount: number;
  type: TransactionType;
  category: string;
  reference?: string;   // Link to Invoice or Bill #
  created_at: string;
}


//==============================================================================
// BUDGETING & PERFORMANCE
// Defines the structure for financial planning vs actuals.
//==============================================================================

export type BudgetPeriod = 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export interface Budget {
  id: string;
  business_id: string;
  name: string;
  year: number;
  category?: string;
  amount: number;
  period: BudgetPeriod;
  start_date: string;
  end_date: string;
  created_at: string;
}


//==============================================================================
// SACCO MODULE TYPES (Savings and Credit Cooperative)
// Defines the structure for cooperative financial management.
//==============================================================================

export interface SaccoMember {
  member_id: string;
  user_id: string;
  business_id: string; // Linked to the Sacco organization
  full_name: string;
  member_no: string;
  status: 'Active' | 'Pending' | 'Suspended';
  phone_number: string;
  email: string;
  total_shares: number;
  total_savings: number;
  joined_at: string;
}

export interface SaccoShare {
  id: string;
  member_id: string;
  share_amount: number;
  share_price: number;
  total_value: number;
  purchase_date: string;
  certificate_no: string;
}

export interface SaccoDividend {
  id: string;
  period_year: number;
  declared_rate: number;
  total_payout: number;
  status: 'Draft' | 'Approved' | 'Paid';
  created_at: string;
}

export interface SaccoTransaction {
  id: string;
  transaction_ref: string;
  member_id: string;
  amount: number;
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'LOAN_DISBURSEMENT' | 'LOAN_REPAYMENT' | 'SHARE_PURCHASE';
  status: 'COMPLETED' | 'PENDING' | 'FAILED';
  channel: 'MOBILE' | 'COUNTER' | 'AGENT';
  created_at: string;
}

export interface SaccoContribution {
  id: string;
  group_id?: string;
  member_id: string;
  period: string; 
  amount: number;
  is_remitted: boolean;
  remitted_at: string;
}

export interface SaccoStats {
  totalAssets: number;
  activeMembers: number;
  loanPortfolio: number;
  monthlyRevenue: number;
  liquidityRatio: number;
}