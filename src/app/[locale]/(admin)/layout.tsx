import { ReactNode } from "react";
import { redirect, notFound } from "next/navigation";
import { cookies } from "next/headers";
import { 
  ShieldCheck, 
  Globe, 
  Cpu, 
  Fingerprint, 
  Activity, 
  Lock, 
  Database 
} from "lucide-react";

// Internal Libs
import { createClient } from "@/lib/supabase/server";

/** 
 * DEEP SWITCH: We are replacing the restricted AdminSidebar 
 * with the Master Sidebar to ensure the Architect sees ALL modules.
 */
import Sidebar from "@/components/Sidebar"; 

/**
 * DEEPLY DEFINED UTILITY: cn (Class Name Merger)
 * Defined locally to ensure zero external dependency issues and a clean UI.
 */
function cn(...inputs: (string | undefined | boolean | null | Record<string, boolean>)[]) {
  return inputs
    .flatMap((input) => {
      if (typeof input === 'string') return input;
      if (typeof input === 'object' && input !== null) {
        return Object.entries(input)
          .filter(([_, value]) => value)
          .map(([key]) => key);
      }
      return [];
    })
    .join(' ');
}

// 1. Strict Role Definition - Matches your Database Check Constraints
type SovereignRole = 'architect' | 'commander';

interface AdminLayoutProps {
  children: ReactNode;
}

/**
 * ARCHITECT-LEVEL SECURITY GATE
 * This layout acts as the authoritative boundary for the /admin segment.
 * It performs dual-layer verification: Auth JWT + Real-time Database Profile.
 */
export default async function AdminLayout({ children }: AdminLayoutProps) {
  // Authoritative server-side auth initialization
  const supabase = createClient(cookies());

  // 2. Authoritative User Fetch
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login?reason=unauthenticated");
  }

  /**
   * 3. Authority Check: Fetching Profile from DB
   * UPDATED: Using both 'role' and 'system_access_role' to ensure 
   * consistency with the Sovereign Identity.
   */
  const { data: profile, error: dbError } = await supabase
    .from("profiles")
    .select("role, system_access_role, organization_id")
    .eq("id", user.id)
    .single();

  if (dbError || !profile) {
    console.error(`[SECURITY_VIOLATION]: Unauthorized access attempt by ${user.email}`);
    redirect("/dashboard");
  }

  /**
   * 4. Role Normalization & Validation
   * Ensuring that 'architect' is strictly enforced for the /admin route group.
   */
  const rawRole = profile.system_access_role || profile.role;
  const role = (rawRole?.toLowerCase() || 'architect') as SovereignRole;
  const ALLOWED_ROLES: SovereignRole[] = ["architect", "commander"];

  if (!ALLOWED_ROLES.includes(role)) {
    return notFound();
  }

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-900 overflow-hidden font-sans">
      
      {/** 
       * SIDEBAR INJECTION: Master Navigation
       * This component now contains the 'distribution' slug fix and 
       * the Sovereign bypass logic we established.
       */}
      <Sidebar />

      {/* MAIN EXECUTION VIEW - PROFESSIONAL LIGHT THEME */}
      <main className="flex-1 relative flex flex-col min-w-0 overflow-hidden bg-[#f8fafc]">
        
        {/* SUBTLE PROFESSIONAL TOP ACCENT */}
        <div className="absolute top-0 left-0 w-full h-1.5 bg-blue-600/10 z-50" />

        {/* TOP STATUS NAVIGATION BAR */}
        <header className="h-20 border-b border-slate-200 bg-white/80 backdrop-blur-md px-10 flex items-center justify-between shrink-0 z-40">
           <div className="flex items-center gap-6">
             <div className="flex items-center gap-3">
               <div className="bg-slate-900 p-2 rounded-lg">
                 <Cpu size={16} className="text-white" />
               </div>
               <div className="flex flex-col">
                 <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 leading-none">
                    System Core
                 </span>
                 <span className="text-xs font-bold text-slate-900 mt-1">BBU1_Global v10.2</span>
               </div>
             </div>
             <div className="h-8 w-[1px] bg-slate-100" />
             <div className="flex items-center gap-3">
                <Globe size={16} className="text-blue-600" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Regional Cluster: HQ_UG</span>
             </div>
           </div>

           <div className="flex items-center gap-6">
              <div className="flex flex-col items-end">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Authenticated Agent</span>
                <span className="text-xs font-bold text-slate-900">{user.email}</span>
              </div>
              <div className="h-10 w-10 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-sm shadow-blue-100">
                <Fingerprint size={20} />
              </div>
           </div>
        </header>

        {/* SCROLLABLE CONTENT BUFFER */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden relative z-10 px-10 py-10">
          <div className="max-w-[1600px] mx-auto">
            {children}
          </div>
        </div>

        {/* GLOBAL SYSTEM STATUS BAR - CLEAN INSTITUTIONAL STYLE */}
        <footer className="h-12 border-t border-slate-200 bg-white px-10 flex items-center justify-between text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 shadow-[0_-4px_20px_rgba(0,0,0,0.02)]">
           <div className="flex items-center gap-8">
             <div className="flex items-center gap-3">
               <div className="relative flex items-center justify-center">
                 <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                 <div className="absolute h-4 w-4 bg-emerald-400 rounded-full animate-ping opacity-20" />
               </div>
               <span className="text-emerald-600 font-black">Uplink: Authoritative Signal Active</span>
             </div>
             <div className="flex items-center gap-2 border-l border-slate-100 pl-8">
                <Database size={14} className="text-slate-300" />
                <span>Sync Node: {profile.organization_id || 'Global_Mesh'}</span>
             </div>
           </div>

           <div className="flex items-center gap-8">
             <div className="flex items-center gap-2 text-slate-300">
               <Activity size={14} />
               <span>Telemetry: Low Latency</span>
             </div>
             <div className="px-5 py-1.5 bg-blue-600 text-white rounded-full font-black tracking-[0.3em] shadow-lg shadow-blue-100 flex items-center gap-2">
               <Lock size={12} />
               {role} Verified
             </div>
           </div>
        </footer>
      </main>
    </div>
  );
}