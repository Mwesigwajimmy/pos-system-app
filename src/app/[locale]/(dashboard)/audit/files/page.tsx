import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import AuditFileManager from "@/components/audit/AuditFileManager";
import { AlertCircle, ShieldCheck } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default async function AuditFilesPage() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // 1. Server-Side Session Validation
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return (
      <div className="p-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>You must be authenticated to access the Audit Evidence Locker.</AlertDescription>
        </Alert>
      </div>
    );
  }

  // 2. Resolve Active Organization / Tenant Context
  const { data: userProfile } = await supabase
    .from("user_profiles")
    .select("active_organization_slug")
    .eq("user_id", user.id)
    .single();

  const activeSlug = userProfile?.active_organization_slug;

  let entityName = "Sovereign Entity";
  
  // 3. Fetch Organization Metadata
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
      {/* Page Header */}
      <div className="flex items-center justify-between space-y-2 border-b pb-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            Audit File Manager
            <ShieldCheck className="h-6 w-6 text-green-600" />
          </h2>
          <p className="text-muted-foreground">
            Secure artifact storage for <span className="font-semibold text-foreground underline decoration-primary/30">{entityName}</span>
          </p>
        </div>
        <div className="flex items-center space-x-2">
           <div className="text-xs bg-muted px-2 py-1 rounded-md text-muted-foreground border">
             ISO 27001 Compliant
           </div>
        </div>
      </div>

      {/* Main Evidence Locker Interface */}
      <div className="grid gap-4 mt-6">
        <AuditFileManager 
          // We pass the identity and organization context to the component
          entitySlug={activeSlug}
          userEmail={user.email}
        />
      </div>

      {/* Footer Security Note */}
      <p className="text-[10px] text-muted-foreground text-center mt-8">
        All uploads are encrypted at rest. Signed URLs are used for secure temporary file access.
      </p>
    </div>
  );
}