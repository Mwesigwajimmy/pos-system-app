import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ComplianceDrilldown } from '@/components/compliance/ComplianceDrilldown';
import { Activity, ShieldAlert, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default async function ComplianceDrilldownPage() {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    // 1. HARD SECURITY AUTHENTICATION GUARD
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) redirect('/login');

    // 2. MASTER IDENTITY RESOLUTION (Absolute Truth)
    // We fetch from 'profiles' because our audit proved that's where tenant_id lives.
    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("tenant_id, active_organization_slug, business_name")
        .eq("id", user.id)
        .single();

    // 3. ENTERPRISE SAFETY GATE
    if (profileError || !profile?.tenant_id) {
        console.error("Fiduciary Identity Failure:", profileError);
        return (
            <div className="p-8">
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Identity Perimeter Breach</AlertTitle>
                    <AlertDescription>
                        The forensic engine could not resolve a valid Tenant ID for this session. 
                        Drilldown capabilities are locked until profile synchronization is complete.
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    const entityName = profile.business_name || profile.active_organization_slug || "Sovereign Entity";

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 animate-in fade-in duration-500">
            {/* Header Section: Forensic Intelligence Branding */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
                        <Activity className="w-8 h-8 text-blue-600" />
                        Compliance Forensic Drilldown
                    </h1>
                    <p className="text-muted-foreground mt-1 uppercase text-[10px] font-bold tracking-widest leading-none">
                        Autonomous Matrix Surveillance for: <span className="text-blue-600">{entityName}</span>
                    </p>
                </div>
                
                {/* Protocol Badge */}
                <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 px-4 py-2 rounded-lg shadow-xl shadow-blue-900/10">
                    <ShieldAlert size={16} className="text-emerald-500 animate-pulse" />
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Protocol</span>
                        <span className="text-[10px] font-bold text-white uppercase">Forensic Matrix v10.1</span>
                    </div>
                </div>
            </div>

            {/* Main Component: Physically Connected via Real Tenant ID */}
            <div className="grid gap-6">
                <ComplianceDrilldown 
                    tenantId={profile.tenant_id} 
                    user={user.email || 'SYSTEM_OPERATOR'}
                />
            </div>

            {/* Fiduciary Disclaimer Footer */}
            <p className="text-[9px] text-muted-foreground text-center mt-12 uppercase tracking-[0.3em] font-medium opacity-40">
                Data Sovereignty Verified // Multi-Tenant Perimeter ID: {profile.tenant_id.substring(0,8).toUpperCase()}
            </p>
        </div>
    );
}