import React from 'react';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
// UPGRADE: Use the Client Wrapper that contains all the interconnected reports
import BillsPageClient from '@/components/accounting/BillsPageClient'; 

// Force dynamic ensures we always see live Ledger data
export const dynamic = 'force-dynamic';

/**
 * Enterprise Fetch: Scoped to Business ID
 * This retrieves the bills that will populate the Table AND the Aged Payables report.
 */
async function getBills(supabase: any, businessId: string) {
    const { data, error } = await supabase
        .from('accounting_bills')
        .select('*')
        .eq('business_id', businessId)
        .order('due_date', { ascending: true });
        
    if (error) {
        console.error("System Fetch Error:", error);
        return [];
    }
    return data || [];
}

export default async function BillsPage({ params: { locale } }: { params: { locale: string } }) {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    
    // 1. Authentication Handshake
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect(`/${locale}/auth/login`);

    // 2. Multi-Tenant Tenancy Validation
    const { data: profile } = await supabase
        .from("profiles")
        .select("business_id")
        .eq("id", user.id)
        .single();

    if (!profile?.business_id) {
        return (
            <div className="p-8 text-red-500 border border-red-200 rounded-xl m-4 bg-red-50 text-center">
                <h3 className="font-bold text-xl">Access Restriction</h3>
                <p>This account is not linked to a valid business entity.</p>
            </div>
        );
    }

    // 3. Server-Side Data Loading
    const bills = await getBills(supabase, profile.business_id);

    // 4. THE INTERCONNECT: 
    // We return the BillsPageClient because it contains:
    // - The Bills List
    // - The Aged Payables Report (connected to the same data)
    // - The Procurement Tabs
    return (
        <BillsPageClient 
            initialBills={bills} 
            businessId={profile.business_id} 
        />
    );
}