import { Suspense } from 'react';
import type { Metadata } from 'next';
import { Card, CardContent } from "@/components/ui/card";
import { Database, ShieldCheck, Info, Globe, Scale } from 'lucide-react';
import AuditIngestionPortal from "@/components/audit/AuditIngestionPortal";

export const metadata: Metadata = {
  title: "Sovereign Audit Sandbox | Autonomous Global Compliance",
  description: "High-capacity historical data ingestion with autonomous jurisdictional tax verification and mathematical ledger sealing.",
};

const PageHeader = () => (
  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-6">
    <div>
      <h1 className="text-4xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
        <Database className="w-10 h-10 text-primary" />
        Auditor Sandbox
      </h1>
      <p className="mt-2 text-lg text-muted-foreground">
        Reconstruct global books with **Multi-Currency DNA** and verify against the Sovereign Kernel.
      </p>
    </div>
    <div className="flex flex-col items-end">
      <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-600 text-sm font-mono flex items-center gap-2">
        <ShieldCheck className="w-4 h-4" /> ENGINE STATUS: MATHEMATICALLY ABSOLUTE
      </div>
      <p className="text-[10px] text-muted-foreground mt-2 uppercase font-bold tracking-widest text-right">
        Autonomous Global Integrity Shield
      </p>
    </div>
  </div>
);

export default function AuditorSandboxPage() {
  return (
    <main className="container mx-auto py-8 px-4 md:px-8 max-w-[1600px]">
      <div className="flex flex-col gap-10">
        
        <PageHeader />

        {/* GUIDANCE ALERT: Professional Instruction for Global Accountants & Business Owners */}
        <Card className="bg-primary/5 border-primary/20 shadow-none overflow-hidden relative border-l-4 border-l-primary">
          {/* Subtle Background Icon for Enterprise Feel */}
          <Globe className="absolute -right-4 -top-4 w-24 h-24 text-primary/5 rotate-12" />
          
          <CardContent className="p-6 flex items-start gap-5 relative z-10">
            <div className="p-3 bg-primary/10 rounded-full">
               <Scale className="w-6 h-6 text-primary" />
            </div>
            <div className="text-sm leading-relaxed">
              <span className="font-bold text-base block mb-1">Sovereign Auditor Protocol v8.4</span>
              This autonomous environment supports <strong>Multi-Jurisdictional Tax Verification</strong> across 11 specialized industries and agnostic business DNA. 
              The <strong>Tax Compliance Shield</strong> empowers business owners to cross-verify consultant filings against jurisdictional standards in real-time, exposing any mathematical or regulatory variance. 
              All entries are subject to <strong>1:1 Kernel Reconciliation</strong> before being atomically sealed. 
              Please execute the <strong>Wipe Protocol</strong> to purge the Sandbox of sensitive DNA after a successful ledger seal.
            </div>
          </CardContent>
        </Card>

        {/* THE CORE ENGINE: Interconnected Global Audit Portal */}
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
          <Suspense fallback={
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Skeleton UI matching the layout of the Ingestion Portal */}
              <div className="lg:col-span-4 h-[600px] bg-muted/50 animate-pulse rounded-xl border border-muted" />
              <div className="lg:col-span-8 h-[600px] bg-muted/50 animate-pulse rounded-xl border border-muted" />
            </div>
          }>
            <AuditIngestionPortal />
          </Suspense>
        </div>
        
      </div>
    </main>
  );
}