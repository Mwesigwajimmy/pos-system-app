'use server'

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { SaccoMember, SaccoTransaction, SaccoShare, SaccoStats, SaccoDividend, SaccoContribution } from '@/lib/types';

// Utility to get authenticated client
async function getAuthClient() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    throw new Error('Unauthorized: Please log in to access SACCO records.');
  }
  return { supabase, user };
}

// --- ANALYTICS ---
export async function getSaccoAnalytics(): Promise<SaccoStats> {
  const { supabase } = await getAuthClient();
  
  // Using RPC for performance on heavy aggregations
  const { data, error } = await supabase.rpc('get_sacco_dashboard_kpis');
  
  if (error) {
    console.error('Analytics Fetch Error:', error);
    // Return safe defaults for UI stability
    return { totalAssets: 0, activeMembers: 0, loanPortfolio: 0, monthlyRevenue: 0, liquidityRatio: 0 };
  }
  return data;
}

// --- SHARES ---
export async function getShareLedger(): Promise<SaccoShare[]> {
  const { supabase } = await getAuthClient();
  
  const { data, error } = await supabase
    .from('sacco_shares')
    .select('*, members:sacco_members(full_name)')
    .order('purchase_date', { ascending: false });

  if (error) throw new Error(error.message);
  return data as any;
}

// --- DIVIDENDS ---
export async function getDividends(): Promise<SaccoDividend[]> {
  const { supabase } = await getAuthClient();
  
  const { data, error } = await supabase
    .from('sacco_dividends')
    .select('*')
    .order('period_year', { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

// --- TRANSACTIONS ---
export async function getSaccoTransactions(limit = 100): Promise<SaccoTransaction[]> {
  const { supabase } = await getAuthClient();
  
  const { data, error } = await supabase
    .from('sacco_transactions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return data;
}

// --- CONTRIBUTIONS ---
export async function getContributions(): Promise<SaccoContribution[]> {
  const { supabase } = await getAuthClient();
  
  const { data, error } = await supabase
    .from('sacco_contributions')
    .select('*')
    .order('period', { ascending: false });
    
  if (error) throw new Error(error.message);
  return data;
}

// --- KYC ---
export async function getPendingKYC() {
  const { supabase } = await getAuthClient();
  const { data, error } = await supabase
    .from('sacco_kyc_requests')
    .select('*')
    .eq('status', 'PENDING');
    
  if (error) throw new Error(error.message);
  return data;
}