import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import TrustAccountingManager from '@/components/professional-services/accounting/TrustAccountingManager';

// --- Enterprise Data Fetching ---

// 1. Fetch Configuration (Server-Side) to prevent "Sync: never" errors
async function getTrustAccountConfig(supabase: any, businessId: string) {
    const { data } = await supabase
        .from('accounting_accounts') // Linked to Unified Enterprise Table
        .select('*')
        .eq('business_id', businessId)
        .eq('name', 'Client Trust Funds')
        .single();
    
    return data;
}

// 2. Fetch Real Transactions (No Mocks)
// Connected to Clients and the Enterprise Ledger
async function getTrustTransactions(supabase: any, tenantId: string) {
    const { data } = await supabase
        .from('ps_trust_transactions')
        .select(`
            *,
            client:clients(id, first_name, last_name, company_name)
        `)
        .eq('tenant_id', tenantId)
        .order('transaction_date', { ascending: false });
        
    return data || [];
}

export default async function TrustAccountingPage({ params: { locale } }: { params: { locale: string } }) {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    
    // Auth Check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect(`/${locale}/auth/login`);

    // Profile & Business Context
    const { data: profile } = await supabase
        .from("profiles")
        .select("business_id, currency")
        .eq("id", user.id)
        .single();

    if (!profile?.business_id) return <div className="p-8">Unauthorized: No Business ID found.</div>;

    // Parallel Fetching for Performance
    // We fetch the Config AND the Transactions at the same time
    const [trustAccount, transactions] = await Promise.all([
        getTrustAccountConfig(supabase, profile.business_id),
        getTrustTransactions(supabase, profile.business_id)
    ]);

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h2 className="text-3xl font-bold tracking-tight">Trust Accounting</h2>
                    <p className="text-muted-foreground">Manage client retainers and trust funds.</p>
                </div>
            </div>
            
            {/* 
                We pass the server-fetched config down. 
                This allows the Client Component to skip the "Loading" check 
                and immediately know that the system is configured correctly.
            */}
            <TrustAccountingManager 
                tenantId={profile.business_id} 
                currency={profile.currency || 'USD'}
                trustAccountConfig={trustAccount}
                initialTransactions={transactions}
            />
        </div>
    );
}