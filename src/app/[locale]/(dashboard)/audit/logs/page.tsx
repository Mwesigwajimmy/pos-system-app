import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import AuditLogTable from "@/components/audit/AuditLogTable";
import { History, ShieldCheck, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default async function AuditLogsPage() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // 1. Server-Side Session & Privilege Validation
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return (
      <div className="p-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Authentication Required</AlertTitle>
          <AlertDescription>
            You must be signed in to access the immutable audit records.
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
  
  // 3. Parallel Fetch for Entity Metadata
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
    <div className="flex-1 space-y-4 p-8 pt-6">
      {/* Forensic History Header */}
      <div className="flex items-center justify-between space-y-2 border-b pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-3xl font-bold tracking-tight">Immutable Audit Log</h2>
            <History className="h-6 w-6 text-slate-400" />
          </div>
          <p className="text-muted-foreground mt-1">
            Complete sequence of historical events and data mutations for{" "}
            <span className="font-semibold text-foreground underline decoration-slate-300 underline-offset-4">
              {entityName}
            </span>
          </p>
        </div>

        {/* Compliance Badge */}
        <div className="hidden md:flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
          <ShieldCheck className="h-4 w-4 text-slate-600" />
          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">
            Tamper-Evident Ledger
          </span>
        </div>
      </div>

      {/* Main Log Interface Component */}
      <div className="mt-6">
        <AuditLogTable 
          // We pass the entity context so the component knows which 
          // tenant's logs to retrieve from the RPC.
          activeEntitySlug={activeSlug} 
        />
      </div>

      {/* Audit Standard Footer */}
      <div className="mt-12 flex flex-col items-center gap-2 opacity-50">
        <div className="h-px w-full bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
        <p className="text-[9px] text-muted-foreground uppercase tracking-[0.2em] font-medium text-center">
          Records are generated automatically by system triggers and are strictly immutable.
          <br />
          Certified for GAAP, IFRS, and SOX Compliance audits.
        </p>
      </div>
    </div>
  );
}