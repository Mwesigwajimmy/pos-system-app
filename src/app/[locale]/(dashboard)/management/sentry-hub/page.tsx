import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import SentryHub from '@/components/management/SentryHub';
import { ShieldAlert, Fingerprint, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default async function SentryHubPage() {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    // 1. HARD SECURITY AUTHENTICATION GUARD
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) redirect('/login');

    // 2. MASTER IDENTITY RESOLUTION
    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("tenant_id, business_name, active_organization_slug")
        .eq("id", user.id)
        .single();

    if (profileError || !profile?.tenant_id) {
        return (
            <div className="p-8">
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Hardware Protocol Error</AlertTitle>
                    <AlertDescription>
                        The Robotic Guard could not resolve a valid tenant perimeter. 
                        Security monitoring is offline for this session.
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    const tenantId = profile.tenant_id;
    const entityName = profile.business_name || profile.active_organization_slug || "Sovereign Entity";

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 animate-in fade-in duration-1000 bg-slate-50/30">
            
            {/* Top-Level Context Badge */}
            <div className="flex items-center justify-between opacity-60">
                <div className="flex items-center gap-2 px-3 py-1 bg-slate-900 text-white rounded-md text-[9px] font-mono tracking-widest uppercase">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Active Perimeter: {entityName}
                </div>
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.3em]">
                    Sovereign Sentry Engine v10.2
                </div>
            </div>

            {/* Main Robotic UI Interface */}
            <SentryHub tenantId={tenantId} />

            {/* Fiduciary Disclaimer Footer */}
            <div className="mt-12 pt-6 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4 opacity-40">
                <p className="text-[9px] text-muted-foreground uppercase tracking-[0.2em] font-medium leading-relaxed">
                    Robotic Sentry Protocol // Automated Theft Prevention // ISA-700 / ISO-27001 Compliant
                </p>
                <div className="text-[9px] font-mono whitespace-nowrap bg-slate-100 px-2 py-1 rounded">
                   DEVICE_MESH_ID: {tenantId.substring(0,12).toUpperCase()}
                </div>
            </div>
        </div>
    );
}