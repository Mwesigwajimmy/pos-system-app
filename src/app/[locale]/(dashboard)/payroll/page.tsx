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
    ShieldCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PayrollHistoryTable } from '@/components/payroll/PayrollHistoryTable';
import { StartPayrollRunForm } from '@/components/payroll/StartPayrollRunForm';

/**
 * LITONU BUSINESS BASE UNIVERSE LTD - PAYROLL CONTROL CENTER
 * 
 * UPGRADE: Deep Identity & Tenancy Resolution.
 * This server component is the authoritative gateway for multi-tenant 
 * labor financial management across the BBU1 Global network.
 */
export default async function PayrollPage({ params: { locale } }: { params: { locale: string } }) {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    
    // 1. AUTHENTICATION & SOVEREIGN IDENTITY RESOLUTION
    // Resolving the human operator and their active security tier.
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) redirect(`/${locale}/auth/login`);

    // Fetch the profile with support for your 60+ job roles and system power levels
    const { data: profile } = await supabase
        .from('profiles')
        .select('business_id, full_name, role, system_access_role')
        .eq('id', user.id)
        .single();

    const businessId = profile?.business_id;
    const isSovereign = profile?.system_access_role === 'architect' || profile?.system_access_role === 'commander';

    // 2. MULTI-TENANT SECURITY GATE
    if (!businessId && !isSovereign) {
        return (
            <div className="flex h-[80vh] flex-col items-center justify-center gap-4 p-8">
                <div className="rounded-full bg-red-100 p-6 text-red-600">
                    <ShieldAlert className="h-12 w-12" />
                </div>
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-black tracking-tighter text-slate-900 uppercase">Access Restricted</h1>
                    <p className="text-slate-500 max-w-sm">
                        LITONU Security Protocol: This identity node is not linked to an active Business Entity.
                    </p>
                </div>
            </div>
        );
    }

    // 3. AUTHORITATIVE BRANDING & ENTITY RESOLUTION
    // Priority: 1. Branding Table -> 2. Tenant Table -> 3. Fallback
    // This ensures NIM UGANDA LTD shows up instead of the generic organization string.
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

    const tenantName = branding?.company_name_display || tenant?.name || "Sovereign Node";

    // 4. ENTERPRISE DATA FETCHING (PHYSICAL LEDGER SYNC)
    // Pulling the record of labor disbursements from the 'hr_' prefixed tables.
    const { data: runs, error: runError } = await supabase
        .from('hr_payroll_runs')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });

    if (runError) {
        console.error("[BBU1-PAYROLL] Ledger Sync Error:", runError.message);
    }

    return (
        <div className="p-4 md:p-8 space-y-10 bg-slate-50/30 min-h-screen">
            
            {/* Executive Context Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b pb-8">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs font-black text-blue-600 uppercase tracking-widest">
                        <LayoutDashboard className="h-3 w-3" />
                        <span>Human Capital Management</span>
                    </div>
                    <h1 className="text-4xl font-black tracking-tighter text-slate-900 uppercase">
                        Payroll Control Center
                    </h1>
                    <p className="text-sm text-muted-foreground flex items-center gap-2 font-medium">
                        Operator: <span className="text-slate-700 font-bold">{profile?.full_name}</span> 
                        <span className="text-slate-300">|</span>
                        Authorized Role: <span className="text-blue-600 font-bold uppercase">{profile?.role?.replace('_', ' ')}</span>
                        <span className="text-slate-300">|</span>
                        Entity: <span className="text-slate-900 font-bold">{tenantName}</span>
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
                    <PlusCircle className="h-5 w-5 text-blue-600" />
                    <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Initiate Pay Cycle</h2>
                </div>
                <StartPayrollRunForm 
                    tenantId={businessId as string} 
                    tenantName={tenantName}
                />
            </div>

            {/* REGISTRY SECTION: HISTORY */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <History className="h-5 w-5 text-blue-600" />
                    <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Payroll Registry & Audit Trail</h2>
                </div>
                {/* 
                    Multi-tenant data provided to the Audit Ledger component
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
                        <Landmark className="h-3.5 w-3.5"/> General Ledger (GADS) Integrated
                    </span>
                    <span className="flex items-center gap-1 text-blue-600">
                        <ShieldCheck className="h-3.5 w-3.5"/> Multi-Tax Protocol Sealed
                    </span>
                </div>
                <p>© 2026 LITONU BUSINESS BASE UNIVERSE LTD • IFRS Compliant Environment</p>
            </div>
        </div>
    );
}