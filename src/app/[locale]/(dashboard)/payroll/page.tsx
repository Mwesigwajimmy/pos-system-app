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
    Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PayrollHistoryTable } from '@/components/payroll/PayrollHistoryTable';
import { StartPayrollRunForm } from '@/components/payroll/StartPayrollRunForm';

export default async function PayrollPage({ params: { locale } }: { params: { locale: string } }) {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    
    // 1. AUTHENTICATION & IDENTITY RESOLUTION
    // We use the profiles table as the 'Ultimate Truth' for Enterprise Identity
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) redirect(`/${locale}/auth/login`);

    const { data: profile } = await supabase
        .from('profiles')
        .select('business_id, full_name')
        .eq('id', user.id)
        .single();

    const businessId = profile?.business_id;

    // 2. MULTI-TENANT SECURITY SHIELD
    if (!businessId) {
        return (
            <div className="flex h-[80vh] flex-col items-center justify-center gap-4 p-8">
                <div className="rounded-full bg-red-100 p-6 text-red-600">
                    <ShieldAlert className="h-12 w-12" />
                </div>
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-black tracking-tighter text-slate-900 uppercase">Access Restricted</h1>
                    <p className="text-slate-500 max-w-sm">
                        This account is not linked to an active Business Entity. Verification required.
                    </p>
                </div>
            </div>
        );
    }

    // 3. FETCH LEGAL ENTITY METADATA
    // Fetches the business name for professional document branding (Nak, Clevland, etc.)
    const { data: tenant } = await supabase
        .from('tenants')
        .select('name, currency')
        .eq('id', businessId)
        .single();

    const tenantName = tenant?.name || "Our Organization";

    // 4. ENTERPRISE DATA FETCHING (Interconnected Ledger)
    // We fetch from the 'hr_payroll_runs' table we sealed in the SQL step
    const { data: runs, error: runError } = await supabase
        .from('hr_payroll_runs')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });

    if (runError) {
        console.error("[Enterprise Payroll] Sync Error:", runError.message);
    }

    return (
        <div className="p-4 md:p-8 space-y-10 bg-slate-50/30 min-h-screen">
            
            {/* Executive Context Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b pb-8">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs font-black text-primary uppercase tracking-widest">
                        <LayoutDashboard className="h-3 w-3" />
                        <span>Human Capital Management</span>
                    </div>
                    <h1 className="text-4xl font-black tracking-tighter text-slate-900 uppercase">
                        Payroll Control Center
                    </h1>
                    <p className="text-sm text-muted-foreground flex items-center gap-2 font-medium">
                        Managed by: <span className="text-slate-700">{profile.full_name}</span> 
                        <span className="text-slate-300">|</span>
                        Entity: <span className="text-primary font-bold">{tenantName}</span>
                    </p>
                </div>

                {/* Ledger Sync Status Indicator */}
                <div className="flex items-center gap-3 px-4 py-2 bg-white rounded-xl border shadow-sm">
                    <div className="p-2 bg-green-500/10 rounded-full">
                        <Landmark className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-400 uppercase leading-none">Ledger Connectivity</span>
                        <span className="text-xs font-mono font-bold text-green-600">GADS-SYNCED</span>
                    </div>
                </div>
            </div>

            {/* ACTION SECTION: START RUN */}
            <div className="max-w-5xl">
                <div className="flex items-center gap-2 mb-4">
                    <PlusCircle className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-bold text-slate-800 uppercase tracking-tight">Initiate Pay Cycle</h2>
                </div>
                <StartPayrollRunForm 
                    tenantId={businessId} 
                    tenantName={tenantName}
                />
            </div>

            {/* REGISTRY SECTION: HISTORY */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <History className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-bold text-slate-800 uppercase tracking-tight">Payroll Registry & Audit Trail</h2>
                </div>
                {/* 
                    Passes the runs and tenantName to the professional table 
                    we built to handle PDF summaries and Ledger status.
                */}
                <PayrollHistoryTable 
                    runs={runs || []} 
                    tenantName={tenantName}
                />
            </div>

            {/* GLOBAL COMPLIANCE FOOTER */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] text-slate-400 font-bold uppercase tracking-widest pt-8 border-t">
                <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5"/> Unified HCM Module</span>
                    <span className="flex items-center gap-1 text-green-600">
                        <Landmark className="h-3.5 w-3.5"/> Accounts 6100 & 2100 Integrated
                    </span>
                </div>
                <p>© 2026 Global Business OS • IFRS Compliant Database Environment</p>
            </div>
        </div>
    );
}