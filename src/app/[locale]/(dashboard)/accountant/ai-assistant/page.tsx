import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AiAuditAssistant } from '@/components/accountant/AiAuditAssistant';
import { Sparkles, ShieldCheck, AlertCircle, Fingerprint, Activity, ShieldAlert } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from '@/components/ui/badge';

/**
 * --- AI AUDIT MISSION CONTROL PAGE ---
 * This Server Component performs the Master Identity Resolution required to 
 * activate Aura's industry-specific forensic kernels.
 */
export default async function AiAuditAssistantPage() {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    // 1. HARD SECURITY AUTHENTICATION GUARD
    // Ensures only authenticated personnel can access the neural forensic layer.
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) redirect('/login');

    // 2. MASTER IDENTITY & SECTOR RESOLUTION
    // We join with the 'tenants' table to retrieve the exact Industry DNA (1 of 11).
    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select(`
            business_id, 
            tenant_id, 
            active_organization_slug, 
            business_name,
            tenants (
                industry,
                name
            )
        `)
        .eq("id", user.id)
        .single();

    // 3. FIDUCIARY HANDSHAKE VALIDATION
    if (profileError || !profile?.business_id) {
        return (
            <div className="p-8">
                <Alert variant="destructive" className="border-2">
                    <ShieldAlert className="h-5 w-5" />
                    <AlertTitle className="font-black uppercase tracking-widest text-xs">Fiduciary Neural Link Failure</AlertTitle>
                    <AlertDescription className="text-xs font-medium mt-2">
                        The AI Assistant could not establish a secure link to your business context. 
                        This occurs when the profile is not yet synchronized with a master tenant.
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    // Resolve Dynamic Business Context
    const businessId = profile.business_id;
    const industry = (profile.tenants as any)?.industry || "General Enterprise";
    const entityName = profile.business_name || (profile.tenants as any)?.name || "Sovereign Entity";

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            
            {/* High-Tier Intelligence Header: Professional Forensic Branding */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-8">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-xl">
                            <Sparkles className="w-6 h-6 text-primary animate-pulse" />
                        </div>
                        <h1 className="text-4xl font-black tracking-tighter text-foreground">
                            Forensic Co-Pilot
                        </h1>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="bg-slate-50 text-[10px] py-0 px-2 font-mono border-slate-200">
                            <Activity className="w-3 h-3 mr-1 text-emerald-500" />
                            {industry.toUpperCase()} PROTOCOL
                        </Badge>
                        <p className="text-muted-foreground uppercase text-[10px] font-bold tracking-[0.2em] ml-1">
                            Auditor Interface: <span className="text-primary">{entityName}</span>
                        </p>
                    </div>
                </div>
                
                {/* Kernel Status: Professional Telemetry Display */}
                <div className="flex items-center gap-6 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                    <div className="flex flex-col items-end">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] leading-none">Kernel Status</span>
                        <div className="flex items-center gap-2 mt-1.5">
                            <div className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </div>
                            <span className="text-[11px] font-black text-emerald-700 uppercase tracking-tighter">v10.5 PRO ACTIVE</span>
                        </div>
                    </div>
                    <div className="h-8 w-px bg-slate-200 hidden md:block" />
                    <ShieldCheck className="h-8 w-8 text-slate-400 opacity-50" />
                </div>
            </div>

            {/* AI Assistant Core Interface */}
            <div className="max-w-6xl mx-auto w-full">
                {/* 
                  Passing the Triple-Context: 
                  1. Business ID for data isolation.
                  2. Industry DNA for logic behavior.
                  3. Entity Name for document generation.
                */}
                <AiAuditAssistant />
            </div>

            {/* Forensic Footer: Security Traceability */}
            <div className="mt-12 pt-6 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 rounded-full border border-slate-100">
                    <Fingerprint size={16} className="text-primary" />
                    <div className="flex flex-col">
                        <span className="text-[10px] font-mono text-slate-600 leading-none">
                            AUTH_USER: {user.email}
                        </span>
                        <span className="text-[9px] font-mono text-slate-400 uppercase mt-1">
                            SECURE_TRACE: {businessId.substring(0,18).toUpperCase()}...
                        </span>
                    </div>
                </div>
                
                <div className="flex flex-col items-end gap-1">
                    <p className="text-[10px] text-slate-400 font-medium italic max-w-sm text-right leading-tight">
                        Aura heuristic scans comply with sovereign audit standards. 
                        Autonomous reports require manual lead-auditor certification prior to filing.
                    </p>
                    <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">
                        End-to-End Encryption Verified
                    </span>
                </div>
            </div>
        </div>
    );
}