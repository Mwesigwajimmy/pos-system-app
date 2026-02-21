import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ChartOfAccountsTable } from '@/components/accountant/ChartOfAccountsTable';
import { BookOpen, ShieldCheck, AlertCircle, ListChecks } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default async function ChartOfAccountsPage() {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    // 1. HARD SECURITY AUTHENTICATION GUARD
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) redirect('/login');

    // 2. MASTER IDENTITY RESOLUTION
    // Resolving the physical business context from the 'profiles' table
    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("business_id, business_name, active_organization_slug")
        .eq("id", user.id)
        .single();

    if (profileError || !profile?.business_id) {
        return (
            <div className="p-8">
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Fiduciary Context Failure</AlertTitle>
                    <AlertDescription>
                        Could not resolve a valid business ledger for your session. 
                        Ledger visibility is restricted.
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    const businessId = profile.business_id;
    const entityName = profile.business_name || profile.active_organization_slug || "Sovereign Entity";

    // 3. FETCH REAL LEDGER DATA (Enterprise Data Fetch)
    // We fetch the full chart of accounts for this specific business
    const { data: accounts } = await supabase
        .from('accounting_accounts') // Ensure this table exists in your DB
        .select('id, name, type, description')
        .eq('business_id', businessId)
        .order('name', { ascending: true });

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 animate-in fade-in duration-700">
            
            {/* Professional Financial Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-6">
                <div>
                    <div className="flex items-center gap-3 text-foreground">
                        <BookOpen className="w-8 h-8 text-primary" />
                        <h1 className="text-3xl font-bold tracking-tight">Chart of Accounts</h1>
                    </div>
                    <p className="text-muted-foreground mt-2">
                        Financial structure and ledger mapping for{" "}
                        <span className="font-bold text-foreground underline decoration-primary/30 underline-offset-4">
                            {entityName}
                        </span>
                    </p>
                </div>

                {/* Audit Readiness Badge */}
                <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 px-4 py-2 rounded-xl shadow-sm">
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest leading-none">Ledger Status</span>
                        <span className="text-xs font-bold text-blue-700 uppercase mt-1 flex items-center gap-1">
                             <ShieldCheck size={12} className="text-blue-600" />
                             Audit Ready
                        </span>
                    </div>
                    <ListChecks className="h-8 w-8 text-blue-600 opacity-20" />
                </div>
            </div>

            {/* Main Table Interface */}
            <div className="grid gap-6">
                <ChartOfAccountsTable 
                    // We pass the real fetched accounts array into the component
                    data={accounts || []} 
                />
            </div>

            {/* Technical Footer */}
            <div className="mt-12 pt-6 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 opacity-50">
                <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-medium leading-relaxed">
                    Sovereign Financial Kernel v10.1 // Automated Ledger Mapping
                </p>
                <div className="text-[10px] font-mono whitespace-nowrap bg-slate-100 px-2 py-1 rounded">
                   ENTITY_HASH: {businessId.substring(0,12).toUpperCase()}
                </div>
            </div>
        </div>
    );
}