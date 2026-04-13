import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { RevolutionarySalesTaxDashboard } from '@/components/compliance/RevolutionarySalesTaxDashboard';
import { Calculator, Globe, ShieldCheck } from 'lucide-react';

interface PageProps {
  params: {
    locale: string;
  };
}

export default async function SalesTaxIntelligencePage({ params }: PageProps) {
    const { locale } = params;
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    // 1. SECURE AUTHENTICATION HANDSHAKE
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) redirect(`/${locale}/auth/login`);

    // 2. SOVEREIGN CONTEXT RESOLUTION (Fetching Profile & Tenant Identity)
    const { data: profile } = await supabase
        .from("profiles")
        .select("business_id, business_name, business_type, tenants(name, currency_code)")
        .eq("id", user.id)
        .maybeSingle();

    if (!profile?.business_id) redirect(`/${locale}/welcome`);

    const bizId = profile.business_id;
    const reportingCurrency = (profile.tenants as any)?.currency_code || 'UGX';

    // 3. PARALLEL FORENSIC DATA ACQUISITION
    // We fetch the Summary (RPC) and the detailed Transaction Log (View) simultaneously
    const [reportRes, logRes] = await Promise.all([
        supabase.rpc('generate_tax_report', { 
            p_start_date: '2024-01-01', 
            p_end_date: '2026-12-31', 
            p_entity_id: bizId     
        }),
        supabase
            .from('view_global_tax_report')
            .select('*')
            .eq('business_id', bizId)
            .order('transaction_date', { ascending: false })
            .limit(50)
    ]);

    const reportData = reportRes.data;

    // 4. TRANSACTION MAPPING (Weld Logic)
    // We map the raw database view columns to the React component's interface
    const mappedTransactions = logRes.data?.map((tx: any) => ({
        id: tx.transaction_ref,
        date: tx.transaction_date,
        description: `${tx.source_module}: ${tx.transaction_ref}`,
        invoice_id: tx.transaction_ref,
        taxable_amount: Number(tx.taxable_base),
        tax_collected: Number(tx.tax_amount),
        tax_rate: (Number(tx.tax_amount) / (Number(tx.taxable_base) || 1) * 100).toFixed(1),
        category_code: tx.tax_category
    })) || [];

    return (
        <div className="flex-1 space-y-8 p-6 md:p-10 pt-8 bg-[#F8FAFC] animate-in fade-in duration-700">
            {/* MASTER HEADER - Straight & Professional UI */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-b border-slate-200 pb-10">
                <div className="space-y-1">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-slate-900 rounded-2xl shadow-xl text-white">
                            <Calculator className="h-8 w-8" strokeWidth={2.5} />
                        </div>
                        <h1 className="text-4xl font-black tracking-tighter text-slate-900 uppercase">
                            Tax Intelligence
                        </h1>
                    </div>
                    {/* FIXED: Removed italic, used professional uppercase font style */}
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                        <ShieldCheck size={14} className="text-blue-600" />
                        Forensic Jurisdictional Analysis for {profile.business_name || (profile.tenants as any)?.name}
                    </p>
                </div>
                
                <div className="flex items-center gap-4 bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
                    <Globe className="h-6 w-6 text-blue-500 animate-pulse" />
                    <div className="flex flex-col">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Fiscal Status</span>
                        <span className="text-xs font-bold text-slate-900 uppercase mt-1">Multi-Sector Active</span>
                    </div>
                </div>
            </div>
            
            {/* INJECTION POINT: Real Data Feed */}
            <div className="max-w-7xl">
                <RevolutionarySalesTaxDashboard 
                    summary={{
                        total_revenue: Number(reportData?.total_revenue || 0),
                        total_taxable_revenue: Number(reportData?.total_taxable_revenue || 0),
                        total_tax_collected: Number(reportData?.total_tax_collected || 0),
                        total_input_tax_credit: Number(reportData?.total_input_tax_credit || 0),
                        net_tax_liability: Number(reportData?.net_tax_liability || 0),
                        industry_context: reportData?.industry_context || profile.business_type
                    }}
                    transactions={mappedTransactions} 
                    reportPeriod="Operational Cycle 2024 - 2026"
                    currency={reportingCurrency} 
                    businessName={profile.business_name || 'Business Unit'}
                />
            </div>

            {/* SYSTEM FOOTER */}
            <div className="pt-10 opacity-30 text-center">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em]">
                    Sovereign Ledger System • Forensic Parity Verified • Secure Handshake v10.2
                </p>
            </div>
        </div>
    );
}