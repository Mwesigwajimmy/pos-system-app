import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';

// --- Icons & UI Components ---
import { 
    Landmark, 
    ShieldCheck, 
    ReceiptText, 
    Users, 
    ChevronLeft, 
    AlertCircle,
    Info,
    Calculator,
    Banknote,
    Lock,
    Scale,
    Activity,
    Fingerprint,
    FileText
} from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Button } from '@/components/ui/button';
import { Card, CardContent } from "@/components/ui/card";
import { ReviewPayslipTable } from '@/components/payroll/ReviewPayslipTable';
import { ApprovePayrollButton } from '@/components/payroll/ApprovePayrollButton';
import { cn } from '@/lib/utils';

/**
 * BBU1 PAYROLL AUDIT & REVIEW TERMINAL - V13.0
 * AUTHORITATIVE FISCAL CONTEXT RESOLUTION
 */
export default async function ReviewPayrollPage({ 
    params: { locale, runId } 
}: { 
    params: { locale: string; runId: string } 
}) {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    // 1. IDENTITY & SOVEREIGN RESOLUTION
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect(`/${locale}/auth/login`);

    const { data: profile } = await supabase
        .from('profiles')
        .select('business_id, system_access_role')
        .eq('id', user.id)
        .single();

    const isSovereign = profile?.system_access_role === 'architect' || profile?.system_access_role === 'commander';
    const businessId = profile?.business_id;

    if (!businessId && !isSovereign) redirect(`/${locale}/onboarding`);

    // 2. AUTHORITATIVE BRANDING RESOLUTION
    const { data: branding } = await supabase
        .from('tenant_branding')
        .select('company_name_display')
        .eq('tenant_id', businessId)
        .single();

    const { data: tenant } = await supabase
        .from('tenants')
        .select('name')
        .eq('id', businessId)
        .single();

    const tenantName = branding?.company_name_display || tenant?.name || "Authorized Entity";

    // 3. ENTERPRISE DATA FETCHING (DEEP LEDGER JOIN)
    // FIX: Corrected security filter to avoid ID mismatch 404
    let query = supabase
        .from('hr_payroll_runs')
        .select(`
            *,
            hr_payslips (
                *,
                employees:employee_id ( full_name, job_title ),
                hr_payslip_details (
                    calculated_amount,
                    payroll_elements:element_id ( name, type )
                )
            )
        `)
        .eq('id', runId);

    // Only filter by business_id if the user is NOT a global sovereign power
    if (!isSovereign) {
        query = query.eq('business_id', businessId);
    }

    const { data: run, error } = await query.single();
        
    if (error || !run) {
        console.error("[BBU1-AUDIT] Forensic Retrieval Error:", error?.message);
        notFound();
    }

    const runStatus = (run.status || '').toUpperCase();
    const isDraft = runStatus === 'DRAFT' || runStatus === 'PENDING_APPROVAL';
    const isPaid = runStatus === 'PAID';
    const currency = run.currency_code || 'UGX';

    return (
        <div className="flex flex-col gap-12 p-8 md:p-12 max-w-[1400px] mx-auto bg-white min-h-screen animate-in fade-in duration-700">
            
            {/* NAVIGATION & STATUS */}
            <div className="flex flex-col gap-6">
                <Link 
                    href={`/${locale}/payroll`} 
                    className="flex items-center gap-2 text-[10px] font-bold text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-[0.3em]"
                >
                    <ChevronLeft className="h-3 w-3" />
                    Return to Registry
                </Link>

                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b-2 border-slate-100 pb-8">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3 text-slate-400 uppercase font-bold text-[10px] tracking-[0.3em]">
                            <FileSearch className="h-4 w-4" />
                            <span>Forensic Audit Node</span>
                        </div>
                        <h1 className="text-3xl font-bold tracking-tighter text-slate-900 uppercase">
                            Cycle: {run.period_name}
                        </h1>
                        <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            <Fingerprint size={12} /> Registry Ref: {run.id}
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className={cn(
                            "px-4 py-2 rounded-xl border flex items-center gap-3",
                            isPaid ? "bg-slate-900 border-slate-900 text-white" : "bg-slate-50 border-slate-200 text-slate-600"
                        )}>
                            <span className="text-[10px] font-black uppercase tracking-widest">Ledger Status</span>
                            <div className="h-4 w-[1px] bg-slate-200/20" />
                            <span className="text-xs font-bold uppercase">{runStatus}</span>
                        </div>
                        {isDraft && <ApprovePayrollButton runId={run.id} />}
                    </div>
                </div>
            </div>

            {/* EXECUTIVE FINANCIAL SUMMARY */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <div className="w-1 h-4 bg-slate-900 rounded-full" />
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Net Disbursement</p>
                    </div>
                    <p className="text-3xl font-bold text-slate-900 font-mono tracking-tighter">
                        {new Intl.NumberFormat(undefined, { style: 'currency', currency: currency }).format(run.total_net_pay)}
                    </p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase flex items-center gap-2">
                        <Landmark className="h-3 w-3" /> Account 1000 Reconciliation
                    </p>
                </div>

                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <div className="w-1 h-4 bg-red-600 rounded-full" />
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tax Liabilities</p>
                    </div>
                    <p className="text-3xl font-bold text-slate-900 font-mono tracking-tighter">
                        {new Intl.NumberFormat(undefined, { style: 'currency', currency: currency }).format(run.total_tax_paye)}
                    </p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase flex items-center gap-2">
                        <Lock className="h-3 w-3" /> Account 2100 Recognition
                    </p>
                </div>

                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <div className="w-1 h-4 bg-blue-600 rounded-full" />
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Personnel Registry</p>
                    </div>
                    <p className="text-3xl font-bold text-slate-900 font-mono tracking-tighter">
                        {run.hr_payslips?.length || 0} Workers
                    </p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase flex items-center gap-2">
                        <Activity className="h-3 w-3" /> Authorized Identities
                    </p>
                </div>
            </div>

            {/* COMPLIANCE ADVISORY: CLEAN MONOCHROME */}
            <div className="bg-slate-50 border border-slate-200 p-8 rounded-3xl flex items-start gap-6">
                <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm text-slate-900">
                    <Info className="h-6 w-6" />
                </div>
                <div className="space-y-2">
                    <h4 className="text-[11px] font-bold text-slate-900 uppercase tracking-widest">Forensic Compliance Audit Notice</h4>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed max-w-4xl">
                        This run has been calculated against the active tax blueprint for this node. Authorization will execute an atomic ledger post to Account 6100 (Wages) and Account 2100 (Statutory Liability). 
                        Confirm all deductions align with jurisdictional requirements before the final seal.
                    </p>
                </div>
            </div>

            {/* AUTHORITATIVE COMPENSATION LEDGER */}
            <div className="space-y-6">
                <div className="flex items-center gap-2">
                    <div className="w-1 h-6 bg-slate-900 rounded-full" />
                    <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Individual Settlement Breakdown</h2>
                </div>
                <ReviewPayslipTable 
                    payslips={run.hr_payslips || []} 
                    tenantName={tenantName}
                />
            </div>

            {/* INSTITUTIONAL FOOTER */}
            <div className="mt-auto pt-16 flex flex-col md:flex-row justify-between items-center gap-8 text-[9px] text-slate-400 font-bold uppercase tracking-[0.3em]">
                <div className="flex items-center gap-8">
                    <span className="flex items-center gap-2"><Scale size={12}/> GADS INTEGRITY VERIFIED</span>
                    <span className="flex items-center gap-2 text-slate-900"><ShieldCheck size={12}/> IFRS-16 COMPLIANT ENVIRONMENT</span>
                </div>
                <p>NODE IDENTITY: {businessId} | © {new Date().getFullYear()} BBU1 GLOBAL</p>
            </div>
        </div>
    );
}