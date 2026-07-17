// src/lib/actions/finance.ts
import { cookies } from 'next/headers'; 
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache'; // ADDED: Required to refresh the UI after posting

/**
 * Enterprise Financial Data Fetcher
 * Aggregates Ledger, P&L, and Trends for a specific tenant context.
 */
export async function getFinanceData(
    fromDate: string, 
    toDate: string, 
    locationId?: string, 
    projectId?: string
) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  
  const { data, error } = await supabase.rpc('get_enterprise_financial_hub_v2', {
      p_from: fromDate,
      p_to: toDate,
      p_location_id: locationId || null,
      p_project_id: projectId || null
  });

  if (error) {
    console.error("Ledger Sync Failure:", error.message);
    throw new Error("Financial Synchronization Failed: Ensure tenant ledger is active.");
  }

  return data;
}

/**
 * ENTERPRISE HANDSHAKE: Record Direct Income
 * Connects the UI to the Sovereign SQL Engine to create Invoices and Ledger Entries.
 */
export async function postDirectIncomeAction(payload: {
    businessId: string;
    customerId?: string;
    locationId: string;
    bankAccountId: string;
    currency: string;
    date: string;
    items: any[];
    totalAmount: number;
    taxAmount: number;
}) {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    // Call the Sovereign Engine RPC v2 we just created
    const { data, error } = await supabase.rpc('record_direct_income_enterprise_v2', {
        p_business_id: payload.businessId,
        p_customer_id: payload.customerId || null,
        p_location_id: payload.locationId,
        p_bank_account_id: payload.bankAccountId,
        p_currency: payload.currency,
        p_date: payload.date,
        p_items: payload.items, // JSON array of line items (Products + Taxes)
        p_total_amount: payload.totalAmount,
        p_tax_amount: payload.taxAmount
    });

    if (error) {
        console.error('Enterprise Handshake Failure:', error.message);
        return { success: false, message: error.message };
    }

    // This ensures that the 'All Invoices' list and 'Receivables' update immediately
    revalidatePath('/finance/receivables');
    revalidatePath('/invoicing/all-invoices');
    
    return { success: true, data };
}