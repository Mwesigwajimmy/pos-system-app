import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import LicensesPermitsManager from '@/components/compliance/LicensesPermitsManager';
import { KeyRound, ShieldCheck, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default async function PermitsPage() {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    // 1. AUTH GUARD
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) redirect('/login');

    // 2. CONTEXT RESOLUTION
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select(`
            business_id,
            organizations ( name )
        `)
        .eq('id', user.id)
        .single();

    if (profileError || !profile?.business_id) {
        return (
            <div className="p-8">
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Context Resolution Failure</AlertTitle>
                    <AlertDescription>Your session is not linked to an active entity for permit tracking.</AlertDescription>
                </Alert>
            </div>
        );
    }

    // @ts-ignore
    const entityName = profile.organizations?.name || "Sovereign Entity";

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
                        <KeyRound className="w-8 h-8 text-blue-600" />
                        Licenses & Permits
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm font-medium italic">
                        Statutory operating licenses and permit renewals for: <span className="text-blue-600">{entityName}</span>
                    </p>
                </div>
                <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 px-4 py-2 rounded-lg">
                    <ShieldCheck size={16} className="text-blue-600" />
                    <span className="text-[10px] font-black text-blue-800 uppercase tracking-widest leading-none">Continuity Active</span>
                </div>
            </div>

            <LicensesPermitsManager businessId={profile.business_id} />
        </div>
    );
}