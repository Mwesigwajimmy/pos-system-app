import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import AuditTrailViewer from "@/components/audit/AuditTrailViewer";
import { Eye, ShieldCheck, History } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default async function AuditTrailViewerPage() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // 1. Server-Side Authentication Guard
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return (
      <div className="p-8">
        <Alert variant="destructive">
          <History className="h-4 w-4" />
          <AlertTitle>Authorization Required</AlertTitle>
          <AlertDescription>
            Access to granular audit trails is restricted. Please sign in to verify the immutable change logs.
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
      {/* Forensic Drill-Down Header */}
      <div className="flex items-center justify-between space-y-2 border-b pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-3xl font-bold tracking-tight">Audit Trail Viewer</h2>
            <Eye className="h-6 w-6 text-slate-500" />
          </div>
          <p className="text-muted-foreground mt-1">
            Granular per-record mutation history and change tracking for{" "}
            <span className="font-semibold text-foreground underline decoration-slate-400 underline-offset-4">
              {entityName}
            </span>
          </p>
        </div>

        {/* Forensic Integrity Status */}
        <div className="hidden md:flex items-center gap-3">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">Integrity Status</span>
            <span className="text-xs font-medium text-blue-600 flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" />
              Chain of Custody Verified
            </span>
          </div>
        </div>
      </div>

      {/* Main Trail Interface */}
      <div className="mt-8">
        <AuditTrailViewer 
          // Injecting the tenant context to ensure the component 
          // filters logs for the correct organization.
          activeEntitySlug={activeSlug} 
        />
      </div>

      {/* Audit Standard Footer */}
      <div className="mt-12 pt-4 border-t border-slate-100">
        <div className="flex justify-between items-center text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
          <span>Sovereign Forensic Engine v10.1</span>
          <span className="italic">Records are immutable and non-repudiable</span>
        </div>
      </div>
    </div>
  );
}