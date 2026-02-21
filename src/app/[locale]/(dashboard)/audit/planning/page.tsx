import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import AuditPlanningBoard from "@/components/audit/AuditPlanningBoard";
import { Calendar, ShieldCheck, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default async function AuditPlanningPage() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // 1. Server-Side Authentication Guard
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return (
      <div className="p-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Authentication Required</AlertTitle>
          <AlertDescription>
            Session invalid. Please authenticate to manage strategic audit schedules.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // 2. Multi-Tenant Context Resolution
  const { data: userProfile } = await supabase
    .from("user_profiles")
    .select("active_organization_slug")
    .eq("user_id", user.id)
    .single();

  const activeSlug = userProfile?.active_organization_slug;

  let entityName = "Sovereign Entity";
  
  // 3. Parallel Metadata Fetching
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
      {/* Strategic Header Section */}
      <div className="flex items-center justify-between space-y-2 border-b pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-3xl font-bold tracking-tight">Audit Planning Board</h2>
            <Calendar className="h-6 w-6 text-primary" />
          </div>
          <p className="text-muted-foreground mt-1">
            Strategic oversight and global audit scheduling for{" "}
            <span className="font-semibold text-foreground underline decoration-primary/30 underline-offset-4">
              {entityName}
            </span>
          </p>
        </div>

        {/* Oversight Badge */}
        <div className="hidden md:flex items-center gap-3">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Oversight Status</span>
            <span className="text-xs font-medium text-emerald-600 flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" />
              Board Approval Engine Active
            </span>
          </div>
        </div>
      </div>

      {/* Main Planning Interface */}
      <div className="mt-8">
        <AuditPlanningBoard 
          // We provide the activeSlug so the board 
          // automatically filters and saves to the correct tenant.
          activeEntitySlug={activeSlug} 
        />
      </div>

      {/* Board Policy Footer */}
      <div className="mt-12 pt-6 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">
          Confidential: Strategic Audit Roadmap for {entityName}
        </p>
        <div className="text-[9px] text-slate-400 italic">
          Aligned with IPPF (International Professional Practices Framework) standards.
        </div>
      </div>
    </div>
  );
}