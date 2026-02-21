import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import KycAmlMonitor from '@/components/compliance/KycAmlMonitor';
import { UserCheck, ShieldAlert, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default async function KycAmlPage() {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    // 1. HARD SECURITY GUARD
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) redirect('/login');

    // 2. IDENTITY RESOLUTION
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
                    <AlertTitle>Fiduciary Violation</AlertTitle>
                    <AlertDescription>User session is not linked to a registered business entity for AML screening.</AlertDescription>
                </Alert>
            </div>
        );
    }

    // @ts-ignore
    const entityName = profile.organizations?.name || "Sovereign Entity";

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 animate-in slide-in-from-right-2 duration-700">
            {/* Intelligence Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
                        <UserCheck className="w-8 h-8 text-blue-600" />
                        KYC & AML Monitor
                    </h1>
                    <p className="text-muted-foreground mt-1 uppercase text-[10px] font-bold tracking-widest">
                        Anti-Money Laundering Surveillance for: <span className="text-blue-600">{entityName}</span>
                    </p>
                </div>
                <div className="flex flex-col items-end border-l pl-4 border-slate-200">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none">Risk Level</span>
                    <div className="flex items-center gap-1.5 mt-1">
                        <ShieldAlert size={14} className="text-blue-500 animate-pulse" />
                        <span className="text-xs font-bold text-blue-700">Sanctions Scan Active</span>
                    </div>
                </div>
            </div>

            {/* Main Risk Scoring Interface */}
            <KycAmlMonitor businessId={profile.business_id} />

            {/* Professional Legal Footer */}
            <p className="text-[10px] text-center text-muted-foreground mt-12 uppercase tracking-widest opacity-50">
                All identity verifications are cross-referenced with OFAC, UN, and EU Sanctions watchlists in real-time.
            </p>
        </div>
    );
}