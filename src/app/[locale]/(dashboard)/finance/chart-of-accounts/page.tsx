import React from 'react';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import ChartOfAccounts from '@/components/accounting/ChartOfAccounts';

export default async function ChartOfAccountsPage({ params: { locale } }: { params: { locale: string } }) {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect(`/${locale}/auth/login`);

    const { data: profile } = await supabase
        .from("profiles")
        .select("business_id")
        .eq("id", user.id)
        .single();

    if (!profile?.business_id) return <div className="p-8">Unauthorized access.</div>;

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h2 className="text-3xl font-bold tracking-tight">Chart of Accounts</h2>
                    <p className="text-muted-foreground">
                        Manage your general ledger accounts, bank accounts, and financial structure.
                    </p>
                </div>
            </div>
            
            <ChartOfAccounts businessId={profile.business_id} />
        </div>
    );
}