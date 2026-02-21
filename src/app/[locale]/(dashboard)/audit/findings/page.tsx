import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import AuditFindingsTable from "@/components/audit/AuditFindingsTable";
import { Fingerprint, ShieldAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default async function AuditFindingsPage() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // 1. Server-Side Authentication & Session Verification
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return (
      <div className="p-8">
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Authentication Required</AlertTitle>
          <AlertDescription>
            Session expired or invalid. Please re-authenticate to view the Forensic Findings Register.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // 2. Resolve Multi-Tenant Context (Active Organization)
  const { data: userProfile } = await supabase
    .from("user_profiles")
    .select("active_organization_slug")
    .eq("user_id", user.id)
    .single();

  const activeSlug = userProfile?.active_organization_slug;

  let entityName = "Sovereign Entity";
  let locale = "en-US";

  // 3. Parallel Data Fetch for Entity Configuration
  if (activeSlug) {
    const { data: entityConfig } = await supabase
      .from("organizations")
      .select("name, locale")
      .eq("slug", activeSlug)
      .single();

    if (entityConfig) {
      entityName = entityConfig.name || activeSlug;
      locale = entityConfig.locale || "en-US";
    }
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      {/* Dynamic Header Section */}
      <div className="flex items-center justify-between space-y-2 border-b pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-3xl font-bold tracking-tight">Audit Findings Register</h2>
            <Fingerprint className="h-6 w-6 text-primary animate-pulse" />
          </div>
          <p className="text-muted-foreground mt-1">
            Autonomous forensic monitoring and exception tracking for{" "}
            <span className="font-semibold text-foreground underline decoration-primary/40 underline-offset-4">
              {entityName}
            </span>
          </p>
        </div>
        
        {/* Security / Status Badges */}
        <div className="hidden md:flex items-center gap-3">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Security Status</span>
            <span className="text-xs font-medium text-emerald-600 flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
              Sovereign Guard Active
            </span>
          </div>
        </div>
      </div>

      {/* Main Interface Component */}
      <div className="grid gap-4 mt-4">
        <AuditFindingsTable 
          // Note: The component you provided manages its own internal 
          // state and real-time listeners, but we provide the context here
          // if you wish to upgrade the component to filter by entitySlug.
          entitySlug={activeSlug} 
          locale={locale}
        />
      </div>

      {/* Forensic Intelligence Footer */}
      <div className="mt-8 pt-4 border-t border-slate-100">
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          The Register includes both manual auditor observations and autonomous anomalies detected by the 
          <span className="font-medium"> trg_ledger_forensics </span> 
          trigger system. All findings are timestamped and immutable within the Sovereign Audit Sandbox.
        </p>
      </div>
    </div>
  );
}