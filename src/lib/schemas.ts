import { z } from 'zod';

/**
 * 1. TELECOM FLOAT SCHEMA
 * Matches the backend logic for telecom_float_requests and 
 * telecom_agent_floats. Added 'type' to distinguish 
 * between Issuance and Deduction.
 */
export const manageFloatSchema = z.object({
  // Coerce allows the input to be a string (from HTML) 
  // but treats it as a number for the logic.
  amount: z.coerce.number()
    .positive("Amount must be a positive number.")
    .min(100, "Minimum float transaction is 100."),
  
  type: z.enum(["DEPOSIT", "WITHDRAWAL"]),
  
  // Linked to telecom_services.id in your DB
  service_id: z.coerce.number().optional(), 
  
  notes: z.string()
    .min(3, "Notes are required for the audit trail.")
    .max(500),
});

/**
 * 2. ACCOUNTING JOURNAL SCHEMA
 * CRITICAL: This is the data that feeds your Forensic Ledger Guard.
 * If this validation fails here, the UI prevents the transaction 
 * BEFORE the trigger has to catch it.
 */
export const journalEntrySchema = z.object({
  account_id: z.string().uuid("Invalid account selection."),
  // The Forensic Guard trigger analyzes 'debit' and 'credit'
  debit: z.coerce.number().min(0).default(0),
  credit: z.coerce.number().min(0).default(0),
  description: z.string().min(5, "Detailed description required for Sovereign Audit."),
  partner_id: z.string().optional(), // Can be customer_id or vendor_id
  partner_type: z.enum(["customer", "supplier", "employee"]).optional(),
}).refine(data => (data.debit > 0 || data.credit > 0), {
  message: "Entry must have either a debit or a credit value.",
  path: ["debit"]
});

/**
 * 3. AGENT INTERFACE (Real Parity)
 * Updated to match sacco_members and telecom_agent_floats metadata.
 */
export interface Agent {
  user_id: string;
  full_name: string;
  email: string;
  is_active: boolean;
  current_float_balance: number;
  business_id: string;      // Added context parity
  member_number?: string;   // For Sacco logic
  phone_number?: string;    // For Telecom logic
}

export type ManageFloatValues = z.infer<typeof manageFloatSchema>;
export type JournalEntryValues = z.infer<typeof journalEntrySchema>;