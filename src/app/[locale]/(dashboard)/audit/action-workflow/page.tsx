import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import AuditActionWorkflow from "@/components/audit/AuditActionWorkflow";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default async function AuditActionWorkflowPage() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // 1. Authenticate Session
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return (
      <div className="p-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Authentication Required</AlertTitle>
          <AlertDescription>Please sign in to access the Audit Workflow engine.</AlertDescription>
        </Alert>
      </div>
    );
  }

  // 2. Resolve Active Organization Context
  const { data: userProfile } = await supabase
    .from("user_profiles")
    .select("active_organization_slug")
    .eq("user_id", user.id)
    .single();

  const activeSlug = userProfile?.active_organization_slug;

  let entityName = "Sovereign Entity";
  let currencyCode = "USD";
  let locale = "en-US";

  // 3. Enterprise Data Fetch (Parallel)
  // We fetch organization config to ensure headers match the user's specific entity
  if (activeSlug) {
    const { data: entityConfig } = await supabase
      .from("organizations")
      .select("name, currency_code, locale")
      .eq("slug", activeSlug)
      .single();

    if (entityConfig) {
      entityName = entityConfig.name || activeSlug;
      currencyCode = entityConfig.currency_code || "USD";
      locale = entityConfig.locale || "en-US";
    }
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      {/* Page Header Section */}
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Audit Action Workflow</h2>
          <p className="text-muted-foreground">
            Remediation tracking and assignment management for{" "}
            <span className="font-semibold text-foreground underline decoration-primary/30">
              {entityName}
            </span>
          </p>
        </div>
      </div>

      {/* Main Interface Component */}
      <div className="grid gap-4">
        <AuditActionWorkflow 
          // We pass the activeSlug so the component knows which entity data to fetch/filter
          // and the locale settings for consistent date/number formatting
          activeEntitySlug={activeSlug}
          locale={locale}
        />
      </div>
    </div>
  );
}