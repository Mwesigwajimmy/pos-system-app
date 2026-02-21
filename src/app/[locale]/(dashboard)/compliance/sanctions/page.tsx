import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import SanctionsScreeningTable from '@/components/compliance/SanctionsScreeningTable';
import { Gavel, Globe, ShieldCheck } from 'lucide-react';

export default async function SanctionsPage() {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    // 1. AUTH GUARD
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    // 2. IDENTITY RESOLUTION
    const { data: profile } = await supabase
        .from('profiles')
        .select(`
            business_id,
            organizations ( name )
        `)
        .eq('id', user.id)
        .single();

    // @ts-ignore
    const entityName = profile.organizations?.name || "Sovereign Entity";

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 animate-in slide-in-from-right-2 duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
                        <Gavel className="w-8 h-8 text-slate-800" />
                        Sanctions Screening Log
                    </h1>
                    <p className="text-muted-foreground mt-1 uppercase text-[10px] font-bold tracking-[0.2em]">
                        Global Watchlist Monitoring for: {entityName}
                    </p>
                </div>
                <Globe className="h-10 w-10 text-slate-200" />
            </div>

            <SanctionsScreeningTable />

            <div className="mt-8 p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-4">
                <ShieldCheck className="h-5 w-5 text-emerald-600 mt-0.5" />
                <p className="text-[11px] text-slate-600 leading-relaxed italic">
                    Certified sanctions workflow: All parties are autonomously cross-referenced against OFAC (US), EU Financial Sanctions, and UN Security Council consolidated lists. 
                    Any matches generate an automatic Critical Anomaly in the Audit Register.
                </p>
            </div>
        </div>
    );
}