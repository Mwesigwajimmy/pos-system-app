import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import BankReconciliation from '@/components/compliance/BankReconciliation';
import { Landmark, ShieldCheck, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default async function BankReconciliationPage() {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    // 1. ENTERPRISE AUTH GUARD
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) redirect('/login');

    // 2. RESOLVE SOVEREIGN CONTEXT
    // Fetching the business_id and organization name in parallel for speed
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select(`
            business_id,
            organizations (
                name,
                currency_code
            )
        `)
        .eq('id', user.id)
        .single();

    if (profileError || !profile?.business_id) {
        return (
            <div className="p-8">
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Fiduciary Context Missing</AlertTitle>
                    <AlertDescription>
                        Your account is not currently linked to an active business entity. 
                        Please contact your Sovereign Administrator.
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    // @ts-ignore - handling the joined organization data
    const entityName = profile.organizations?.name || "Sovereign Entity";
    // @ts-ignore
    const currency = profile.organizations?.currency_code || "UGX";

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 animate-in fade-in duration-500">
            
            {/* High-Tier Forensic Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
                        <Landmark className="w-8 h-8 text-primary" />
                        Bank Reconciliation
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Verifying internal ledger integrity for <span className="font-bold text-foreground underline decoration-primary/30">{entityName}</span>
                    </p>
                </div>
                <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 px-4 py-2 rounded-lg">
                    <ShieldCheck size={16} className="text-blue-600" />
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-blue-800 uppercase tracking-widest leading-none">Status</span>
                        <span className="text-[10px] font-bold text-blue-600 uppercase">Fiduciary Guard Active</span>
                    </div>
                </div>
            </div>

            {/* Main Reconciliation Engine */}
            <div className="shadow-2xl shadow-primary/5 rounded-xl overflow-hidden border">
                <BankReconciliation 
                    businessId={profile.business_id} 
                    accountId="TREASURY_MAIN" 
                />
            </div>

            {/* Compliance Footer */}
            <p className="text-[10px] text-center text-muted-foreground mt-8 uppercase tracking-[0.2em] opacity-50">
                All reconciliation matches are recorded in the Immutable Audit Log.
            </p>
        </div>
    );
}