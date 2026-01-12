import React from 'react';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import GeneralJournalTable from '@/components/accounting/GeneralJournalTable';

/**
 * Enterprise Server Function: Fetch Journal
 * Aligned with the confirmed schema: 
 * - Header: accounting_transactions
 * - Lines: accounting_journal_entries
 */
async function getJournalEntries(supabase: any, businessId: string) {
    const { data, error } = await supabase
        .from('accounting_transactions')
        .select(`
            *,
            lines: accounting_journal_entries (
                id,
                description,
                debit,
                credit,
                account: accounting_accounts (name, code)
            )
        `)
        .eq('business_id', businessId)
        .order('date', { ascending: false });

    if (error) {
        console.error("Critical Journal Sync Error:", error);
        return [];
    }

    return data || [];
}

export default async function GeneralJournalPage({ params: { locale } }: { params: { locale: string } }) {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    
    // 1. Auth Handshake
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect(`/${locale}/auth/login`);

    // 2. Tenancy Handshake
    const { data: profile } = await supabase
        .from("profiles")
        .select("business_id")
        .eq("id", user.id)
        .single();

    if (!profile?.business_id) {
        return <div className="p-10 text-center font-bold text-red-600">Unauthorized Access: Tenant ID Missing</div>;
    }

    // 3. Data Hydration
    const entries = await getJournalEntries(supabase, profile.business_id);

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 bg-slate-50/30 min-h-screen">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h2 className="text-3xl font-extrabold tracking-tight">General Journal</h2>
                    <p className="text-muted-foreground">
                        Authorized double-entry bookkeeping and ledger adjustments.
                    </p>
                </div>
            </div>
            
            {/* userId is now correctly passed to a component that expects it */}
            <GeneralJournalTable 
                initialEntries={entries} 
                businessId={profile.business_id}
                userId={user.id} 
            />
        </div>
    );
}