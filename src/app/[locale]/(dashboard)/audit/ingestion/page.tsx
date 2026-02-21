import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import AuditIngestionPortal from "@/components/audit/AuditIngestionPortal";
import { ShieldAlert, DatabaseZap } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default async function IngestionPortalPage() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // 1. Critical Session Validation (Server-Side)
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return (
      <div className="p-8">
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Security Violation</AlertTitle>
          <AlertDescription>
            You must be authenticated to access the Ingestion Portal. Forensic DNA tracking is active.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // 2. Resolve Multi-Tenant Context (Entity Isolation)
  const { data: userProfile } = await supabase
    .from("user_profiles")
    .select("active_organization_slug")
    .eq("user_id", user.id)
    .single();

  const activeSlug = userProfile?.active_organization_slug;

  let entityName = "Sovereign Entity";
  let locale = "en-US";
  let currencyCode = "USD";

  // 3. Parallel Fetch for Entity Global Settings
  if (activeSlug) {
    const { data: entityConfig } = await supabase
      .from("organizations")
      .select("name, locale, currency_code")
      .eq("slug", activeSlug)
      .single();

    if (entityConfig) {
      entityName = entityConfig.name || activeSlug;
      locale = entityConfig.locale || "en-US";
      currencyCode = entityConfig.currency_code || "USD";
    }
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6 bg-slate-50/30">
      {/* Forensic Header Section */}
      <div className="flex items-center justify-between space-y-2 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-3xl font-bold tracking-tight">Audit Ingestion Portal</h2>
            <DatabaseZap className="h-6 w-6 text-blue-600" />
          </div>
          <p className="text-muted-foreground mt-1">
            Certified Chain of Custody & DNA Ledger Ingestion for{" "}
            <span className="font-semibold text-foreground underline decoration-blue-500/30 underline-offset-4">
              {entityName}
            </span>
          </p>
        </div>
        
        {/* Compliance Metadata */}
        <div className="hidden lg:flex items-center gap-4">
          <div className="flex flex-col items-end border-r pr-4 border-slate-200">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">Global Standard</span>
            <span className="text-xs font-semibold text-slate-800">ISA-700 / ISO-27001</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">Kernel Version</span>
            <span className="text-xs font-mono font-medium text-blue-600">V10.1 (Stable)</span>
          </div>
        </div>
      </div>

      {/* Main Forensic Interface */}
      <div className="mt-6">
        <AuditIngestionPortal 
          // Injecting the resolved identity and context props
          activeEntitySlug={activeSlug}
          entityCurrency={currencyCode}
          locale={locale}
          authenticatedUserEmail={user.email}
        />
      </div>

      {/* Legal Footer Note */}
      <div className="mt-12 pt-4 border-t border-slate-200">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-[9px] text-muted-foreground uppercase tracking-tighter">
            Warning: This portal generates a Sovereign Audit Certificate. Tampering with the SHA-256 Chain of Custody is a violation of local financial regulations.
          </p>
          <div className="flex items-center gap-2">
             <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
             <span className="text-[10px] font-bold text-blue-700 uppercase tracking-widest">Aura AI Copilot Integrated</span>
          </div>
        </div>
      </div>
    </div>
  );
}