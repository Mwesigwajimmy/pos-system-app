import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import SentryHub from '@/components/management/SentryHub';
import { ShieldAlert, Fingerprint, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

/**
 * SentryHub Page - Server-Side Identity Guard
 * Resolves the tenant perimeter and initializes the physical hardware engine.
 */
export default async function SentryHubPage() {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    // 1. HARD SECURITY AUTHENTICATION GUARD
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) redirect('/login');

    // 2. MASTER IDENTITY RESOLUTION (Identifying the Business)
    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("tenant_id, business_name, active_organization_slug")
        .eq("id", user.id)
        .single();

    // 3. PERIMETER VALIDATION
    if (profileError || !profile?.tenant_id) {
        return (
            <div className="p-8 max-w-4xl mx-auto">
                <Alert variant="destructive" className="rounded-[2rem] border-2 p-8 bg-red-50/50">
                    <AlertCircle className="h-6 w-6" />
                    <AlertTitle className="font-black uppercase tracking-widest text-lg">Hardware Protocol Error</AlertTitle>
                    <AlertDescription className="font-medium text-sm mt-2 opacity-80 leading-relaxed">
                        The Robotic Guard could not resolve a valid tenant perimeter. 
                        Security monitoring and physical hardware connectivity are offline. 
                        Please ensure your account is assigned to a valid Organization Mesh.
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    const tenantId = profile.tenant_id;
    const entityName = profile.business_name || profile.active_organization_slug || "Sovereign Entity";

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 animate-in fade-in duration-1000 bg-slate-50/30 min-h-screen">
            
            {/* Top-Level Context Badge */}
            <div className="flex items-center justify-between opacity-60 px-2">
                <div className="flex items-center gap-2 px-4 py-1.5 bg-slate-900 text-white rounded-full text-[9px] font-mono tracking-widest uppercase">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    Active Perimeter: {entityName}
                </div>
                <div className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em]">
                    Sovereign Sentry Engine v10.5 PRO // Enterprise Grade
                </div>
            </div>

            {/* THE BRAIN: Main Robotic UI Interface */}
            <SentryHub tenantId={tenantId} />

            {/* Fiduciary Disclaimer Footer */}
            <div className="mt-12 pt-8 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4 opacity-40">
                <p className="text-[9px] text-muted-foreground uppercase tracking-[0.3em] font-bold leading-relaxed text-center md:text-left">
                    Robotic Sentry Protocol // Automated Theft Prevention // ISA-700 / ISO-27001 Compliant
                </p>
                <div className="text-[9px] font-mono whitespace-nowrap bg-white border border-slate-200 px-3 py-1 rounded-lg shadow-sm">
                   MESH_AUTH_SIG: {tenantId.substring(0,16).toUpperCase()}
                </div>
            </div>
        </div>
    );
}