// src/lib/actions/finance.ts
import { cookies } from 'next/headers'; // FIX: Required for server-side authentication
import { createClient } from '@/lib/supabase/server';

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
  // FIX: Pass cookies() to initialize the authenticated session
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  
  /**
   * ENTERPRISE RPC EXECUTION:
   * This calls our v2 engine which calculates current/previous 
   * periods and 6-month trends in a single ACID-compliant trip.
   */
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