import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import AuditKpiCards from "@/components/audit/AuditKpiCards";
import { ShieldCheck, Activity, BrainCircuit } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default async function AuditKpiPage() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // 1. Server-Side Session Validation
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return (
      <div className="p-8">
        <Alert variant="destructive">
          <ShieldCheck className="h-4 w-4" />
          <AlertTitle>Authorization Required</AlertTitle>
          <AlertDescription>
            You must be logged in with administrative privileges to view real-time audit intelligence.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // 2. Resolve Multi-Tenant Organization Context
  const { data: userProfile } = await supabase
    .from("user_profiles")
    .select("active_organization_slug")
    .eq("user_id", user.id)
    .single();

  const activeSlug = userProfile?.active_organization_slug;

  let entityName = "Sovereign Entity";
  
  // 3. Fetch Entity Metadata for Header personalization
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
    <div className="flex-1 space-y-4 p-8 pt-6 bg-slate-50/20">
      {/* Intelligence Header Section */}
      <div className="flex items-center justify-between space-y-2 border-b pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-3xl font-bold tracking-tight">Audit Intelligence Monitor</h2>
            <BrainCircuit className="h-6 w-6 text-primary" />
          </div>
          <p className="text-muted-foreground mt-1">
            Real-time forensic telemetry and anomaly tracking for{" "}
            <span className="font-semibold text-foreground underline decoration-primary/30 underline-offset-4">
              {entityName}
            </span>
          </p>
        </div>

        {/* Status Indicators */}
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">System Health</span>
            <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
               <Activity className="h-3 w-3 animate-pulse" />
               Live Data Sync Active
            </div>
          </div>
        </div>
      </div>

      {/* Main KPI Interface */}
      <div className="mt-8">
        <AuditKpiCards 
          // Component internally uses React Query to fetch data,
          // but we pass the context here for future-proofing filtering.
          entitySlug={activeSlug} 
        />
      </div>

      {/* Bottom Forensic Context */}
      <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-slate-200">
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-widest text-slate-900">Autonomous Monitoring</h4>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            The indicators above represent a merge of standard system logs and autonomous forensic triggers. 
            Any value appearing in <span className="text-red-600 font-bold">Red</span> requires immediate auditor investigation 
            within the Sovereign Findings Register.
          </p>
        </div>
        <div className="flex justify-end items-center">
            <div className="bg-white p-3 rounded-lg border shadow-sm flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <div className="flex flex-col">
                    <span className="text-[10px] font-bold uppercase text-slate-500">Certified Guard</span>
                    <span className="text-[11px] font-medium text-slate-900">Immutable Ledger Protection Active</span>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}