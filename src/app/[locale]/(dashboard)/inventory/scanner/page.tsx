/**
 * --- BBU1 SOVEREIGN: SCANNER WORKBENCH ROUTE ---
 * VERSION: v2.6 OMEGA (THE LOGISTICS ARCHITECT)
 * JURISDICTION: Professional Inbound Logistics
 */

import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { 
    ScanLine, 
    ShieldCheck, 
    Building2,
    ArrowLeft,
    Activity
} from "lucide-react";
import Link from "next/link";

// --- CORE WORKBENCH COMPONENT ---
import ScannerWorkbench from "@/components/inventory/ScannerWorkbench";

export default async function ScannerPage() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // 1. Authentication Guard - Verifying Hardware Operator Session
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/login');

  // 2. Profile Resolution - Identifying the Node Identity
  const { data: profile } = await supabase
    .from("profiles")
    .select("business_id, business_name")
    .eq("id", user.id)
    .single();

  if (!profile?.business_id) redirect('/dashboard');

  return (
    <main className="min-h-screen bg-white">
      {/* 
          CENTRALIZED WORKSPACE: 
          'max-w-5xl' creates a focused area for hardware operations.
          'animate-in' ensures a smooth transition into the workbench.
      */}
      <div className="max-w-5xl mx-auto py-8 px-6 md:px-10 lg:px-12 space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-700">
        
        {/* --- SOVEREIGN LOGISTICS HEADER --- */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-50 pb-8">
            <div className="space-y-3">
                <div className="flex items-center gap-3 text-blue-600">
                    <div className="p-2 bg-blue-50 rounded-lg">
                        <ScanLine size={18} strokeWidth={2.5} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.3em]">Hardware Inbound Protocol</span>
                </div>
                <h1 className="text-4xl font-black tracking-tighter text-slate-950">Scanner Workbench</h1>
                <div className="flex items-center gap-2">
                    <Building2 size={14} className="text-slate-400" />
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">
                        Node: <span className="text-slate-900">{profile.business_name}</span>
                    </p>
                </div>
            </div>

            {/* EXIT WORKBENCH ACTION */}
            <Link 
                href="/inventory" 
                className="flex items-center gap-2 text-slate-400 hover:text-slate-900 transition-colors group"
            >
                <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Exit Workbench</span>
            </Link>
        </header>

        {/* --- THE SOVEREIGN SCANNING INTERFACE --- */}
        <section className="relative">
            <div className="absolute -top-6 left-2 flex items-center gap-2">
                <ShieldCheck size={14} className="text-emerald-500" />
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Ledger Handshake Encrypted</span>
            </div>
            
            {/* 
                This component handles the 'Deep' Scanner Logic, 
                Multi-Currency Label Printing, and RPC Stock Injection.
            */}
            <ScannerWorkbench businessId={profile.business_id} />
        </section>

        {/* --- INFRASTRUCTURE STATUS FOOTER --- */}
        <footer className="pt-20 pb-12 flex flex-col items-center gap-6">
            <div className="flex items-center gap-4 opacity-20">
                <div className="h-px w-20 bg-slate-300" />
                <Activity size={16} className="text-slate-500" />
                <div className="h-px w-20 bg-slate-300" />
            </div>
            <div className="text-center space-y-1">
                <p className="text-[9px] font-black uppercase tracking-[0.5em] text-slate-400">
                    BBU1 Sovereign Neural Link Active
                </p>
                <p className="text-[8px] font-mono text-slate-300">
                    KERNEL_AUTH: {profile.business_id.substring(0, 18).toUpperCase()}
                </p>
            </div>
        </footer>
      </div>
    </main>
  );
}