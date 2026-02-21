import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AiAuditAssistant } from '@/components/accountant/AiAuditAssistant';
import { Sparkles, ShieldCheck, AlertCircle, Fingerprint } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default async function AiAuditAssistantPage() {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    // 1. HARD SECURITY AUTHENTICATION GUARD
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) redirect('/login');

    // 2. MASTER IDENTITY RESOLUTION
    // Pulling all IDs and Entity Name from the Master 'profiles' table
    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("business_id, tenant_id, active_organization_slug, business_name")
        .eq("id", user.id)
        .single();

    if (profileError || !profile?.business_id) {
        return (
            <div className="p-8">
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Fiduciary Neural Link Failure</AlertTitle>
                    <AlertDescription>
                        The AI Assistant could not establish a secure link to your business context. 
                        Please verify your profile synchronization.
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    const entityName = profile.business_name || profile.active_organization_slug || "Sovereign Entity";

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 animate-in fade-in duration-1000">
            
            {/* High-Tier Intelligence Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-6">
                <div>
                    <h1 className="text-3xl font-black tracking-tighter text-foreground flex items-center gap-3">
                        <Sparkles className="w-8 h-8 text-primary animate-pulse" />
                        Forensic Co-Pilot
                    </h1>
                    <p className="text-muted-foreground mt-1 uppercase text-[10px] font-bold tracking-[0.2em]">
                        Neural Auditor Interface for: <span className="text-primary">{entityName}</span>
                    </p>
                </div>
                
                {/* Kernel Status Badge */}
                <div className="flex items-center gap-4">
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Kernel Status</span>
                        <div className="flex items-center gap-1.5 mt-1">
                            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                            <span className="text-xs font-bold text-emerald-600 uppercase">v10.1 Connected</span>
                        </div>
                    </div>
                    <div className="h-10 w-px bg-slate-200 hidden md:block" />
                    <ShieldCheck className="h-8 w-8 text-slate-300" />
                </div>
            </div>

            {/* AI Assistant Interface */}
            <div className="max-w-5xl mx-auto w-full">
                <AiAuditAssistant />
            </div>

            {/* Forensic Disclaimer Footer */}
            <div className="mt-8 pt-4 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 opacity-50">
                <div className="flex items-center gap-2">
                    <Fingerprint size={14} className="text-slate-400" />
                    <span className="text-[9px] font-mono uppercase tracking-widest">
                        Identity Verified: {user.email} // Trace ID: {profile.business_id.substring(0,8).toUpperCase()}
                    </span>
                </div>
                <p className="text-[9px] text-muted-foreground text-center italic">
                    AI suggestions are based on heuristic DNA scans of the Ledger. 
                    Final certification requires manual Lead Auditor verification.
                </p>
            </div>
        </div>
    );
}