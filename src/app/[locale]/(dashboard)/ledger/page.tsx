import React from 'react';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { LedgerHub } from '@/components/ledger/LedgerHub';
import { Metadata } from 'next';

// --- Enterprise Runtime Configuration ---
// 1. Force dynamic rendering: Ledger data MUST be real-time.
// 2. Revalidate 0: Ensures no CDN or Middleware caches old balances.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
    title: 'General Ledger Explorer | Enterprise ERP',
    description: 'Audit-ready financial transaction monitoring and manual journal control.',
};

/**
 * Enterprise Server Function: Fetch Ledger Data
 * Performance: Executes on the server to eliminate client-side waterfall lag.
 * Security: Strict multi-tenant enforcement via business_id.
 */
async function getLedgerData(supabase: any, businessId: string, from?: string, to?: string) {
    let query = supabase
        .from('general_ledger_view')
        .select('*')
        .eq('business_id', businessId) // CRITICAL: Database level isolation
        .order('date', { ascending: false });

    // Date Range Logic
    if (from) query = query.gte('date', from);
    if (to) query = query.lte('date', to);

    const { data, error } = await query;

    if (error) {
        console.error("ERP Ledger Sync Error:", error.message);
        // In a production ERP, we throw to the error boundary for visibility
        return []; 
    }
    
    return data || [];
}

interface PageProps {
    params: { locale: string };
    searchParams: { from?: string, to?: string };
}

export default async function LedgerPage({ params: { locale }, searchParams }: PageProps) {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    
    // 1. AUTHORIZATION HANDSHAKE
    // Verifies the user has an active session before touching the ledger.
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (!user || authError) redirect(`/${locale}/auth/login`);

    // 2. TENANCY VALIDATION
    // Fetches the business_id. This is the "Nerve Center" of the multi-tenant system.
    const { data: profile } = await supabase
        .from('profiles')
        .select('business_id')
        .eq('id', user.id)
        .single();

    if (!profile?.business_id) {
        return (
            <div className="flex items-center justify-center min-h-[60vh] p-8">
                <div className="max-w-md w-full p-8 text-center border-2 border-dashed border-red-200 rounded-3xl bg-red-50/50 shadow-sm">
                    <h3 className="text-xl font-black text-red-800 uppercase tracking-tighter">Security Alert</h3>
                    <p className="text-sm text-red-600 mt-2 font-medium">
                        Your profile is not associated with an active enterprise tenant. 
                        Access to the General Ledger has been restricted.
                    </p>
                </div>
            </div>
        );
    }

    // 3. SERVER-SIDE DATA HYDRATION
    // We fetch the data HERE so the page feels "instant" when it loads.
    const { from, to } = searchParams;
    const entries = await getLedgerData(supabase, profile.business_id, from, to);

    // 4. INTERCONNECTED CLIENT RENDER
    // We pass the entries, the businessId (for data ops), and the userId (for the Audit Trail).
    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 bg-slate-50/30 min-h-screen">
            <LedgerHub 
                entries={entries} 
                businessId={profile.business_id} 
                userId={user.id} 
            />
        </div>
    );
}