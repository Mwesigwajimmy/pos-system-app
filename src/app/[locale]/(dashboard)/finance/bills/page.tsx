import React from 'react';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server'; // Ensure this path is correct for your project
import { redirect } from 'next/navigation';
import BillsDataTable from '@/components/accounting/BillsDataTable';

// Server Action to fetch initial data
async function getBills(supabase: any, businessId: string) {
    const { data, error } = await supabase
        .from('accounting_bills')
        .select('*')
        .eq('business_id', businessId)
        .order('due_date', { ascending: true });
        
    if (error) {
        console.error("Error fetching bills:", error);
        return [];
    }
    return data || [];
}

export default async function BillsPage({ params: { locale } }: { params: { locale: string } }) {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    
    // 1. Auth Check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect(`/${locale}/auth/login`);

    // 2. Tenancy/Profile Check
    const { data: profile } = await supabase
        .from("profiles")
        .select("business_id")
        .eq("id", user.id)
        .single();

    if (!profile?.business_id) {
        return (
            <div className="p-8 text-red-500 border border-red-200 rounded-lg m-4 bg-red-50">
                <h3 className="font-bold">Access Denied</h3>
                <p>No business profile associated with this account.</p>
            </div>
        );
    }

    // 3. Fetch Data Server Side
    const bills = await getBills(supabase, profile.business_id);

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h2 className="text-3xl font-bold tracking-tight">Bills & Payables</h2>
                    <p className="text-muted-foreground">
                        Manage vendor bills, track payments, and handle accounts payable.
                    </p>
                </div>
            </div>
            
            {/* Pass data and businessId to client component */}
            <BillsDataTable 
                initialBills={bills} 
                businessId={profile.business_id} 
            />
        </div>
    );
}