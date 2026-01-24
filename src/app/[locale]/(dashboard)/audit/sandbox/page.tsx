import { Suspense } from 'react';
import type { Metadata } from 'next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Database, ShieldCheck, Info } from 'lucide-react';
import AuditIngestionPortal from "@/components/audit/AuditIngestionPortal";

export const metadata: Metadata = {
  title: "Sovereign Audit Sandbox",
  description: "High-capacity historical data ingestion and mathematical verification.",
};

const PageHeader = () => (
  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-6">
    <div>
      <h1 className="text-4xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
        <Database className="w-10 h-10 text-primary" />
        Auditor Sandbox
      </h1>
      <p className="mt-2 text-lg text-muted-foreground">
        Ingest historical books from any system and verify against the Sovereign Kernel.
      </p>
    </div>
    <div className="flex flex-col items-end">
      <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-600 text-sm font-mono flex items-center gap-2">
        <ShieldCheck className="w-4 h-4" /> ENGINE STATUS: MATHEMATICALLY ABSOLUTE
      </div>
      <p className="text-[10px] text-muted-foreground mt-2 uppercase font-bold tracking-widest">
        Zero Human Error Guarantee
      </p>
    </div>
  </div>
);

export default function AuditorSandboxPage() {
  return (
    <main className="container mx-auto py-8 px-4 md:px-8 max-w-[1600px]">
      <div className="flex flex-col gap-10">
        
        <PageHeader />

        {/* GUIDANCE ALERT: Professional Instruction for Accountants */}
        <Card className="bg-primary/5 border-primary/20 shadow-none">
          <CardContent className="p-4 flex items-start gap-4">
            <Info className="w-5 h-5 text-primary mt-0.5" />
            <div className="text-sm">
              <span className="font-bold">Auditor Protocol:</span> This sandbox allows you to reconstruct 
              financial history for any of the 11 industries. Data uploaded here is processed by the 
              Sovereign Ledger Triggers before being sealed. Use the <strong>Wipe Protocol</strong> 
              to clear temporary files after verification.
            </div>
          </CardContent>
        </Card>

        {/* THE CORE ENGINE: Interconnected to all 11 Industries */}
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
           <AuditIngestionPortal />
        </div>
        
      </div>
    </main>
  );
}