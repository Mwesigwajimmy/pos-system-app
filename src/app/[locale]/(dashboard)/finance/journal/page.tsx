import React from 'react';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import GeneralJournalTable from '@/components/accounting/GeneralJournalTable';

async function getJournalEntries(supabase: any, businessId: string) {
    // Fetch Entries with their Lines and Account Names
    const { data, error } = await supabase
        .from('accounting_journal_entries')
        .select(`
            *,
            lines: accounting_journal_lines (
                id,
                description,
                debit,
                credit,
                account: accounting_accounts (name, code)
            )
        `)
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching journal:", error);
        return [];
    }

    return data;
}

export default async function GeneralJournalPage({ params: { locale } }: { params: { locale: string } }) {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect(`/${locale}/auth/login`);

    const { data: profile } = await supabase
        .from("profiles")
        .select("business_id")
        .eq("id", user.id)
        .single();

    if (!profile?.business_id) return <div>Unauthorized</div>;

    const entries = await getJournalEntries(supabase, profile.business_id);

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h2 className="text-3xl font-bold tracking-tight">General Journal</h2>
                    <p className="text-muted-foreground">
                        Record manual journal entries and view the general ledger.
                    </p>
                </div>
            </div>
            
            <GeneralJournalTable 
                initialEntries={entries} 
                businessId={profile.business_id}
                userId={user.id} 
            />
        </div>
    );
}