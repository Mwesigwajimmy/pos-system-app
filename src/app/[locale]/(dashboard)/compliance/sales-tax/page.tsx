import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { RevolutionarySalesTaxDashboard } from '@/components/compliance/RevolutionarySalesTaxDashboard';
import { Calculator, Globe, ShieldCheck, Activity } from 'lucide-react';

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
    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user) redirect(`/${locale}/auth/login`);

    // 2. RESILIENT CONTEXT RESOLUTION
    // We fetch the profile first without the join to prevent the redirect loop
    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("business_id, business_name, business_type")
        .eq("id", authData.user.id)
        .maybeSingle();

    // If no business identity is found, we redirect to welcome protocol
    if (!profile?.business_id || profileError) {
        redirect(`/${locale}/welcome`);
    }

    // 3. SEPARATE TENANT DISCOVERY
    // This prevents the page from crashing if the 'tenants' record is still being provisioned
    const { data: tenant } = await supabase
        .from("tenants")
        .select("name, currency_code")
        .eq("id", profile.business_id)
        .maybeSingle();

    const bizId = profile.business_id;
    const reportingCurrency = tenant?.currency_code || 'UGX';
    const activeBusinessName = tenant?.name || profile.business_name || 'Sovereign Business Unit';

    // 4. PARALLEL FORENSIC DATA ACQUISITION
    // We execute the Summary RPC and the detailed View query simultaneously for enterprise speed
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

    // 5. TRANSACTION MAPPING (Weld Logic)
    // We transform raw database rows into the clean interface expected by your UI
    const mappedTransactions = logRes.data?.map((tx: any) => ({
        id: tx.transaction_ref || `TX-${Math.random().toString(36).substr(2, 9)}`,
        date: tx.transaction_date,
        description: `${tx.source_module || 'System'}: ${tx.transaction_ref || 'Reference Pending'}`,
        invoice_id: tx.transaction_ref || '-',
        taxable_amount: Number(tx.taxable_base || 0),
        tax_collected: Number(tx.tax_amount || 0),
        tax_rate: tx.taxable_base > 0 
            ? ((Number(tx.tax_amount) / Number(tx.taxable_base)) * 100).toFixed(1) 
            : '0.0',
        category_code: tx.tax_category || 'STANDARD'
    })) || [];

    return (
        <div className="flex-1 space-y-8 p-6 md:p-10 pt-8 bg-[#F8FAFC] animate-in fade-in duration-700">
            
            {/* MASTER HEADER - Straight & Professional Enterprise Look */}
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
                    {/* FIXED: Perfectly straight font, no italics, uppercase tracking */}
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                        <ShieldCheck size={14} className="text-blue-600" />
                        Forensic Statutory Analysis for {activeBusinessName}
                    </p>
                </div>
                
                <div className="flex items-center gap-4 bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
                    <Globe className="h-6 w-6 text-blue-500 animate-pulse" />
                    <div className="flex flex-col">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Fiscal Status</span>
                        <span className="text-xs font-bold text-slate-900 uppercase mt-1">Multi-Sector Handshake Active</span>
                    </div>
                </div>
            </div>
            
            {/* DATA INJECTION: Connecting the Dashboard to the Real Data Stream */}
            <div className="max-w-7xl">
                <RevolutionarySalesTaxDashboard 
                    summary={{
                        total_revenue: Number(reportRes.data?.total_revenue || 0),
                        total_taxable_revenue: Number(reportRes.data?.total_taxable_revenue || 0),
                        total_tax_collected: Number(reportRes.data?.total_tax_collected || 0),
                        total_input_tax_credit: Number(reportRes.data?.total_input_tax_credit || 0),
                        net_tax_liability: Number(reportRes.data?.net_tax_liability || 0),
                        industry_context: reportRes.data?.industry_context || profile.business_type
                    }}
                    transactions={mappedTransactions} 
                    reportPeriod="Operational Cycle 2024 - 2026"
                    currency={reportingCurrency} 
                    businessName={activeBusinessName}
                />
            </div>

            {/* SYSTEM AUDIT FOOTER */}
            <div className="pt-10 opacity-30 text-center">
                <div className="flex items-center justify-center gap-4 text-[9px] font-black text-slate-400 uppercase tracking-[0.4em]">
                    <span className="flex items-center gap-1.5"><Activity size={10}/> Pulse: Online</span>
                    <span>Sovereign Ledger System</span>
                    <span>Protocol v10.2</span>
                </div>
            </div>
        </div>
    );
}