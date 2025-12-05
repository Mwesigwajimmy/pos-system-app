import React from 'react';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import TaxReturnsTable, { TaxReturn } from '@/components/accounting/TaxReturnsTable';

// Fetch Tax Returns from DB
async function getTaxReturns(supabase: any, businessId: string) {
    const { data, error } = await supabase
        .from('accounting_tax_returns')
        .select('*')
        .eq('business_id', businessId)
        .order('fiscal_year', { ascending: false })
        .order('end_date', { ascending: false });

    if (error) {
        console.error("Error fetching tax returns:", error);
        return [];
    }
    return data;
}

export default async function TaxReturnsPage({ params: { locale } }: { params: { locale: string } }) {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    
    // 1. Auth & Tenancy
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect(`/${locale}/auth/login`);

    const { data: profile } = await supabase
        .from("profiles")
        .select("business_id")
        .eq("id", user.id)
        .single();

    if (!profile?.business_id) return <div className="p-8 text-red-500">Unauthorized Access</div>;

    // 2. Fetch Data
    const returns = await getTaxReturns(supabase, profile.business_id);

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h2 className="text-3xl font-bold tracking-tight">Tax & Compliance</h2>
                    <p className="text-muted-foreground">
                        Manage VAT, GST, and Corporate Tax filings across all entities.
                    </p>
                </div>
            </div>
            
            <TaxReturnsTable 
                initialReturns={returns} 
                businessId={profile.business_id}
                userId={user.id} 
            />
        </div>
    );
}