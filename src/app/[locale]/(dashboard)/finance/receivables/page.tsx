import React from 'react';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AgedReceivablesTable, { Invoice } from '@/components/accounting/AgedReceivablesTable';

async function getOpenInvoices(supabase: any, businessId: string) {
    // Fetch all invoices that are NOT fully paid
    const { data, error } = await supabase
        .from('accounting_invoices')
        .select(`
            id, 
            customer_name, 
            invoice_number,
            amount_due: total_amount, -- Aliasing for compatibility with your component logic
            amount_paid,
            total_amount,
            due_date, 
            currency, 
            status
        `)
        .eq('business_id', businessId)
        .neq('status', 'paid')
        .order('due_date', { ascending: true });

    if (error) {
        console.error("Error fetching receivables:", error);
        return [];
    }

    // Transform data to ensure 'amount_due' is accurate based on partial payments
    return data.map((inv: any) => ({
        ...inv,
        amount_due: inv.total_amount - inv.amount_paid
    }));
}

export default async function ReceivablesPage({ params: { locale } }: { params: { locale: string } }) {
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

    const invoices = await getOpenInvoices(supabase, profile.business_id);

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h2 className="text-3xl font-bold tracking-tight">Accounts Receivable</h2>
                    <p className="text-muted-foreground">
                        Track outstanding invoices and analyze aging reports.
                    </p>
                </div>
            </div>
            
            <AgedReceivablesTable 
                initialInvoices={invoices} 
                businessId={profile.business_id} 
            />
        </div>
    );
}