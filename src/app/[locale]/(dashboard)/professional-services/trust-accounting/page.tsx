import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import TrustAccountingManager from '@/components/professional-services/accounting/TrustAccountingManager';

async function getTrustTransactions(supabase: any, tenantId: string) {
    const { data } = await supabase
        .from('ps_trust_transactions')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('transaction_date', { ascending: false });
    return data || [];
}

export default async function TrustAccountingPage({ params: { locale } }: { params: { locale: string } }) {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect(`/${locale}/auth/login`);

    const { data: profile } = await supabase
        .from("profiles")
        .select("business_id")
        .eq("id", user.id)
        .single();

    if (!profile?.business_id) return <div className="p-8">Unauthorized.</div>;

    const transactions = await getTrustTransactions(supabase, profile.business_id);

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h2 className="text-3xl font-bold tracking-tight">Trust Accounting</h2>
                    <p className="text-muted-foreground">Manage client retainers and trust funds.</p>
                </div>
            </div>
            <TrustAccountingManager 
                tenantId={profile.business_id} 
                // Passing the data we fetched server-side
                initialTransactions={transactions}
            />
        </div>
    );
}