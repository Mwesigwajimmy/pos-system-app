// src/services/api/ledgerService.ts
// This utility function is for interacting with your Supabase database.
// It assumes you have a file at `src/lib/supabase/client.ts` that exports a `createClient` function,
// which is standard practice when setting up Supabase with Next.js.
import { createClient } from '@/lib/supabase/client';

// This type is imported from the 'react-day-picker' library, which is a peer dependency
// of the shadcn/ui DatePicker. You will need to install it: `npm install react-day-picker`
import { DateRange } from 'react-day-picker';

// --- Type Imports ---
// Import shared types from a central location to ensure type consistency
// across the application. This resolves the core "is not assignable" error.
import { Account, Transaction, TransactionFilters } from '@/types/dashboard';


// --- API Functions ---

/**
 * Fetches a paginated and filtered list of transactions from the Supabase database.
 * This function is multi-tenant aware and requires an authenticated user with a business_id.
 *
 * @param filters - The filters to apply to the transaction query (date range, search, etc.).
 * @returns A promise that resolves to an object containing the list of transactions and the total count.
 */
export async function fetchTransactions(filters: TransactionFilters): Promise<{ transactions: Transaction[]; total_count: number }> {
  const supabase = createClient();

  // 1. Get the current user's session to enforce multi-tenancy.
  const { data: { user } } = await supabase.auth.getUser();

  // 2. Extract the business_id from user metadata. This is a critical security step.
  //    It's common to store this kind of information in user_metadata upon signup or org creation.
  const businessId = user?.user_metadata?.business_id;

  // 3. Security Guard: If there's no user or business_id, prevent any data from being fetched.
  if (!businessId) {
    console.error("Authorization Error: No user or business_id found for fetching transactions.");
    throw new Error("You are not authorized to view this data. Please sign in again.");
  }

  // Validate that the date range, a required filter, is complete.
  if (!filters.date?.from || !filters.date?.to) {
    throw new Error("A complete date range (from and to) is required to fetch transactions.");
  }

  const { data, error } = await supabase.rpc('get_paginated_transactions', {
    // 4. Pass the validated business_id to the RPC function to filter data at the database level.
    p_business_id: businessId,
    p_start_date: filters.date.from.toISOString().split('T')[0],
    p_end_date: filters.date.to.toISOString().split('T')[0],
    p_search_text: filters.searchText || null,
    p_account_id: filters.accountId || null,
    p_page: filters.page,
    p_page_size: filters.pageSize,
  });

  if (error) {
    // Log the detailed technical error to the console for developers.
    console.error("Supabase RPC Error fetching transactions:", error);
    // Throw a more user-friendly error to be caught by the UI.
    throw new Error("Failed to load financial transactions. Please check your connection or try again later.");
  }

  // If the RPC returns no data, provide a default empty state to prevent UI errors.
  return data || { transactions: [], total_count: 0 };
}

/**
 * Fetches all financial accounts for the current user's business from the 'accounts' table.
 * This is multi-tenant aware, filtering by the business_id from the user's session.
 *
 * @returns A promise that resolves to an array of Account objects.
 */
export async function fetchAccounts(): Promise<Account[]> {
  const supabase = createClient();

  // Get user and business_id for multi-tenancy, same as in fetchTransactions.
  const { data: { user } } = await supabase.auth.getUser();
  const businessId = user?.user_metadata?.business_id;

  if (!businessId) {
    console.error("Authorization Error: No user or business_id found for fetching accounts.");
    throw new Error("You are not authorized to view accounts.");
  }

  // This query assumes your 'accounts' table has a 'business_id' column.
  const { data, error } = await supabase
    .from('accounts')
    // FIX: Add 'type' to the select statement to match the 'Account' type.
    .select('id, name, type') 
    .eq('business_id', businessId) // Enforce Row-Level Security for multi-tenancy.
    .order('name'); // Sort alphabetically for a better user experience

  if (error) {
    console.error("Supabase Error fetching accounts:", error);
    throw new Error("Failed to load the list of accounts for filtering.");
  }

  return data || [];
}