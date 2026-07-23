import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

// --- Icons & UI Components ---
import { 
    PlusCircle, 
    ShieldAlert, 
    LayoutDashboard, 
    History, 
    Landmark,
    Users,
    ShieldCheck,
    Fingerprint,
    Activity,
    Globe,
    FileSearch
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PayrollHistoryTable } from '@/components/payroll/PayrollHistoryTable';
import { StartPayrollRunForm } from '@/components/payroll/StartPayrollRunForm';
import { format } from 'date-fns';

/**
 * BBU1 SOVEREIGN PAYROLL CONTROL CENTER - V12.0
 * 
 * This server component resolves the business node identity and serves 
 * the authoritative payroll execution engine for the global network.
 */
export default async function PayrollPage({ params: { locale } }: { params: { locale: string } }) {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    
    // 1. IDENTITY RESOLUTION: SECURE SESSION HANDSHAKE
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) redirect(`/${locale}/auth/login`);

    // Fetch profile context: Mapping job roles and security tiers
    const { data: profile } = await supabase
        .from('profiles')
        .select('business_id, full_name, role, system_access_role')
        .eq('id', user.id)
        .single();

    const businessId = profile?.business_id;
    const isSovereign = profile?.system_access_role === 'architect' || profile?.system_access_role === 'commander';

    // 2. SECURITY GATE: Node Access Verification
    if (!businessId && !isSovereign) {
        return (
            <div className="flex h-screen flex-col items-center justify-center p-8 bg-white">
                <div className="bg-white border border-slate-100 p-12 rounded-[2.5rem] text-center max-w-md shadow-2xl">
                    <div className="h-16 w-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-900 mx-auto mb-6">
                        <ShieldAlert className="h-8 w-8" />
                    </div>
                    <h1 className="text-xl font-bold tracking-tight text-slate-900 uppercase">Registry Link Required</h1>
                    <p className="text-slate-500 text-sm font-medium mt-3 leading-relaxed">
                        LITONU Security Protocol: This identity node is not anchored to a verified Business Entity.
                    </p>
                </div>
            </div>
        );
    }

    // 3. INSTITUTIONAL IDENTITY RESOLUTION
    const { data: branding } = await supabase
        .from('tenant_branding')
        .select('company_name_display')
        .eq('tenant_id', businessId)
        .single();

    const { data: tenant } = await supabase
        .from('tenants')
        .select('name, currency_code')
        .eq('id', businessId)
        .single();

    const tenantName = branding?.company_name_display || tenant?.name || "Global Node";

    // 4. FORENSIC DATA FETCH: Ledger Disbursement Registry
    const { data: runs, error: runError } = await supabase
        .from('hr_payroll_runs')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });

    if (runError) {
        console.error("[BBU1-PAYROLL] Registry Fault:", runError.message);
    }

    return (
        <div className="flex flex-col gap-12 p-8 md:p-12 max-w-[1400px] mx-auto bg-white min-h-screen animate-in fade-in duration-700">
            
            {/* EXECUTIVE HEADER: CLEAN ENTERPRISE ARCHITECTURE */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b-2 border-slate-100 pb-8">
                <div className="space-y-2">
                    <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">
                        <Globe className="h-3.5 w-3.5" />
                        <span>Human Capital Management</span>
                        <span>/</span>
                        <span className="text-slate-900">Financial Disbursement</span>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 uppercase">
                        Payroll Control Center
                    </h1>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
                        <p className="text-[11px] font-bold text-slate-500 uppercase">
                            Operator: <span className="text-slate-900">{profile?.full_name}</span>
                        </p>
                        <div className="h-3 w-[1px] bg-slate-200" />
                        <p className="text-[11px] font-bold text-slate-500 uppercase">
                            Identity: <span className="text-slate-900 tracking-tight">{profile?.role?.replace('_', ' ')}</span>
                        </p>
                        <div className="h-3 w-[1px] bg-slate-200" />
                        <p className="text-[11px] font-bold text-slate-500 uppercase">
                            Node: <span className="text-slate-900">{tenantName}</span>
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="text-right flex flex-col items-end">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Ledger Sync Status</p>
                        <div className="flex items-center gap-2 px-4 py-1.5 bg-slate-50 border border-slate-200 rounded-xl shadow-sm">
                            <Activity className="h-3.5 w-3.5 text-slate-900" />
                            <span className="text-[10px] font-black text-slate-700 uppercase tracking-tighter">CONNECTED : GADS-SYNC</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ACTION SECTION: DISBURSEMENT INITIATION */}
            <div className="space-y-6">
                <div className="flex items-center gap-2">
                    <div className="w-1 h-6 bg-blue-600 rounded-full" />
                    <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Execution Portal (Active Cycle)</h2>
                </div>
                <StartPayrollRunForm 
                    tenantId={businessId as string} 
                    tenantName={tenantName}
                />
            </div>

            {/* REGISTRY SECTION: AUTHORITATIVE HISTORY */}
            <div className="space-y-6">
                <div className="flex items-center gap-2">
                    <div className="w-1 h-6 bg-slate-900 rounded-full" />
                    <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Payroll Registry & Audit Trail</h2>
                </div>
                <PayrollHistoryTable 
                    runs={runs || []} 
                    tenantName={tenantName}
                />
            </div>

            {/* INSTITUTIONAL SEAL FOOTER */}
            <div className="mt-12 pt-12 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-8 opacity-40 hover:opacity-100 transition-all duration-500">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-slate-900" />
                        <span className="text-[9px] font-bold uppercase tracking-widest">Unified HCM Node</span>
                    </div>
                    <div className="h-4 w-[1px] bg-slate-200" />
                    <div className="flex items-center gap-2">
                        <Landmark className="h-4 w-4 text-slate-900" />
                        <span className="text-[9px] font-bold uppercase tracking-widest">General Ledger Reconciled</span>
                    </div>
                    <div className="h-4 w-[1px] bg-slate-200" />
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-slate-900" />
                        <span className="text-[9px] font-bold uppercase tracking-widest">Multi-Tax Protocol Sealed</span>
                    </div>
                </div>
                
                <div className="flex items-center gap-4">
                    <FileSearch className="h-4 w-4 text-slate-400" />
                    <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-slate-500">
                        © {format(new Date(), 'yyyy')} LITONU BBU1 • IFRS COMPLIANT KERNEL
                    </p>
                </div>
            </div>
        </div>
    );
}