import React from 'react';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import BillsPageClient from '@/components/accounting/BillsPageClient';

// Ensure this page is always dynamic to reflect live General Ledger changes
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Enterprise Server Function: Fetch Bills
 * Scoped strictly to business_id for multi-tenant security.
 */
async function getBills(supabase: any, businessId: string) {
    const { data, error } = await supabase
        .from('accounting_bills')
        .select('*') // This picks up bill_number, transaction_id, and currency_code
        .eq('business_id', businessId)
        .order('due_date', { ascending: true });
        
    if (error) {
        console.error("Critical Fetch Error [Bills]:", error);
        return [];
    }
    return data || [];
}

export default async function BillsPage({ params: { locale } }: { params: { locale: string } }) {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    
    // 1. Enterprise Auth Handshake
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (!user || authError) redirect(`/${locale}/auth/login`);

    // 2. Multi-Tenant Tenancy Check
    // We fetch the business_id to ensure the user only sees their own ledger.
    const { data: profile } = await supabase
        .from("profiles")
        .select("business_id")
        .eq("id", user.id)
        .single();

    if (!profile?.business_id) {
        return (
            <div className="flex items-center justify-center min-h-[400px] p-8">
                <div className="max-w-md w-full p-6 text-center border-2 border-dashed border-red-200 rounded-2xl bg-red-50/50">
                    <h3 className="text-lg font-bold text-red-800">Access Denied</h3>
                    <p className="text-sm text-red-600 mt-2">
                        Your account is not associated with an active business profile. 
                        Please contact your system administrator to link your account to a tenant.
                    </p>
                </div>
            </div>
        );
    }

    // 3. High-Performance Data Fetch
    // We fetch the bills on the server to reduce client-side loading states.
    const bills = await getBills(supabase, profile.business_id);

    // 4. Render the Interconnected Client Component
    // We pass the data and the businessId so all modals are scoped correctly.
    return (
        <BillsPageClient 
            initialBills={bills} 
            businessId={profile.business_id} 
        />
    );
}