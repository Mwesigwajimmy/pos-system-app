import React from 'react';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import TaxReturnsTable, { TaxReturn } from '@/components/accounting/TaxReturnsTable';

/**
 * ENTERPRISE DATA FETCHING ENGINE
 * Optimized to pull net liabilities across all global entities.
 */
async function getTaxReturns(supabase: any, businessId: string): Promise<TaxReturn[]> {
    const { data, error } = await supabase
        .from('accounting_tax_returns')
        .select('*')
        .eq('business_id', businessId)
        // Order by date first (standard accounting view), then by tax type
        .order('end_date', { ascending: false })
        .order('tax_type', { ascending: true });

    if (error) {
        console.error("[Enterprise Tax] Error fetching returns:", error.message);
        return [];
    }
    return data as TaxReturn[];
}

export default async function TaxReturnsPage({ params: { locale } }: { params: { locale: string } }) {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    
    // 1. AUTHENTICATION & SECURE IDENTITY RESOLUTION
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    // Redirect if session is expired or invalid
    if (authError || !user) {
        redirect(`/${locale}/auth/login`);
    }

    // 2. MULTI-TENANT CONTEXT ENFORCEMENT
    // We fetch the business identity directly from the profiles table (The Source of Truth)
    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("business_id, role")
        .eq("id", user.id)
        .single();

    if (profileError || !profile?.business_id) {
        return (
            <div className="flex items-center justify-center min-h-[400px] p-8">
                <div className="text-center space-y-4">
                    <h1 className="text-2xl font-bold text-red-600">Unauthorized Access</h1>
                    <p className="text-muted-foreground">Your account is not linked to a valid business entity.</p>
                </div>
            </div>
        );
    }

    // 3. CORE DATA RETRIEVAL (Ledger-Integrated)
    // This pulls data populated by the new SQL connectors (POS, Inventory, Expenses)
    const returns = await getTaxReturns(supabase, profile.business_id);

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
            {/* ENTERPRISE HEADER SECTION */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b pb-6">
                <div className="space-y-1">
                    <h2 className="text-3xl font-bold tracking-tight">Tax & Compliance</h2>
                    <p className="text-sm text-muted-foreground">
                        Centralized management for VAT, GST, and Corporate Tax liabilities across all global entities.
                    </p>
                </div>
                
                {/* Visual indicator of data isolation */}
                <div className="px-3 py-1 bg-primary/10 border border-primary/20 rounded-full">
                    <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                        Secure Tenant: {profile.business_id.split('-')[0]}...
                    </span>
                </div>
            </div>
            
            {/* MAIN INTERCONNECTED TABLE 
                This component handles the 'Run Tax Report' RPC call to sync POS/Inventory/GL 
            */}
            <div className="grid gap-4">
                <TaxReturnsTable 
                    initialReturns={returns} 
                    businessId={profile.business_id}
                    userId={user.id} 
                />
            </div>

            {/* COMPLIANCE FOOTER */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground pt-4 border-t">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <span>Live Ledger Synchronization Active • All figures based on POSTED journal entries.</span>
            </div>
        </div>
    );
}