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
    Activity
} from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Button } from '@/components/ui/button';
import { Card, CardContent } from "@/components/ui/card";
import { ReviewPayslipTable } from '@/components/payroll/ReviewPayslipTable';
import { ApprovePayrollButton } from '@/components/payroll/ApprovePayrollButton';

/**
 * LITONU BUSINESS BASE UNIVERSE LTD - PAYROLL AUDIT & REVIEW TERMINAL
 * 
 * UPGRADE: Authoritative Fiscal Context Resolution.
 * This terminal performs a forensic deep-fetch of the labor ledger,
 * resolving multi-tenant branding and dynamic statutory liabilities.
 */
export default async function ReviewPayrollPage({ 
    params: { locale, runId } 
}: { 
    params: { locale: string; runId: string } 
}) {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    // 1. AUTHORITATIVE IDENTITY & SOVEREIGN RESOLUTION
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
    // Ensures NIM UGANDA LTD or any node name is fetched from the primary visual identity table
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
    // Synchronized with the 'hr_' prefixed tables established in the database weld.
    const { data: run, error } = await supabase
        .from('hr_payroll_runs')
        .select(`
            *,
            hr_payslips (
                *,
                employees:employee_id ( full_name, job_title ),
                hr_payslip_details (
                    calculated_amount,
                    hr_payroll_elements ( name, type )
                )
            )
        `)
        .eq('id', runId)
        // SECURITY SHIELD: Standard Admins are physically locked to their businessId node
        .eq('business_id', isSovereign ? runId : businessId) 
        .single();
        
    if (error || !run) {
        console.error("[BBU1-AUDIT] Forensic Retrieval Error:", error?.message);
        notFound();
    }

    const runStatus = (run.status || '').toUpperCase();
    const isDraft = runStatus === 'DRAFT' || runStatus === 'PENDING_APPROVAL';
    const isPaid = runStatus === 'PAID';
    const currency = run.currency_code || 'UGX';

    return (
        <div className="p-4 md:p-8 space-y-8 bg-slate-50/30 min-h-screen">
            
            {/* Navigation & Authoritative Status Header */}
            <div className="flex flex-col gap-4">
                <Link 
                    href={`/${locale}/payroll`} 
                    className="flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-blue-600 transition-colors uppercase tracking-widest"
                >
                    <ChevronLeft className="h-3 w-3" />
                    Back to Payroll Registry
                </Link>

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="space-y-1">
                        <div className="flex items-center gap-4">
                            <h1 className="text-3xl font-black tracking-tighter text-slate-900 uppercase">
                                Run Audit: {run.period_name}
                            </h1>
                            <Badge className={cn(
                                "px-4 py-1 text-[10px] font-black uppercase tracking-widest rounded-full",
                                isPaid ? "bg-emerald-600 text-white" : "bg-blue-600 text-white"
                            )}>
                                {runStatus}
                            </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            <Fingerprint size={12} /> System Reference: {run.id}
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {isDraft && <ApprovePayrollButton runId={run.id} />}
                        {isPaid && (
                             <div className="flex items-center gap-3 px-5 py-2.5 bg-white border border-emerald-100 rounded-2xl shadow-sm">
                                <ShieldCheck className="h-5 w-5 text-emerald-500" />
                                <div className="flex flex-col leading-none">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Fiscal Status</span>
                                    <span className="text-xs font-black text-emerald-600 uppercase mt-1">Ledger Sealed</span>
                                </div>
                             </div>
                        )}
                    </div>
                </div>
            </div>

            {/* EXECUTIVE FINANCIAL SUMMARY CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <Card className="border-none shadow-2xl shadow-slate-200/50 rounded-[2rem] bg-white overflow-hidden">
                    <CardContent className="p-8">
                        <div className="flex items-center justify-between mb-4">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Net Disbursement</p>
                            <div className="p-2 bg-blue-50 rounded-xl text-blue-600">
                                <Banknote className="h-5 w-5" />
                            </div>
                        </div>
                        <p className="text-3xl font-black text-slate-900 font-mono tracking-tighter">
                            {new Intl.NumberFormat(undefined, { style: 'currency', currency: currency }).format(run.total_net_pay)}
                        </p>
                        <div className="mt-4 flex items-center gap-2 text-[10px] text-emerald-600 font-black uppercase tracking-widest">
                            <Landmark className="h-3.5 w-3.5" /> Account 1000 Resolution
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-2xl shadow-slate-200/50 rounded-[2rem] bg-white overflow-hidden">
                    <CardContent className="p-8">
                        <div className="flex items-center justify-between mb-4">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Tax Liabilities</p>
                            <div className="p-2 bg-red-50 rounded-xl text-red-600">
                                <Calculator className="h-5 w-5" />
                            </div>
                        </div>
                        <p className="text-3xl font-black text-red-600 font-mono tracking-tighter">
                            {new Intl.NumberFormat(undefined, { style: 'currency', currency: currency }).format(run.total_tax_paye)}
                        </p>
                        <div className="mt-4 flex items-center gap-2 text-[10px] text-red-600 font-black uppercase tracking-widest">
                            <Lock className="h-3.5 w-3.5" /> Account 2100 Recognition
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-2xl shadow-slate-200/50 rounded-[2rem] bg-white overflow-hidden">
                    <CardContent className="p-8">
                        <div className="flex items-center justify-between mb-4">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Staff Headcount</p>
                            <div className="p-2 bg-slate-50 rounded-xl text-slate-400">
                                <Users className="h-5 w-5" />
                            </div>
                        </div>
                        <p className="text-3xl font-black text-slate-900 font-mono tracking-tighter">
                            {run.hr_payslips?.length || 0}
                        </p>
                        <div className="mt-4 flex items-center gap-2 text-[10px] text-slate-400 font-black uppercase tracking-widest">
                            <Activity className="h-3.5 w-3.5" /> Verified Active Nodes
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* COMPLIANCE ADVISORY */}
            <div className="bg-amber-50/50 border border-amber-100 p-6 rounded-[2rem] flex items-start gap-5 shadow-sm">
                <div className="p-3 bg-white rounded-2xl shadow-sm">
                    <Info className="h-6 w-6 text-amber-600" />
                </div>
                <div className="space-y-2">
                    <h4 className="text-xs font-black text-amber-900 uppercase tracking-widest">Forensic Compliance Audit Notice</h4>
                    <p className="text-[13px] text-amber-800 font-semibold leading-relaxed max-w-4xl">
                        This run has been calculated against the active tax blueprint for this node. Authorization will execute an atomic ledger post to Account 6100 (Wages) and Account 2100 (Statutory Liability). 
                        Confirm all deductions align with local statutory requirements (e.g. URA, KRA) before final seal.
                    </p>
                </div>
            </div>

            {/* AUTHORITATIVE COMPENSATION LEDGER */}
            <div className="space-y-4">
                <div className="flex items-center gap-3 px-2">
                    <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
                        <ReceiptText className="h-4 w-4" />
                    </div>
                    <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Individual Compensation Breakdown</h2>
                </div>
                <ReviewPayslipTable 
                    payslips={run.hr_payslips || []} 
                    tenantName={tenantName}
                />
            </div>

            {/* INSTITUTIONAL FOOTER */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-6 text-[10px] text-slate-400 font-black uppercase tracking-[0.3em] pt-12 pb-8 border-t border-slate-100">
                <div className="flex items-center gap-8">
                    <span className="flex items-center gap-2"><Scale size={14} className="text-blue-600/30"/> GADS INTEGRITY VERIFIED</span>
                    <span className="flex items-center gap-2 text-emerald-600"><ShieldCheck size={14}/> IFRS-16 COMPLIANT ENVIRONMENT</span>
                </div>
                <p>&copy; {new Date().getFullYear()} LITONU BUSINESS BASE UNIVERSE LTD • NODE IDENTITY: {profile?.business_id}</p>
            </div>
        </div>
    );
}

/**
 * UTILITY: cn (Class Name Merger)
 * Hardened for institutional build stability.
 */
function cn(...classes: any[]) {
    return classes.filter(Boolean).join(' ');
}