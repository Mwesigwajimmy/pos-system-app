import { Suspense } from 'react';
import type { Metadata } from 'next';
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { Card, CardContent } from "@/components/ui/card";
import { Database, ShieldCheck, Globe, BrainCircuit, Wand2, ShieldPlus } from 'lucide-react';
import AuditIngestionPortal from "@/components/audit/AuditIngestionPortal";

export const metadata: Metadata = {
  title: "Sovereign Audit Sandbox | Smart-Autonomous Global Engine",
  description: "Heuristic DNA scanning and autonomous reconciliation of disorganized multi-format ledger files with 1:1 mathematical precision.",
};

// --- UPGRADED HEADER: Now Accepts Organization Name ---
const PageHeader = ({ entityName }: { entityName: string }) => (
  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-6">
    <div>
      <h1 className="text-4xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
        <Database className="w-10 h-10 text-primary" />
        Auditor Sandbox
      </h1>
      <p className="mt-2 text-lg text-muted-foreground max-w-2xl">
        Ingesting books for <span className="font-bold text-foreground underline decoration-primary/30">{entityName}</span>. 
        Execute autonomous forensic verification via the Sovereign Kernel.
      </p>
    </div>
    <div className="flex flex-col items-end">
      <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-600 text-sm font-mono flex items-center gap-2">
        <ShieldCheck className="w-4 h-4" /> ENGINE STATUS: MATHEMATICALLY ABSOLUTE
      </div>
      <p className="text-[10px] text-muted-foreground mt-2 uppercase font-bold tracking-widest text-right">
        Autonomous Global Integrity Shield v10.1
      </p>
    </div>
  </div>
);

export default async function AuditorSandboxPage() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // 1. Resolve Identity and Auth
  const { data: { user } } = await supabase.auth.getUser();
  
  // 2. Resolve Multi-Tenant Organization Context
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("active_organization_slug")
    .eq("user_id", user?.id)
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
    <main className="container mx-auto py-8 px-4 md:px-8 max-w-[1600px] animate-in fade-in duration-700">
      <div className="flex flex-col gap-10">
        
        <PageHeader entityName={entityName} />

        {/* GUIDANCE ALERT */}
        <Card className="bg-primary/5 border-primary/20 shadow-none overflow-hidden relative border-l-4 border-l-primary">
          <Globe className="absolute -right-4 -top-4 w-24 h-24 text-primary/5 rotate-12" />
          <CardContent className="p-6 flex items-start gap-5 relative z-10">
            <div className="p-3 bg-primary/10 rounded-full">
               <Wand2 className="w-6 h-6 text-primary" />
            </div>
            <div className="text-sm leading-relaxed">
              <span className="font-bold text-base block mb-1">Sovereign Auditor Protocol v10.1 (Heuristic Intelligence)</span>
              This environment utilizes <strong>Autonomous DNA Scanning</strong> to recognize and map disorganized data for <strong>{entityName}</strong>. 
              The system supports <strong>Dual-Core Forensic Auditing</strong>, allowing you to cross-verify internal records against external uploads. 
              All operations are subject to <strong>1:1 Kernel Reconciliation</strong>.
            </div>
          </CardContent>
        </Card>

        {/* THE CORE ENGINE: Now passing the activeEntitySlug prop */}
        <div>
          <Suspense fallback={
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-4 h-[700px] bg-muted/50 animate-pulse rounded-xl" />
              <div className="lg:col-span-8 h-[700px] bg-muted/50 animate-pulse rounded-xl" />
            </div>
          }>
            <AuditIngestionPortal activeEntitySlug={activeSlug} />
          </Suspense>
        </div>

        {/* ENTERPRISE FOOTER */}
        <div className="flex items-center justify-center gap-2 opacity-30 pb-10">
           <ShieldPlus className="w-4 h-4" />
           <span className="text-[10px] uppercase font-bold tracking-tighter">Sovereign Autonomous Audit Certification Enabled // Trace: {activeSlug?.toUpperCase()}</span>
        </div>
        
      </div>
    </main>
  );
}