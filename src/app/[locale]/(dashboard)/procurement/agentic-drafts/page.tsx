import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AgenticDraftsPanel from '@/components/procurement/AgenticDraftsPanel';
import { Zap, ShieldCheck, AlertCircle, Fingerprint } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default async function AgenticDraftsPage() {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    // 1. HARD SECURITY AUTH GUARD
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) redirect('/login');

    // 2. MASTER IDENTITY RESOLUTION
    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("business_id, business_name, active_organization_slug")
        .eq("id", user.id)
        .single();

    if (profileError || !profile?.business_id) {
        return (
            <div className="p-8">
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Fiduciary Neural Link Mismatch</AlertTitle>
                    <AlertDescription>
                        The Agentic Orchestrator cannot resolve your business context. 
                        Stock monitoring is paused for this session.
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    const businessId = profile.business_id;
    const entityName = profile.business_name || profile.active_organization_slug || "Sovereign Entity";

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 animate-in fade-in duration-1000">
            
            {/* Professional Intelligent Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-8">
                <div className="space-y-1">
                    <h1 className="text-4xl font-black tracking-tighter text-foreground flex items-center gap-3 uppercase italic">
                        <Zap className="w-10 h-10 text-emerald-500 fill-emerald-500" />
                        Agentic Drafts
                    </h1>
                    <p className="text-muted-foreground font-medium">
                        Autonomous Procurement Suggestions for: <span className="text-emerald-600 underline decoration-emerald-500/30 underline-offset-4">{entityName}</span>
                    </p>
                </div>

                <div className="flex flex-col items-end">
                    <div className="bg-slate-900 text-white px-4 py-2 rounded-xl shadow-xl border border-slate-700 flex items-center gap-3">
                        <Fingerprint size={16} className="text-emerald-400" />
                        <span className="text-[10px] font-black uppercase tracking-widest font-mono">
                            Kernel v10.2 // Secured
                        </span>
                    </div>
                </div>
            </div>

            {/* AI Context Banner */}
            <Alert className="bg-emerald-50/50 border-emerald-200">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <AlertTitle className="text-emerald-900 font-bold uppercase text-[10px] tracking-widest">Autonomous Orchestration Active</AlertTitle>
                <AlertDescription className="text-emerald-700 text-xs">
                    The AI Sourcing Agent has analyzed your real-time stock levels. 
                    Drafts below were created based on low inventory thresholds and preferred supplier logic.
                </AlertDescription>
            </Alert>

            {/* Main Panel Interface */}
            <AgenticDraftsPanel businessId={businessId} />

            {/* Technical Footer */}
            <div className="mt-12 pt-6 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 opacity-50 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                <div className="flex items-center gap-2 italic">
                    <Zap size={14} className="text-emerald-500 fill-current" />
                    Neural Sourcing Handshake Protocol v10.2.4
                </div>
                <div className="font-mono">
                    ENTITY_HASH: {businessId.substring(0,12).toUpperCase()}
                </div>
            </div>
        </div>
    );
}