import { Suspense } from 'react';
import type { Metadata } from 'next';
import { Card, CardContent } from "@/components/ui/card";
import { Database, ShieldCheck, Globe, BrainCircuit, Wand2, ShieldPlus } from 'lucide-react';
import AuditIngestionPortal from "@/components/audit/AuditIngestionPortal";

export const metadata: Metadata = {
  title: "Sovereign Audit Sandbox | Smart-Autonomous Global Engine",
  description: "Heuristic DNA scanning and autonomous reconciliation of disorganized multi-format ledger files with 1:1 mathematical precision.",
};

const PageHeader = () => (
  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-6">
    <div>
      <h1 className="text-4xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
        <Database className="w-10 h-10 text-primary" />
        Auditor Sandbox
      </h1>
      <p className="mt-2 text-lg text-muted-foreground max-w-2xl">
        Ingest **disorganized global books** of any scale and execute autonomous forensic verification via the Sovereign Kernel.
      </p>
    </div>
    <div className="flex flex-col items-end">
      <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-600 text-sm font-mono flex items-center gap-2">
        <ShieldCheck className="w-4 h-4" /> ENGINE STATUS: MATHEMATICALLY ABSOLUTE
      </div>
      <p className="text-[10px] text-muted-foreground mt-2 uppercase font-bold tracking-widest text-right">
        Autonomous Global Integrity Shield v9.0
      </p>
    </div>
  </div>
);

export default function AuditorSandboxPage() {
  return (
    <main className="container mx-auto py-8 px-4 md:px-8 max-w-[1600px]">
      <div className="flex flex-col gap-10">
        
        <PageHeader />

        {/* GUIDANCE ALERT: High-Level Protocol for Global Enterprises & Autonomous Firms */}
        <Card className="bg-primary/5 border-primary/20 shadow-none overflow-hidden relative border-l-4 border-l-primary">
          {/* Subtle Background Icon for Enterprise Feel */}
          <Globe className="absolute -right-4 -top-4 w-24 h-24 text-primary/5 rotate-12" />
          
          <CardContent className="p-6 flex items-start gap-5 relative z-10">
            <div className="p-3 bg-primary/10 rounded-full">
               <Wand2 className="w-6 h-6 text-primary" />
            </div>
            <div className="text-sm leading-relaxed">
              <span className="font-bold text-base block mb-1">Sovereign Auditor Protocol v9.0 (Heuristic Intelligence)</span>
              This environment utilizes <strong>Autonomous DNA Scanning</strong> to recognize, map, and scrub disorganized financial data regardless of format. 
              The system supports <strong>Dual-Core Forensic Auditing</strong>, allowing you to cross-verify internal production records against external forensic uploads. 
              The <strong>Tax Compliance Shield</strong> and <strong>Smart Date Locking</strong> engine ensure all entries meet jurisdictional standards and fiscal period constraints in real-time. 
              All operations are subject to <strong>1:1 Kernel Reconciliation</strong>. Execute the <strong>Wipe Protocol</strong> to purge the Sandbox of sensitive DNA after a successful transition.
            </div>
          </CardContent>
        </Card>

        {/* THE CORE ENGINE: Interconnected Global Smart Portal */}
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
          <Suspense fallback={
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Skeleton UI exactly matching the internal grid-cols-12 layout */}
              <div className="lg:col-span-4 h-[700px] bg-muted/50 animate-pulse rounded-xl border border-muted" />
              <div className="lg:col-span-8 h-[700px] bg-muted/50 animate-pulse rounded-xl border border-muted" />
            </div>
          }>
            <AuditIngestionPortal />
          </Suspense>
        </div>

        {/* ENTERPRISE FOOTER: Autonomous Integrity Certification */}
        <div className="flex items-center justify-center gap-2 opacity-30 pb-10">
           <ShieldPlus className="w-4 h-4" />
           <span className="text-[10px] uppercase font-bold tracking-tighter">Sovereign Autonomous Audit Certification Enabled</span>
        </div>
        
      </div>
    </main>
  );
}