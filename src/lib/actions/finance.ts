"use server"; // CRITICAL: This allows Client Components to call these functions safely.

import { cookies } from 'next/headers'; 
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

/**
 * Enterprise Financial Data Fetcher
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

  if (error) throw new Error("Financial Synchronization Failed");
  return data;
}

/**
 * ENTERPRISE HANDSHAKE: Record Direct Income
 * Connects the UI to the Sovereign SQL Engine.
 */
export async function postDirectIncomeAction(payload: {
    businessId: string;
    customerId?: string;
    agentId: string;        // ADDED: Needed for Sales attribution
    locationId: string;
    bankAccountId: string;
    revenueAccountId: string; // ADDED: Needed for P&L categorization
    currency: string;
    date: string;
    items: any[];
    totalAmount: number;
    taxAmount: number;
}) {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    const { data, error } = await supabase.rpc('record_direct_income_enterprise_v2', {
        p_business_id: payload.businessId,
        p_customer_id: payload.customerId || null,
        p_agent_id: payload.agentId,
        p_location_id: payload.locationId,
        p_bank_account_id: payload.bankAccountId,
        p_revenue_account_id: payload.revenueAccountId,
        p_currency: payload.currency,
        p_date: payload.date,
        p_items: payload.items,
        p_total_amount: payload.totalAmount,
        p_tax_amount: payload.taxAmount
    });

    if (error) {
        console.error('Enterprise Handshake Failure:', error.message);
        return { success: false, message: error.message };
    }

    // Refresh UI paths
    revalidatePath('/finance/receivables');
    revalidatePath('/invoicing/all-invoices');
    
    return { success: true, data };
}