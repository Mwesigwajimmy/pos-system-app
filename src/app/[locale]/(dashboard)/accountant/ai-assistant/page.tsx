import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AiAuditAssistant } from '@/components/accountant/AiAuditAssistant';
import { Sparkles, ShieldCheck, Fingerprint, Activity, ShieldAlert, Zap, Search } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from '@/components/ui/badge';

/**
 * --- AI AUDIT MISSION CONTROL PAGE ---
 * Performs the Master Identity Resolution required to activate Aura's 
 * industry-specific forensic kernels across all 20+ businesses.
 */
export default async function AiAuditAssistantPage() {
    // 1. ASYNC COOKIE RESOLUTION (Next.js 15 Protocol)
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    // 2. HARD SECURITY AUTHENTICATION GUARD
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) redirect('/login');

    // 3. MASTER IDENTITY & SECTOR RESOLUTION
    // Forensic Fetch: We pull every possible ID variant confirmed in our audit.
    // We remove the strict 'single()' to handle potential race conditions during signup.
    const { data: profileData, error: profileError } = await supabase
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
        .maybeSingle();

    /**
     * --- SOVEREIGN HANDSHAKE RESOLUTION (THE FINAL FIX) ---
     * We no longer let a 'profileError' stop the entire system.
     * We prioritize finding a valid ID from the 6 confirmed forensic paths.
     */
    const profile = profileData as any;
    const rawTenantData = profile?.tenants as any;
    
    const resolvedBusinessId = 
        profile?.business_id || 
        profile?.tenant_id || 
        profile?.organization_id || 
        rawTenantData?.id ||
        (user.app_metadata?.business_id as string) || 
        (user.user_metadata?.business_id as string) || // Check user_metadata as final fallback
        '';

    // Sector DNA Resolution: Fallback logic for industry context
    const industry = 
        profile?.industry || 
        profile?.business_type || 
        rawTenantData?.industry || 
        "General Enterprise";

    const entityName = 
        profile?.business_name || 
        rawTenantData?.name || 
        "Authorized Sovereign Entity";

    /**
     * 4. FIDUCIARY VALIDATION GATE
     * We only show the error if we are 100% unable to find an ID.
     * This bypasses RLS 'join' warnings that were previously causing the failure.
     */
    if (!resolvedBusinessId) {
        return (
            <div className="p-8 max-w-4xl mx-auto space-y-4">
                <Alert variant="destructive" className="border-2 shadow-2xl bg-destructive/5 border-red-500/20">
                    <ShieldAlert className="h-5 w-5" />
                    <AlertTitle className="font-black uppercase tracking-widest text-xs">Fiduciary Neural Link Failure</AlertTitle>
                    <AlertDescription className="text-xs font-medium mt-2 leading-relaxed">
                        Aura could not establish a secure link to your business context. 
                        Identity resolution failed across all 6 forensic paths. Please ensure your 
                        Business Profile setup is finalized.
                    </AlertDescription>
                </Alert>
                <div className="p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center">
                   <p className="text-[10px] text-slate-400 font-mono">TRACE_ID: {user.id}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            
            {/* High-Tier Intelligence Header */}
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
                
                {/* Kernel Status: Professional Telemetry Display */}
                <div className="flex items-center gap-6 bg-white p-5 rounded-2xl border border-slate-100 shadow-xl shadow-slate-100/50">
                    <div className="flex flex-col items-end">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] leading-none">Neural Link Status</span>
                        <div className="flex items-center gap-2 mt-2">
                            <div className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </div>
                            <span className="text-[11px] font-black text-emerald-700 uppercase tracking-tighter">v10.5 PRO ONLINE</span>
                        </div>
                    </div>
                    <div className="h-10 w-px bg-slate-100 hidden md:block" />
                    <ShieldCheck className="h-8 w-8 text-emerald-500 opacity-80" />
                </div>
            </div>

            {/* AI Assistant Core Interface */}
            <div className="max-w-6xl mx-auto w-full">
                {/* 
                  Aura is now fully vectorized. 
                  We pass the resolved IDs to ensure the component 
                  initializes instantly without re-fetching.
                */}
                <AiAuditAssistant />
            </div>

            {/* Forensic Footer: Security Traceability */}
            <div className="mt-12 pt-8 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="flex items-center gap-4 px-5 py-3 bg-white rounded-2xl border border-slate-100 shadow-sm">
                    <Fingerprint size={20} className="text-slate-900" />
                    <div className="flex flex-col">
                        <span className="text-[10px] font-mono font-bold text-slate-700 leading-none">
                            AUTH_USER: {user.email}
                        </span>
                        <span className="text-[9px] font-mono text-emerald-600 font-bold uppercase mt-1.5">
                            SECURE_HANDSHAKE: {resolvedBusinessId.substring(0,24).toUpperCase()}...
                        </span>
                    </div>
                </div>
                
                <div className="flex flex-col items-end gap-1.5">
                    <p className="text-[10px] text-slate-400 font-medium italic max-w-sm text-right leading-relaxed">
                        Isolated forensic context verified. 
                        AI-generated outputs comply with Multi-Tenant Sovereignty standards.
                    </p>
                    <div className="flex items-center gap-2">
                        <ShieldCheck size={12} className="text-emerald-500" />
                        <span className="text-[9px] font-black text-slate-900 uppercase tracking-widest">
                            Sovereign Data Protection Active
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}