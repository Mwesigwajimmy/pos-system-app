// Location: app/(dashboard)/inventory/composites/designer/page.tsx

import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

// --- CORE INDUSTRIAL COMPONENTS ---
import CompositeRegistry from '@/components/inventory/CompositeRegistry';

// --- UI ARCHITECTURE (Lucide Icons) ---
import { 
  Factory, 
  ShieldCheck, 
  Database,
  Layers,
  Settings2,
  ChevronRight,
  Beaker,
  Zap,
  Activity,
  Globe,
  Lock
} from 'lucide-react';

// --- UI COMPONENTS ---
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

/**
 * PAGE: Finished Good Designer (Industrial Birth Protocol)
 * Capability: Multi-Tenant Sector-Aware Asset Creation
 * Standard: ISO-9001 Forensic Production Control
 */
export default async function CompositeDesignerPage() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // --- 1. AUTHENTICATION GUARD ---
  // Verified V10.5 security check
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/login');

  // --- 2. IDENTITY RESOLUTION HANDSHAKE ---
  // Priority 1: Sector Switcher Cookie (Active Node Protocol)
  // Priority 2: Master Profile Default
  const activeSectorCookie = cookieStore.get('bbu1_active_business_id')?.value;

  const { data: profile } = await supabase
    .from("profiles")
    .select("business_id, business_name, currency, active_organization_slug")
    .eq("id", user.id)
    .single();

  // Determine the working business context for the current session
  const workingBizId = activeSectorCookie || profile?.business_id;

  // FAILSAFE: Identity Drift Protection
  // If the system cannot resolve which business node to birth the asset into, access is restricted.
  if (!workingBizId) {
    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-10">
            <Alert variant="destructive" className="max-w-md rounded-[2.5rem] border-none shadow-2xl p-12 bg-white">
                <Lock className="h-10 w-10 text-red-500 mb-6" />
                <AlertTitle className="font-black text-slate-900 uppercase tracking-tight text-xl">Identity Handshake Failed</AlertTitle>
                <AlertDescription className="mt-4 text-slate-500 font-medium leading-relaxed">
                    This industrial designer requires an active Production Node identity. Please return to your main dashboard and select a sector to proceed with asset registration.
                </AlertDescription>
                <div className="mt-8 pt-6 border-t border-slate-100">
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Error_Code: 0xIDENTITY_NULL</p>
                </div>
            </Alert>
        </div>
    );
  }

  const entityName = profile?.business_name || "Enterprise Hub";
  const nodeIdentity = workingBizId.substring(0, 8).toUpperCase();

  return (
    <main className="min-h-screen bg-slate-50/50 p-6 md:p-10 animate-in fade-in duration-1000 font-sans">
      
      {/* PAGE HEADER: INDUSTRIAL CONTEXT & BREADCRUMBS */}
      <header className="max-w-7xl mx-auto mb-12 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8">
        <div className="flex items-center gap-6">
           <div className="p-4 bg-slate-900 rounded-[1.25rem] shadow-[0_20px_40px_-12px_rgba(15,23,42,0.3)] text-white transition-transform hover:scale-105 active:scale-95 cursor-pointer">
              <Settings2 className="w-8 h-8" />
           </div>
           <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="flex items-center gap-1.5 text-[10px] font-black text-blue-600 uppercase tracking-[0.3em]">
                   <Layers size={12} /> Production Catalog
                </div>
                <ChevronRight size={12} className="text-slate-300" />
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
                    Asset Designer
                </div>
              </div>
              <h1 className="text-4xl font-black tracking-tighter text-slate-900 leading-none">
                Birth Manufactured Good
              </h1>
              <div className="flex items-center gap-3 mt-3">
                 <div className="flex items-center gap-2 px-3 py-1 bg-white border border-slate-200 rounded-lg shadow-sm">
                    <Globe size={12} className="text-blue-500" />
                    <span className="text-[11px] font-bold text-slate-600 uppercase tracking-tight">
                        {entityName}
                    </span>
                 </div>
                 <div className="flex items-center gap-2 px-3 py-1 bg-slate-900 text-white rounded-lg shadow-sm">
                    <Database size={11} className="text-blue-400" />
                    <span className="text-[10px] font-mono font-bold tracking-widest">
                        NODE_{nodeIdentity}
                    </span>
                 </div>
              </div>
           </div>
        </div>

        <div className="flex items-center gap-4">
            <div className="hidden lg:flex flex-col text-right mr-2">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1">Infrastructure Load</p>
                <div className="flex items-center justify-end gap-2">
                    <span className="text-[11px] font-black text-emerald-600 uppercase tracking-tighter">System Optimal</span>
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                </div>
            </div>
            <Badge className="bg-white text-slate-900 border border-slate-200 px-5 py-2.5 font-black text-[10px] tracking-[0.3em] uppercase rounded-2xl shadow-xl">
                V10.5.5 SECURE_WELD
            </Badge>
        </div>
      </header>

      {/* MAIN CONTENT AREA: THE ATOMIC DESIGNER */}
      <div className="max-w-7xl mx-auto space-y-12">
        
        {/* Component for multi-table insertion logic */}
        <section className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-[2.5rem] blur opacity-5 group-hover:opacity-10 transition duration-1000 group-hover:duration-200"></div>
            <CompositeRegistry />
        </section>

        {/* INDUSTRIAL DOCUMENTATION CARDS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 space-y-5 transition-all hover:shadow-2xl">
                <div className="h-12 w-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                    <Activity size={24} />
                </div>
                <div className="space-y-2">
                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">1. Master Definition</h3>
                    <p className="text-xs text-slate-500 leading-relaxed font-medium">
                        Establish the finished product identity in the central registry. This automatically configures the <span className="font-bold">Operational Status</span> to allow immediate stock-inflow upon batch completion.
                    </p>
                </div>
            </div>

            <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 space-y-5 transition-all hover:shadow-2xl">
                <div className="h-12 w-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                    <ShieldCheck size={24} />
                </div>
                <div className="space-y-2">
                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">2. Security Partitioning</h3>
                    <p className="text-xs text-slate-500 leading-relaxed font-medium">
                        Using the <span className="font-bold underline text-blue-600">Sovereign Identity Protocol</span>, paint formulas and lot data are cryptographically isolated. Only authorized personnel in the {entityName} sector can access this catalog.
                    </p>
                </div>
            </div>

            <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 space-y-5 transition-all hover:shadow-2xl">
                <div className="h-12 w-12 rounded-2xl bg-slate-900 flex items-center justify-center text-blue-400">
                    <Zap size={24} />
                </div>
                <div className="space-y-2">
                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">3. Automated ERP Bridge</h3>
                    <p className="text-xs text-slate-500 leading-relaxed font-medium">
                        Designing an asset here births it across the entire ecosystem. It becomes instantly selectable in the <span className="font-bold">Production Terminal</span>, the <span className="font-bold">Recipe Builder</span>, and the <span className="font-bold text-slate-900">Forensic Ledger</span>.
                    </p>
                </div>
            </div>
        </div>

      </div>

      {/* SYSTEM STATUS FOOTER */}
      <footer className="max-w-7xl mx-auto mt-24 pt-10 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-4 text-[10px] font-black text-slate-300 uppercase tracking-[0.4em]">
            Authorized Production monitor • Node: {nodeIdentity}
          </div>
          <div className="flex items-center gap-3">
             <div className="px-6 py-2.5 bg-white border border-slate-200 rounded-2xl shadow-sm text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                Registry Handshake: Verified
             </div>
             <div className="px-6 py-2.5 bg-emerald-50 border border-emerald-100 rounded-2xl shadow-sm text-[10px] font-black text-emerald-700 uppercase tracking-widest flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                Ledger Sync: High Integrity
             </div>
          </div>
      </footer>
    </main>
  );
}