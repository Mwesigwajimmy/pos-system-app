import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import BudgetManager from "@/components/management/BudgetManager";
import { Account } from '@/lib/types';

export const metadata = {
  title: "Budget Command Center | Enterprise ERP",
  description: "Strategic financial planning and real-time performance analysis.",
};

// Ensure real-time budget data
export const dynamic = 'force-dynamic';

async function getAccounts(supabase: any, businessId: string): Promise<Account[]> {
    const { data, error } = await supabase
        .from('accounting_accounts') // Using the confirmed accounting table
        .select('id, name, type, code') // ADDED 'code' to match the component type
        .eq('business_id', businessId)
        .order('code', { ascending: true });
    
    if (error) {
        console.error("ERP Account Fetch Error:", error);
        return [];
    }
    return data || [];
}

export default async function BudgetsPage({ params: { locale } }: { params: { locale: string } }) {
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

    if (!profile?.business_id) return <div className="p-10 text-center font-bold text-red-600">Access Denied: No Tenant ID</div>;

    // 3. Hydrate Data
    const accounts = await getAccounts(supabase, profile.business_id);
    
    // 4. Return Interconnected Component
    // businessId is now passed to resolve the component signature
    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 bg-slate-50/30 min-h-screen">
            <BudgetManager 
                initialAccounts={accounts} 
                businessId={profile.business_id} 
            />
        </div>
    );
}