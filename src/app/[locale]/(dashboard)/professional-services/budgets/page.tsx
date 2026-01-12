import React from 'react';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import BudgetManager from '@/components/professional-services/budgets/BudgetManager';
import { Account } from '@/lib/types';

export const metadata = {
  title: "Project Budgets | Enterprise ERP",
  description: "Track estimated vs actual costs and profitability.",
};

// Force dynamic to ensure ledger updates reflect in the budget immediately
export const dynamic = 'force-dynamic';

/**
 * Enterprise Server Function: Fetch Accounts
 * Purpose: Provides the Chart of Accounts to the Budget Manager for manual allocation.
 */
async function getAccounts(supabase: any, businessId: string): Promise<Account[]> {
    const { data, error } = await supabase
        .from('accounting_accounts')
        .select('id, name, code, type')
        .eq('business_id', businessId)
        .eq('is_active', true)
        .order('code', { ascending: true });
    
    if (error) {
        console.error("ERP Budget Sync Error (Accounts):", error);
        return [];
    }
    return data || [];
}

export default async function BudgetsPage({ params: { locale } }: { params: { locale: string } }) {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    
    // 1. Auth Handshake
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect(`/${locale}/auth/login`);

    // 2. Tenancy Validation
    const { data: profile } = await supabase
        .from("profiles")
        .select("business_id")
        .eq("id", user.id)
        .single();

    if (!profile?.business_id) {
        return (
            <div className="p-8 text-center border-2 border-dashed border-red-200 m-8 rounded-3xl bg-red-50/50">
                <h3 className="text-xl font-black text-red-800 uppercase tracking-tighter">Access Restricted</h3>
                <p className="text-sm text-red-600 mt-2">Your profile is not associated with an active enterprise tenant.</p>
            </div>
        );
    }

    // 3. High-Performance Server-Side Hydration
    const accounts = await getAccounts(supabase, profile.business_id);

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 bg-slate-50/30 min-h-screen">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">Project Budgets</h2>
                    <p className="text-muted-foreground">
                        Comprehensive monitoring of estimated vs actual costs and project profitability.
                    </p>
                </div>
            </div>
            
            {/* 
               FIXED PROP: Changed tenantId to businessId to match the component signature.
               ALSO: Passed initialAccounts so the "New Budget" wizard is ready immediately.
            */}
            <BudgetManager 
                initialAccounts={accounts} 
                businessId={profile.business_id} 
            />
        </div>
    );
}