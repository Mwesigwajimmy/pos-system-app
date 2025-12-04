import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import GeneralLedgerView from '@/components/professional-services/accounting/GeneralLedgerView';

export default async function AccountingPage({ params: { locale } }: { params: { locale: string } }) {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect(`/${locale}/auth/login`);

    const { data: profile } = await supabase
        .from("profiles")
        .select("business_id, currency") 
        .eq("id", user.id)
        .single();

    if (!profile?.business_id) return <div className="p-8">Unauthorized.</div>;

    const userCurrency = profile.currency || 'USD';

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h2 className="text-3xl font-bold tracking-tight">General Ledger</h2>
                    <p className="text-muted-foreground">Chart of Accounts, Journal Entries, and Financial Records.</p>
                </div>
            </div>
            {/* FIX: Removed initialData since the component doesn't accept it yet */}
            <GeneralLedgerView 
                tenantId={profile.business_id} 
                currency={userCurrency}
            />
        </div>
    );
}