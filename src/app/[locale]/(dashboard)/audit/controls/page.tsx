import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import InternalControlsMatrix from "@/components/audit/InternalControlsMatrix";
import { ShieldCheck, LayoutList, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default async function InternalControlsPage() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // 1. Server-Side Security Guard
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return (
      <div className="p-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Governance Access Restricted</AlertTitle>
          <AlertDescription>
            You must be authenticated to access the Internal Controls Matrix.
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
    <div className="flex-1 space-y-4 p-8 pt-6 bg-slate-50/10">
      {/* Governance & Compliance Header */}
      <div className="flex items-center justify-between space-y-2 border-b pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-3xl font-bold tracking-tight">Internal Controls Matrix</h2>
            <LayoutList className="h-6 w-6 text-primary" />
          </div>
          <p className="text-muted-foreground mt-1">
            Framework mapping and effectiveness tracking for{" "}
            <span className="font-semibold text-foreground underline decoration-primary/30 underline-offset-4">
              {entityName}
            </span>
          </p>
        </div>

        {/* Audit Status Badge */}
        <div className="hidden md:flex items-center gap-3">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Control Status</span>
            <span className="text-xs font-medium text-emerald-600 flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" />
              Continuous Monitoring Active
            </span>
          </div>
        </div>
      </div>

      {/* Main Governance Interface */}
      <div className="mt-8">
        <InternalControlsMatrix 
          // Injecting the organization context to ensure 
          // RLS (Row Level Security) and tenant isolation.
          activeEntitySlug={activeSlug} 
        />
      </div>

      {/* Regulatory Compliance Footer */}
      <div className="mt-12 pt-6 border-t border-slate-200">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-[10px] text-muted-foreground leading-relaxed max-w-2xl uppercase tracking-tighter">
            System of record for Sarbanes-Oxley (SOX) and ISO/IEC 27001 internal control procedures. 
            All modifications are recorded in the immutable audit log.
          </p>
          <div className="text-[9px] font-mono text-slate-400">
             Trace ID: {activeSlug?.substring(0,8).toUpperCase()}-ICM-SECURE
          </div>
        </div>
      </div>
    </div>
  );
}