import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';

// --- Icons & UI Components ---
import { 
    ShieldCheck, 
    ArrowLeft, 
    Calculator, 
    FileSearch, 
    ArrowRight,
    Landmark,
    Users,
    Fingerprint,
    Scale,
    Activity,
    Lock
} from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Button } from '@/components/ui/button';
import { Card, CardContent } from "@/components/ui/card";
import { cn } from '@/lib/utils';

/**
 * BBU1 PAYROLL RUN GATEWAY - V13.0
 * Path: /payroll/[runId]
 * 
 * This page serves as the authoritative entry point for a specific labor 
 * disbursement cycle before stepping into the forensic audit terminal.
 */
export default async function PayrollRunGatewayPage({ 
    params: { locale, runId } 
}: { 
    params: { locale: string; runId: string } 
}) {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    // 1. IDENTITY & CONTEXT RESOLUTION
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

    // 2. DATA FETCHING: Pull the high-level run metadata
    const { data: run, error } = await supabase
        .from('hr_payroll_runs')
        .select(`
            *,
            hr_payslips ( id )
        `)
        .eq('id', runId)
        .eq('business_id', businessId)
        .single();
        
    if (error || !run) {
        console.error("[BBU1-GATEWAY] Retrieval Error:", error?.message);
        notFound();
    }

    const runStatus = (run.status || '').toUpperCase();
    const currency = run.currency_code || 'UGX';

    return (
        <div className="flex flex-col gap-12 p-8 md:p-12 max-w-[1200px] mx-auto bg-white min-h-screen animate-in fade-in duration-700">
            
            {/* NAVIGATION & SYSTEM IDENTITY */}
            <div className="flex items-center justify-between">
                <Link 
                    href={`/${locale}/payroll`} 
                    className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 hover:text-slate-900 transition-colors tracking-[0.2em]"
                >
                    <ArrowLeft className="h-3 w-3" /> Back to History
                </Link>
                <div className="flex items-center gap-3">
                    <Badge variant="outline" className="bg-slate-50 border-slate-200 text-slate-500 font-black text-[9px] uppercase tracking-widest px-4 py-1 rounded-full">
                        <Fingerprint className="h-3 w-3 mr-2" /> NODE ID: {run.id.substring(0,12)}
                    </Badge>
                </div>
            </div>

            {/* HEADER: RUN OVERVIEW */}
            <div className="border-b-2 border-slate-100 pb-10">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="space-y-3">
                        <div className="flex items-center gap-3 text-slate-400 uppercase font-bold text-[10px] tracking-[0.3em]">
                            <Scale className="h-4 w-4" />
                            <span>Labor Disbursement Node</span>
                        </div>
                        <h1 className="text-4xl font-bold tracking-tighter text-slate-900 uppercase leading-none">
                            {run.period_name}
                        </h1>
                        <p className="text-slate-500 text-base font-medium max-w-lg">
                            This node represents an isolated financial cycle. All underlying ledger entries are currently in <span className="text-slate-900 font-bold">{runStatus}</span> state.
                        </p>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className={cn(
                            "px-6 py-3 rounded-2xl border flex flex-col items-end gap-1 shadow-sm",
                            runStatus === 'PAID' ? "bg-green-50 border-green-100" : "bg-amber-50 border-amber-100"
                        )}>
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Current Status</span>
                            <span className={cn(
                                "text-sm font-black uppercase tracking-tighter",
                                runStatus === 'PAID' ? "text-green-600" : "text-amber-600"
                            )}>
                                {runStatus}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* EXECUTIVE SUMMARY GRIDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* FINANCIAL TOTALS */}
                <div className="space-y-6">
                    <div className="flex items-center gap-2">
                        <div className="w-1 h-5 bg-slate-900 rounded-full" />
                        <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Financial Recognition</h2>
                    </div>
                    <Card className="border-slate-100 shadow-sm rounded-3xl overflow-hidden">
                        <CardContent className="p-10 space-y-8">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Total Net Disbursement</p>
                                    <p className="text-3xl font-black text-slate-900 font-mono tracking-tighter">
                                        {new Intl.NumberFormat(undefined, { style: 'currency', currency: currency }).format(run.total_net_pay)}
                                    </p>
                                </div>
                                <div className="p-3 bg-slate-50 rounded-2xl text-slate-400">
                                    <Landmark className="h-6 w-6" />
                                </div>
                            </div>
                            <div className="h-[1px] w-full bg-slate-50" />
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Tax Authority Liabilities</p>
                                    <p className="text-3xl font-black text-red-600 font-mono tracking-tighter">
                                        {new Intl.NumberFormat(undefined, { style: 'currency', currency: currency }).format(run.total_tax_paye)}
                                    </p>
                                </div>
                                <div className="p-3 bg-red-50 rounded-2xl text-red-400">
                                    <Lock className="h-6 w-6" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* OPERATIONAL METRICS */}
                <div className="space-y-6">
                    <div className="flex items-center gap-2">
                        <div className="w-1 h-5 bg-blue-600 rounded-full" />
                        <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Personnel Registry</h2>
                    </div>
                    <Card className="border-slate-100 shadow-sm rounded-3xl overflow-hidden bg-slate-50/50">
                        <CardContent className="p-10 flex flex-col justify-between h-full">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Identified Personnel</p>
                                    <p className="text-5xl font-black text-slate-900 font-mono tracking-tighter">
                                        {run.hr_payslips?.length || 0}
                                    </p>
                                    <p className="text-[10px] font-bold text-blue-600 uppercase mt-4 flex items-center gap-2">
                                        <Activity className="h-3 w-3" /> All identities verified
                                    </p>
                                </div>
                                <div className="p-3 bg-white rounded-2xl text-blue-600 shadow-sm border border-blue-50">
                                    <Users className="h-6 w-6" />
                                </div>
                            </div>
                            
                            <Link href={`/${locale}/payroll/${runId}/review`} className="mt-10">
                                <Button className="w-full h-14 bg-slate-900 hover:bg-black text-white font-black uppercase text-xs tracking-widest rounded-2xl shadow-xl transition-all group">
                                    Step into Audit Review <ArrowRight className="ml-3 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* SYSTEM FORENSIC FOOTER */}
            <div className="mt-auto pt-16 flex flex-col items-center gap-6 opacity-30 grayscale hover:opacity-100 hover:grayscale-0 transition-all duration-700">
                <div className="flex items-center gap-4">
                    <div className="h-[1px] w-24 bg-slate-200" />
                    <ShieldCheck className="h-6 w-6 text-slate-900" />
                    <div className="h-[1px] w-24 bg-slate-200" />
                </div>
                <div className="text-center space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-900">BBU1 Sovereign Identity Sealed</p>
                    <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500">Authoritative Data Sync Active | Secure Node Handshake Protocol</p>
                </div>
            </div>
        </div>
    );
}