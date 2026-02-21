import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import TaxReportGenerator from '@/components/compliance/TaxReportGenerator';
import { Calculator, Landmark, ShieldCheck } from 'lucide-react';

export default async function TaxReportsPage() {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    // 1. HARD SECURITY CHECK
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    // 2. SOVEREIGN CONTEXT
    const { data: profile } = await supabase
        .from('profiles')
        .select(`
            business_id,
            organizations ( name, currency_code, locale )
        `)
        .eq('id', user.id)
        .single();

    // @ts-ignore
    const org = profile?.organizations;

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 animate-in fade-in duration-1000">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
                        <Calculator className="w-8 h-8 text-blue-600" />
                        Sovereign Tax Engine
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Filing and liability intelligence for: <span className="font-black text-foreground">{org?.name || "Sovereign Entity"}</span>
                    </p>
                </div>
                <div className="flex flex-col items-end">
                    <div className="flex items-center gap-2 bg-blue-600 text-white px-3 py-1 rounded-md shadow-lg shadow-blue-200">
                         <Landmark size={14} />
                         <span className="text-[10px] font-black uppercase tracking-widest">{org?.currency_code || 'UGX'} Treasury Link</span>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl">
                <TaxReportGenerator 
                    businessId={profile?.business_id} 
                    currencyCode={org?.currency_code || 'UGX'}
                    locale={org?.locale || 'en-UG'}
                />
            </div>

            <div className="mt-12 flex justify-center opacity-40">
                <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.3em] text-slate-500">
                    <ShieldCheck size={12} />
                    Autonomous Jurisdictional Reporting Certified v10.1
                </div>
            </div>
        </div>
    );
}