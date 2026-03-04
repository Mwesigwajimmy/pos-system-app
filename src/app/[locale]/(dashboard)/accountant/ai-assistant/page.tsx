import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AiAuditAssistant } from '@/components/accountant/AiAuditAssistant';
import { Sparkles, ShieldCheck, Fingerprint, Activity, ShieldAlert, Zap } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from '@/components/ui/badge';

/**
 * --- AI AUDIT MISSION CONTROL PAGE ---
 * Resolves the Master Identity Handshake to activate Aura across all business types.
 */
export default async function AiAuditAssistantPage() {
    // 1. ASYNC COOKIE RESOLUTION
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    // 2. HARD SECURITY AUTHENTICATION GUARD
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) redirect('/login');

    // 3. MASTER IDENTITY & SECTOR RESOLUTION
    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select(`
            id,
            business_id, 
            tenant_id, 
            organization_id,
            business_name,
            industry,
            business_type,
            tenants (
                id,
                industry,
                name,
                business_type
            )
        `)
        .eq("id", user.id)
        .single();

    /**
     * --- SOVEREIGN HANDSHAKE RESOLUTION ---
     * Resolves the identity through multiple forensic paths to prevent RLS blocks.
     */
    const rawTenantData = profile?.tenants as any;
    
    const resolvedBusinessId = 
        profile?.business_id || 
        profile?.tenant_id || 
        (profile as any)?.organization_id || 
        rawTenantData?.id ||
        (user.app_metadata?.business_id as string) || 
        '';

    const industry = 
        profile?.industry || 
        (profile as any)?.business_type || 
        rawTenantData?.industry || 
        "General Enterprise";

    const entityName = 
        profile?.business_name || 
        rawTenantData?.name || 
        "Authorized Sovereign Entity";

    // 4. FIDUCIARY VALIDATION GATE
    if (profileError || !resolvedBusinessId) {
        return (
            <div className="p-8">
                <Alert variant="destructive" className="border-2 shadow-2xl bg-destructive/5">
                    <ShieldAlert className="h-5 w-5" />
                    <AlertTitle className="font-black uppercase tracking-widest text-xs">Fiduciary Neural Link Failure</AlertTitle>
                    <AlertDescription className="text-xs font-medium mt-2 leading-relaxed">
                        The AI Assistant could not establish a secure link. 
                        Handshake failed to resolve across all 5 forensic paths.
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            
            {/* Header: Professional Forensic Interface */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-8 relative overflow-hidden">
                <div className="space-y-1 relative z-10">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-slate-900 rounded-xl shadow-lg border border-emerald-500/20">
                            <Sparkles className="w-6 h-6 text-emerald-400 animate-pulse" />
                        </div>
                        <h1 className="text-4xl font-black tracking-tighter text-slate-900">
                            Forensic Co-Pilot
                        </h1>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                        <Badge variant="outline" className="bg-emerald-50/50 text-[10px] py-0.5 px-3 font-mono border-emerald-100 text-emerald-700">
                            <Activity className="w-3 h-3 mr-2 animate-ping" />
                            {industry.toUpperCase()} PROTOCOL
                        </Badge>
                        <p className="text-slate-400 uppercase text-[9px] font-black tracking-[0.2em] ml-2">
                            Auditor Context: <span className="text-slate-900">{entityName}</span>
                        </p>
                    </div>
                </div>
                
                {/* Status Telemetry */}
                <div className="flex items-center gap-6 bg-white p-5 rounded-2xl border border-slate-100 shadow-xl">
                    <div className="flex flex-col items-end">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] leading-none">Neural Link Status</span>
                        <div className="flex items-center gap-2 mt-2">
                            <span className="animate-ping h-2 w-2 rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="text-[11px] font-black text-emerald-700 uppercase">v10.5 PRO ONLINE</span>
                        </div>
                    </div>
                    <div className="h-10 w-px bg-slate-100 hidden md:block" />
                    <ShieldCheck className="h-8 w-8 text-emerald-500 opacity-80" />
                </div>
            </div>

            {/* Assistant Interface */}
            <div className="max-w-6xl mx-auto w-full">
                <AiAuditAssistant />
            </div>

            {/* Footer Traceability */}
            <div className="mt-12 pt-8 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="flex items-center gap-4 px-5 py-3 bg-white rounded-2xl border border-slate-100 shadow-sm">
                    <Fingerprint size={20} className="text-slate-900" />
                    <div className="flex flex-col">
                        <span className="text-[10px] font-mono font-bold text-slate-700 leading-none">AUTH_USER: {user.email}</span>
                        <span className="text-[9px] font-mono text-emerald-600 font-bold uppercase mt-1.5">SECURE_TRACE: {resolvedBusinessId.substring(0,24).toUpperCase()}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}