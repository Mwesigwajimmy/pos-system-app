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
    Banknote
} from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Button } from '@/components/ui/button';
import { Card, CardContent } from "@/components/ui/card";
import { ReviewPayslipTable } from '@/components/payroll/ReviewPayslipTable';
import { ApprovePayrollButton } from '@/components/payroll/ApprovePayrollButton';

export default async function ReviewPayrollPage({ 
    params: { locale, runId } 
}: { 
    params: { locale: string; runId: string } 
}) {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    // 1. AUTH & TENANCY RESOLUTION
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect(`/${locale}/auth/login`);

    const { data: profile } = await supabase
        .from('profiles')
        .select('business_id')
        .eq('id', user.id)
        .single();

    if (!profile?.business_id) redirect(`/${locale}/onboarding`);

    // 2. FETCH TENANT BRANDING (For PDF Generation)
    const { data: tenant } = await supabase
        .from('tenants')
        .select('name')
        .eq('id', profile.business_id)
        .single();

    const tenantName = tenant?.name || "Authorized Entity";

    // 3. ENTERPRISE DATA FETCHING (Deep Join)
    // We use the 'hr_' prefixed tables verified in our logic audit.
    const { data: run, error } = await supabase
        .from('hr_payroll_runs')
        .select(`
            *,
            hr_payslips (
                *,
                employees:employee_id ( full_name, job_title, department ),
                payslip_details (
                    calculated_amount,
                    payroll_elements ( name, type )
                )
            )
        `)
        .eq('id', runId)
        .eq('business_id', profile.business_id) // STRICT SECURITY
        .single();
        
    if (error || !run) {
        console.error("[Enterprise Payroll] Data Retrieval Error:", error?.message);
        notFound();
    }

    const isDraft = run.status.toUpperCase() === 'DRAFT' || run.status.toUpperCase() === 'PENDING_APPROVAL';
    const isPaid = run.status.toUpperCase() === 'PAID';

    return (
        <div className="p-4 md:p-8 space-y-8 bg-slate-50/30 min-h-screen">
            
            {/* Navigation & Status Header */}
            <div className="flex flex-col gap-4">
                <Link 
                    href={`/${locale}/payroll`} 
                    className="flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-primary transition-colors uppercase tracking-widest"
                >
                    <ChevronLeft className="h-3 w-3" />
                    Back to Payroll Registry
                </Link>

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <h1 className="text-3xl font-black tracking-tighter text-slate-900 uppercase">
                                Run Audit: {run.period_name}
                            </h1>
                            <Badge className={cn(
                                "ml-2 px-3 py-0.5 text-[10px] font-black uppercase tracking-tighter",
                                isPaid ? "bg-green-600" : "bg-blue-600"
                            )}>
                                {run.status}
                            </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground font-medium">
                            System Reference: <span className="font-mono">{run.id}</span>
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        {isDraft && <ApprovePayrollButton runId={run.id} />}
                        {isPaid && (
                             <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-100 rounded-lg">
                                <ShieldCheck className="h-5 w-5 text-green-600" />
                                <span className="text-xs font-bold text-green-700 uppercase">Ledger Synchronized</span>
                             </div>
                        )}
                    </div>
                </div>
            </div>

            {/* EXECUTIVE FINANCIAL SUMMARY CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border-none shadow-md bg-white">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Net Disbursement</p>
                            <Banknote className="h-4 w-4 text-primary opacity-50" />
                        </div>
                        <p className="text-2xl font-black text-slate-900 mt-2 font-mono">
                            {new Intl.NumberFormat(undefined, { style: 'currency', currency: 'UGX' }).format(run.total_net_pay)}
                        </p>
                        <div className="mt-2 flex items-center gap-1 text-[10px] text-green-600 font-bold uppercase">
                            <Landmark className="h-3 w-3" /> Account 1000 Impact
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-md bg-white">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total PAYE Tax Withheld</p>
                            <Calculator className="h-4 w-4 text-red-500 opacity-50" />
                        </div>
                        <p className="text-2xl font-black text-red-600 mt-2 font-mono">
                            {new Intl.NumberFormat(undefined, { style: 'currency', currency: 'UGX' }).format(run.total_tax_paye)}
                        </p>
                        <div className="mt-2 flex items-center gap-1 text-[10px] text-red-500 font-bold uppercase">
                            <Landmark className="h-3 w-3" /> Account 2100 Impact
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-md bg-white">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Employee Headcount</p>
                            <Users className="h-4 w-4 text-slate-400 opacity-50" />
                        </div>
                        <p className="text-2xl font-black text-slate-900 mt-2 font-mono">
                            {run.hr_payslips?.length || 0}
                        </p>
                        <div className="mt-2 flex items-center gap-1 text-[10px] text-slate-400 font-bold uppercase">
                            Verified Active Staff
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* COMPLIANCE NOTICE */}
            <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl flex items-start gap-4">
                <div className="p-2 bg-amber-100 rounded-full">
                    <Info className="h-5 w-5 text-amber-700" />
                </div>
                <div className="space-y-1">
                    <h4 className="text-sm font-bold text-amber-900 uppercase">Legal Compliance Audit Notice</h4>
                    <p className="text-xs text-amber-800 leading-relaxed">
                        This payroll run has been autonomously calculated based on statutory rates. Approval will result in the immediate recognition of <strong>Wage Expenses (6100)</strong> and <strong>Tax Liabilities (2100)</strong> within the General Ledger. 
                        Ensure all deductions match the local jurisdiction (Uganda/URA) requirements.
                    </p>
                </div>
            </div>

            {/* INDIVIDUAL PAYSLIP REGISTRY 
                This component now handles the individual PDF Payslip generation 
            */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 px-2">
                    <ReceiptText className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-bold text-slate-800 uppercase tracking-tight">Individual Compensation Breakdown</h2>
                </div>
                <ReviewPayslipTable 
                    payslips={run.hr_payslips || []} 
                    tenantName={tenantName}
                />
            </div>

            {/* SYSTEM FOOTER */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] text-slate-400 font-bold uppercase tracking-widest pt-8 border-t">
                <p>© 2026 Unified Business Intelligence Engine • Secure Tenant: {profile.business_id}</p>
                <div className="flex gap-4">
                    <span className="text-green-600 flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5"/> GADS INTERCONNECT ACTIVE</span>
                    <span>IFRS-16 COMPLIANT</span>
                </div>
            </div>
        </div>
    );
}

// Utility for CSS
function cn(...classes: any[]) {
    return classes.filter(Boolean).join(' ');
}