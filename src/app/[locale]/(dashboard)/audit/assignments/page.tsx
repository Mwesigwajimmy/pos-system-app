import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import AuditorAssignmentTable from "@/components/audit/AuditorAssignmentTable";
import { UserCog, ShieldCheck, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default async function AuditorAssignmentsPage() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // 1. Server-Side Session & Permission Verification
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return (
      <div className="p-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Authentication Required</AlertTitle>
          <AlertDescription>
            Please sign in to manage auditor assignments and entity permissions.
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
    <div className="flex-1 space-y-4 p-8 pt-6 bg-slate-50/10">
      {/* Governance Header Section */}
      <div className="flex items-center justify-between space-y-2 border-b pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-3xl font-bold tracking-tight">Auditor Assignments</h2>
            <UserCog className="h-6 w-6 text-primary" />
          </div>
          <p className="text-muted-foreground mt-1">
            Manage personnel access and auditing jurisdiction for{" "}
            <span className="font-semibold text-foreground underline decoration-primary/30 underline-offset-4">
              {entityName}
            </span>
          </p>
        </div>

        {/* Governance / Security Status */}
        <div className="hidden md:flex items-center gap-3">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Compliance Status</span>
            <span className="text-xs font-medium text-blue-600 flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" />
              Access Governance Active
            </span>
          </div>
        </div>
      </div>

      {/* Main Roster Interface */}
      <div className="mt-8">
        <AuditorAssignmentTable 
          // Injecting context to ensure the component 
          // tags new assignments with the correct entity slug.
          entitySlug={activeSlug} 
        />
      </div>

      {/* Admin Policy Footer */}
      <div className="mt-12 pt-6 border-t border-slate-200">
        <p className="text-[10px] text-muted-foreground leading-relaxed max-w-2xl">
          <span className="font-bold text-slate-800">Security Note:</span> Auditor assignments provide 
          privileged access to the Forensic findings and Immutable logs. Unassigning an auditor 
          performs a logical soft-delete, immediately revoking access while preserving the historical 
          audit trail of their actions.
        </p>
      </div>
    </div>
  );
}