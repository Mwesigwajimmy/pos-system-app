import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import SovereignLiveGuard from "@/components/audit/SovereignLiveGuard";
import { ShieldAlert, Zap, Activity, Fingerprint } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default async function LiveGuardMonitorPage() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // 1. Server-Side Forensic Authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return (
      <div className="p-8">
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Security Breach Prevention</AlertTitle>
          <AlertDescription>
            Unauthenticated access to the Sovereign LiveGuard is prohibited. Your IP has been logged.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // 2. Resolve Multi-Tenant Perimeter (Active Entity)
  const { data: userProfile } = await supabase
    .from("user_profiles")
    .select("active_organization_slug")
    .eq("user_id", user.id)
    .single();

  const activeSlug = userProfile?.active_organization_slug;

  let entityName = "Sovereign Entity";
  
  // 3. Fetch Entity Details for Global Header
  if (activeSlug) {
    const { data: entityConfig } = await supabase
      .from("organizations")
      .select("name")
      .eq("slug", activeSlug)
      .single();

    if (entityConfig) {
      entityName = entityConfig.name || activeSlug;
    }
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6 bg-slate-950 min-h-screen text-white overflow-hidden relative">
      {/* Background Tech-Grid Aesthetic */}
      <div className="absolute inset-0 opacity-5 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />

      {/* Forensic Control Header */}
      <div className="relative z-10 flex items-center justify-between space-y-2 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <Fingerprint className="h-8 w-8 text-emerald-500 animate-pulse" />
            <h2 className="text-3xl font-black tracking-tighter uppercase italic">
              Sovereign LiveGuard
            </h2>
          </div>
          <p className="text-slate-400 text-xs font-mono mt-1 uppercase tracking-widest">
            Autonomous Ledger Defense System // Entity: <span className="text-emerald-500">{entityName}</span>
          </p>
        </div>

        {/* Global Status Telemetry */}
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Kernel Heartbeat</span>
            <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-400">
               <Zap className="h-3 w-3 fill-current" />
               1.02ms Latency
            </div>
          </div>
          <div className="h-10 w-px bg-white/10" />
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Defense Status</span>
            <span className="text-xs font-mono text-blue-400 flex items-center gap-1">
              <Activity className="h-3 w-3" />
              Monitoring Triggers
            </span>
          </div>
        </div>
      </div>

      {/* Centerpiece Intelligence Display */}
      <div className="relative z-10 flex flex-col items-center justify-center h-[60vh] text-center space-y-6">
         <div className="relative">
            <ShieldAlert className="h-32 w-32 text-emerald-500/20 animate-ping absolute inset-0" />
            <ShieldAlert className="h-32 w-32 text-emerald-500" />
         </div>
         <div className="max-w-md">
            <h3 className="text-xl font-bold uppercase tracking-tight">Active Surveillance Enabled</h3>
            <p className="text-sm text-slate-500 font-mono mt-2">
              The Sovereign Kernel is currently observing all ledger mutations via the 
              <span className="text-emerald-500"> fn_core_forensic_ledger_guard </span> 
              trigger. Any anomalies will appear in the LiveGuard widget.
            </p>
         </div>
      </div>

      {/* THE LIVE COMPONENT (Floating Observer) */}
      <SovereignLiveGuard />

      {/* Regulatory Footer */}
      <div className="absolute bottom-8 left-8 right-8 flex justify-between items-end">
        <div className="text-[9px] font-mono text-slate-600 uppercase leading-relaxed">
          System ID: SLG-{activeSlug?.substring(0,8).toUpperCase()}<br />
          Protocol: Forensic Shadow Monitoring v10.1<br />
          Data Sovereignty: Absolute
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full">
           <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
           <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">Secure Connection: {user.email}</span>
        </div>
      </div>
    </div>
  );
}