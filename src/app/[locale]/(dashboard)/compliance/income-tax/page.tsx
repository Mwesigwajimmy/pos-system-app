import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import RevolutionaryIncomeTaxDashboard from '@/components/compliance/RevolutionaryIncomeTaxDashboard';
import { Landmark, Globe, ShieldCheck, Activity, LandmarkIcon } from 'lucide-react';

interface PageProps {
  params: {
    locale: string;
  };
}

export default async function IncomeTaxIntelligencePage({ params }: PageProps) {
    const { locale } = params;
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user) redirect(`/${locale}/auth/login`);

    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("business_id, business_name, business_type")
        .eq("id", authData.user.id)
        .maybeSingle();

    if (!profile?.business_id || profileError) {
        redirect(`/${locale}/welcome`);
    }

    const { data: tenant } = await supabase
        .from("tenants")
        .select("name, currency_code, country_code")
        .eq("id", profile.business_id)
        .maybeSingle();

    const bizId = profile.business_id;
    const reportingCurrency = tenant?.currency_code || 'UGX';
    const activeBusinessName = tenant?.name || profile.business_name || 'Sovereign Business Unit';

    const [ledgerRes, taxRateRes, provisionRes] = await Promise.all([
        supabase
            .from('accounting_journal_entries')
            .select(`
                debit, 
                credit, 
                accounting_accounts!inner(code, type)
            `)
            .eq('business_id', bizId),
        supabase
            .from('tax_configurations')
            .select('rate_percentage')
            .eq('business_id', bizId)
            .eq('tax_category_code', 'INCOME_TAX')
            .eq('is_active', true)
            .maybeSingle(),
        supabase
            .from('accounting_journal_entries')
            .select(`
                id,
                created_at,
                debit,
                description,
                accounting_transactions!inner(reference)
            `)
            .eq('business_id', bizId)
            .eq('description', 'Income Tax Provision Recognized')
            .order('created_at', { ascending: false })
            .limit(50)
    ]);

    const revenue = ledgerRes.data
        ?.filter(e => e.accounting_accounts.type === 'Revenue')
        .reduce((sum, e) => sum + (Number(e.credit) - Number(e.debit)), 0) || 0;

    const cogs = ledgerRes.data
        ?.filter(e => e.accounting_accounts.code === '5000')
        .reduce((sum, e) => sum + (Number(e.debit) - Number(e.credit)), 0) || 0;

    const opex = ledgerRes.data
        ?.filter(e => e.accounting_accounts.code === '6000')
        .reduce((sum, e) => sum + (Number(e.debit) - Number(e.credit)), 0) || 0;

    const currentTaxLiability = ledgerRes.data
        ?.filter(e => e.accounting_accounts.code === '2200')
        .reduce((sum, e) => sum + (Number(e.credit) - Number(e.debit)), 0) || 0;

    const taxableIncome = revenue - (cogs + opex);
    const taxRate = Number(taxRateRes.data?.rate_percentage || 0);

    const mappedEntries = provisionRes.data?.map((entry: any) => ({
        id: entry.id,
        date: new Date(entry.created_at).toLocaleDateString(),
        reference: entry.accounting_transactions?.reference || 'AUTO',
        profit_basis: taxRate > 0 ? (Number(entry.debit) / (taxRate / 100)) : 0,
        tax_amount: Number(entry.debit),
        status: 'Provisioned'
    })) || [];

    return (
        <div className="flex-1 space-y-8 p-6 md:p-10 pt-8 bg-[#F8FAFC] animate-in fade-in duration-700">
            
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-b border-slate-200 pb-10">
                <div className="space-y-1">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-amber-600 rounded-2xl shadow-xl text-white">
                            <LandmarkIcon className="h-8 w-8" strokeWidth={2.5} />
                        </div>
                        <h1 className="text-4xl font-black tracking-tighter text-slate-900 uppercase">
                            Income Tax Audit
                        </h1>
                    </div>
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                        <ShieldCheck size={14} className="text-amber-600" />
                        Statutory Profit Analysis for {activeBusinessName}
                    </p>
                </div>
                
                <div className="flex items-center gap-4 bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
                    <Globe className="h-6 w-6 text-amber-500 animate-pulse" />
                    <div className="flex flex-col">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Fiscal Context</span>
                        <span className="text-xs font-bold text-slate-900 uppercase mt-1">{tenant?.country_code || 'UG'} - Statutory Handshake</span>
                    </div>
                </div>
            </div>
            
            <div className="max-w-7xl">
                <RevolutionaryIncomeTaxDashboard 
                    summary={{
                        gross_revenue: revenue,
                        total_cogs: cogs,
                        operating_expenses: opex,
                        taxable_income: taxableIncome,
                        tax_rate_applied: taxRate,
                        tax_liability_accrued: currentTaxLiability,
                        country_context: tenant?.country_code || 'UG'
                    }}
                    entries={mappedEntries} 
                    reportPeriod="Current Fiscal Cycle"
                    currency={reportingCurrency} 
                    businessName={activeBusinessName}
                />
            </div>

            <div className="pt-10 opacity-30 text-center">
                <div className="flex items-center justify-center gap-4 text-[9px] font-black text-slate-400 uppercase tracking-[0.4em]">
                    <span className="flex items-center gap-1.5"><Activity size={10}/> Pulse: Online</span>
                    <span>Sovereign Pillar 2200 Active</span>
                    <span>Kernel v8.4.2</span>
                </div>
            </div>
        </div>
    );
}