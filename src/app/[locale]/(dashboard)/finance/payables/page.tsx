import React from 'react';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AgedPayablesTable, { Bill } from '@/components/accounting/AgedPayablesTable';

async function getOpenBills(supabase: any, businessId: string) {
    // Fetch all bills that are NOT fully paid
    const { data, error } = await supabase
        .from('accounting_bills')
        .select(`
            id, 
            vendor_name, 
            reference_number,
            total_amount,
            amount_paid,
            due_date, 
            currency, 
            status
        `)
        .eq('business_id', businessId)
        .neq('status', 'paid')
        .order('due_date', { ascending: true });

    if (error) {
        console.error("Error fetching payables:", error);
        return [];
    }

    // Transform data: Calculate current amount_due server-side
    return data.map((bill: any) => ({
        ...bill,
        amount_due: bill.total_amount - bill.amount_paid
    }));
}

export default async function PayablesPage({ params: { locale } }: { params: { locale: string } }) {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    
    // 1. Auth & Tenancy Check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect(`/${locale}/auth/login`);

    const { data: profile } = await supabase
        .from("profiles")
        .select("business_id")
        .eq("id", user.id)
        .single();

    if (!profile?.business_id) return <div>Unauthorized</div>;

    // 2. Fetch Data
    const bills = await getOpenBills(supabase, profile.business_id);

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h2 className="text-3xl font-bold tracking-tight">Accounts Payable</h2>
                    <p className="text-muted-foreground">
                        Manage outstanding vendor bills and analyze aging liabilities.
                    </p>
                </div>
            </div>
            
            <AgedPayablesTable 
                initialBills={bills} 
                businessId={profile.business_id} 
            />
        </div>
    );
}