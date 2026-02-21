import { Suspense } from 'react';
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

// --- UI COMPONENTS ---
import AuditLogTable, { AuditLogTableSkeleton } from "@/components/audit/AuditLogTable";
import AuditKpiCards, { KpiCardSkeleton } from "@/components/audit/AuditKpiCards";
import AuditFindingsTable from "@/components/audit/AuditFindingsTable";
import AuditIngestionPortal from "@/components/audit/AuditIngestionPortal";

// --- ICONS & UI ---
import { Activity, ShieldCheck, Fingerprint, Zap, LayoutDashboard } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default async function AuditCenterPage() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // 1. Enterprise Security Guard
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return (
      <div className="p-8">
        <Alert variant="destructive">
          <Fingerprint className="h-4 w-4" />
          <AlertTitle>Security Violation</AlertTitle>
          <AlertDescription>Unauthenticated access to Audit Command is prohibited.</AlertDescription>
        </Alert>
      </div>
    );
  }

  // 2. Resolve Multi-Tenant Organization Identity
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("active_organization_slug")
    .eq("user_id", user.id)
    .single();

  const activeSlug = profile?.active_organization_slug;

  let entityName = "Sovereign Entity";
  if (activeSlug) {
    const { data: org } = await supabase
      .from("organizations")
      .select("name")
      .eq("slug", activeSlug)
      .single();
    entityName = org?.name || activeSlug;
  }

  return (
    <main className="container mx-auto py-8 px-4 md:px-8 max-w-[1600px] animate-in fade-in duration-500">
      <div className="flex flex-col gap-8">
        
        {/* Header Section: Professional Forensic Branding */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
              <Fingerprint className="w-8 h-8 text-primary" />
              Sovereign Audit Command
            </h1>
            <p className="text-muted-foreground max-w-2xl">
              Command Center for <span className="font-semibold text-foreground underline decoration-primary/30">{entityName}</span>. 
              Autonomous Forensic Guard active. All entries are verified 1:1 with the General Ledger.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-lg">
             <Zap size={16} className="text-emerald-600 fill-current animate-pulse" />
             <span className="text-xs font-black text-emerald-800 uppercase tracking-widest">Golden Seal Active</span>
          </div>
        </div>

        {/* Top Tier: Forensic Intelligence KPIs */}
        <Suspense fallback={<div className="grid grid-cols-1 md:grid-cols-4 gap-4"><KpiCardSkeleton /><KpiCardSkeleton /><KpiCardSkeleton /><KpiCardSkeleton /></div>}>
          <AuditKpiCards entitySlug={activeSlug} />
        </Suspense>

        {/* Tabbed Forensic Architecture */}
        <Tabs defaultValue="findings" className="space-y-6">
          <TabsList className="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground grid grid-cols-3 w-full md:w-[600px]">
            <TabsTrigger value="findings" className="font-bold flex gap-2">
               <ShieldCheck size={14} /> Findings Register
            </TabsTrigger>
            <TabsTrigger value="ingestion" className="font-bold flex gap-2">
               <Activity size={14} /> Titan Ingestion
            </TabsTrigger>
            <TabsTrigger value="logs" className="font-bold flex gap-2">
               <Zap size={14} /> Historical Trace
            </TabsTrigger>
          </TabsList>

          {/* Findings Tab */}
          <TabsContent value="findings" className="space-y-4 outline-none">
            <Suspense fallback={<AuditLogTableSkeleton rowCount={8} />}>
              <AuditFindingsTable entitySlug={activeSlug} />
            </Suspense>
          </TabsContent>

          {/* Ingestion Portal Tab */}
          <TabsContent value="ingestion" className="outline-none">
             <AuditIngestionPortal activeEntitySlug={activeSlug} />
          </TabsContent>

          {/* Raw Historical Logs Tab */}
          <TabsContent value="logs" className="outline-none">
            <Suspense fallback={<AuditLogTableSkeleton rowCount={10} />}>
              <AuditLogTable activeEntitySlug={activeSlug} />
            </Suspense>
          </TabsContent>
        </Tabs>
        
        {/* Footer Audit Statement */}
        <div className="pt-8 border-t flex items-center justify-between opacity-50">
           <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest">
             <LayoutDashboard size={12} /> Unified Forensic Intelligence Hub
           </div>
           <div className="text-[9px] font-mono italic">
             Trace: SLG-{activeSlug?.substring(0,8).toUpperCase()} // v10.1 Stable
           </div>
        </div>
      </div>
    </main>
  );
}