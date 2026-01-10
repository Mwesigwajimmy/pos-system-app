import React from 'react';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import ReconciliationClient from '@/components/accounting/ReconciliationClient';

export default async function ReconciliationPage({ params: { locale } }: { params: { locale: string } }) {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    
    // 1. Authenticate User
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect(`/${locale}/auth/login`);

    // 2. Fetch Business Profile
    const { data: profile } = await supabase
        .from("profiles")
        .select("business_id")
        .eq("id", user.id)
        .single();

    if (!profile?.business_id) {
        return <div className="p-8">Access Denied: No business profile found.</div>;
    }

    // 3. Fetch Bank Accounts (Required for bankAccountId prop)
    const { data: accounts } = await supabase
        .from('accounting_accounts')
        .select('id, name')
        .eq('business_id', profile.business_id)
        .eq('type', 'Bank')
        .eq('is_reconcilable', true) 
        .eq('is_active', true)
        .order('name');

    // 4. Pass data to Client Component
    return (
        <ReconciliationClient 
            userId={user.id}
            businessId={profile.business_id}
            accounts={accounts || []}
        />
    );
}