// src/lib/types.ts

//==============================================================================
// ACCOUNT TYPES
// Defines the strict classification for all financial accounts in the system.
//==============================================================================

/**
 * A comprehensive set of specific identifiers for financial account categories.
 * This union type ensures data integrity and consistency across the application.
 */
export type AccountType =
  // Liquid & Cash Equivalents
  | 'checking'
  | 'savings'
  | 'cash'
  | 'money_market'

  // Credit Facilities
  | 'credit_card'
  | 'line_of_credit'

  // Debt & Loan Obligations
  | 'mortgage'
  | 'auto_loan'
  | 'student_loan'
  | 'personal_loan'

  // Investment & Retirement Holdings
  | 'brokerage'
  | '401k'
  | 'ira'
  | 'roth_ira'
  | 'hsa'

  // Tangible & Other Assets
  | 'asset_property'
  | 'asset_vehicle'

  // Fallback for uncategorized or miscellaneous accounts
  | 'other';

/**
 * The core data structure for a financial account. It represents a single
 * source of funds or debt within the system.
 */
export type Account = {
  id: string; // Using string for UUID or CUID compatibility is recommended
  user_id: string;
  name: string;
  type: AccountType;
  balance: number; // Current balance of the account in cents to avoid floating point issues
  created_at: string; // ISO 8601 timestamp
};


//==============================================================================
// TRANSACTION TYPES
// Defines the structure for all financial transactions.
//==============================================================================

/**
 * Specifies the nature of a transaction, ensuring all financial movements
 * are correctly classified as either an inflow or an outflow.
 */
export type TransactionType = 'income' | 'expense';

/**
 * Represents a single financial transaction, which is the fundamental unit
 * of financial activity linked to an account.
 */
export type Transaction = {
  id: string;
  account_id: string; // Foreign key to the Account
  user_id: string;
  date: string; // ISO 8601 date string
  description: string;
  amount: number; // Stored in cents, always a positive integer
  type: TransactionType;
  category: string; // e.g., 'Groceries', 'Utilities', 'Salary'
  created_at: string; // ISO 8601 timestamp
};


//==============================================================================
// BUDGET TYPES
// Defines the structure for financial budgets.
//==============================================================================

/**
 * Defines the recurring time interval for a budget period.
 */
export type BudgetPeriod = 'weekly' | 'monthly' | 'quarterly' | 'yearly';

/**
 * Represents a user-defined budget for a specific spending category over a
 * defined period. It is used for tracking and planning expenses.
 */
export type Budget = {
  id: string;
  user_id: string;
  category: string; // The transaction category this budget applies to
  amount: number; // The budgeted amount in cents
  period: BudgetPeriod;
  start_date: string; // ISO 8601 date string
  end_date: string; // ISO 8601 date string
  created_at: string; // ISO 8601 timestamp
};
export interface SaccoMember {
  member_id: string;
  user_id: string; // Link to auth.users
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
  period: string; // e.g., "JAN-2025"
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
};