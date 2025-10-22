// WARNING: This is a minimal, hand-mocked version of the Database type
// created because the Supabase CLI was not accessible.
// For full type safety, you MUST install and use the Supabase CLI to generate the real file.
// Real command: supabase gen types typescript --project-id "oezlqscjymzoeizysljp" > src/types/supabase.ts

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
      /**
       * Definition for the payroll_runs table based on usage in PayrollHistoryTable.tsx
       */
      payroll_runs: {
        Row: {
          // Columns required by PayrollHistoryTable.tsx:
          id: number 
          period_start: string 
          period_end: string 
          created_at: string 
          status: 'PENDING_APPROVAL' | 'APPROVED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | string
          
          // Index signature for other, unknown columns (like tenant_id)
          [key: string]: any 
        }
        Insert: Record<string, unknown>
        Update: Record<string, unknown>
      }

      // Minimal mock for other tables referenced in the server action to pass compilation:
      tenants: { Row: Record<string, any> }
      employees: { Row: Record<string, any> }
      payroll_elements: { Row: Record<string, any> }
      payslips: { Row: Record<string, any> }
      payslip_details: { Row: Record<string, any> }
      
      // Index signature to allow other tables
      [key: string]: any
    }
    // Index signature to allow other schema objects like Views and Functions
    [key: string]: any
  }
  // Index signature to allow other database schemas
  [key: string]: any
}