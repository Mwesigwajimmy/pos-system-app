export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      accounting_journal_entries: {
        Row: {
          id: string
          business_id: string
          transaction_id: string
          account_id: string
          description: string | null
          debit: number
          credit: number
          due_date: string | null
          partner_id: string | null
          reconciled: boolean
          created_at: string
          source_type: string | null
          source_id: number | null
          is_reconciled: boolean
          reconciliation_id: string | null
          bank_transaction_id: string | null
          tax_profile_id: number | null
          is_tax_line: boolean
          tax_type: string | null
          voucher_no: string | null
          partner_type: string | null
          product_name: string | null
          product_id: number | null
          is_auditor_locked: boolean
        }
        Insert: {
          id?: string
          business_id: string
          transaction_id: string
          account_id: string
          description?: string | null
          debit?: number
          credit?: number
          due_date?: string | null
          partner_id?: string | null
          reconciled?: boolean
          created_at?: string
          source_type?: string | null
          source_id?: number | null
          is_reconciled?: boolean
          reconciliation_id?: string | null
          bank_transaction_id?: string | null
          tax_profile_id?: number | null
          is_tax_line?: boolean
          tax_type?: string | null
          voucher_no?: string | null
          partner_type?: string | null
          product_name?: string | null
          product_id?: number | null
          is_auditor_locked?: boolean
        }
        Update: Partial<Database['public']['Tables']['accounting_journal_entries']['Row']>
      }
      sovereign_audit_anomalies: {
        Row: {
          id: string
          execution_id: string | null
          tenant_id: string | null
          anomaly_type: string | null
          severity: string | null
          description: string | null
          raw_evidence: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          execution_id?: string | null
          tenant_id?: string | null
          anomaly_type?: string | null
          severity?: string | null
          description?: string | null
          raw_evidence?: Json | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['sovereign_audit_anomalies']['Row']>
      }
      // Added based on your Sacco/Telecom metadata
      sacco_members: {
        Row: {
          id: string
          member_number: string
          first_name: string
          last_name: string
          phone_number: string | null
          status: string
          total_shares: number
          business_id: string | null
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['sacco_members']['Row']>
        Update: Partial<Database['public']['Tables']['sacco_members']['Row']>
      }
      telecom_transactions: {
        Row: {
          id: number
          business_id: string
          service_id: number | null
          transaction_type: string
          amount: number
          commission_earned: number
          customer_phone: string | null
          transaction_category: Database['public']['Enums']['transaction_category']
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['telecom_transactions']['Row']>
        Update: Partial<Database['public']['Tables']['telecom_transactions']['Row']>
      }
    }
    Views: {
      view_admin_critical_anomalies: {
        Row: {
          id: string
          event_category: string
          event_name: string
          tenant_id: string
          severity_level: string
          metadata: Json
          created_at: string
        }
      }
      view_enterprise_management_cockpit: {
        Row: {
          Organization: string
          Total_Invoices: number
          Revenue_Booked: number
          Ledger_Status: string
        }
      }
    }
    Functions: {
      get_my_business_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      proc_sovereign_global_audit_engine: {
        Args: {
          p_tenant_id: string
          p_fiscal_year: number
          p_industry_vertical: string
          p_region_code: string
        }
        Returns: Json
      }
    }
    Enums: {
      user_role: "admin" | "manager" | "cashier" | "accountant" | "dsr" | "architect" | "commander" | "warehouse_manager" | "hr_manager"
      transaction_status: "draft" | "posted" | "canceled"
      payroll_status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED"
      sacco_txn_type: "DEPOSIT" | "WITHDRAWAL" | "LOAN_DISBURSEMENT" | "LOAN_REPAYMENT" | "SHARE_PURCHASE" | "WRITE_OFF"
      transaction_category: "Sale" | "Float Deposit" | "Float Withdrawal" | "Expense"
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T]