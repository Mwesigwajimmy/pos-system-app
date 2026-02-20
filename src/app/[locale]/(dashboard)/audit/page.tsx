'use client';

import { Suspense } from 'react';
import AuditLogTable, { AuditLogTableSkeleton } from "@/components/audit/AuditLogTable";
import AuditKpiCards, { KpiCardSkeleton } from "@/components/audit/AuditKpiCards";

// --- UPGRADE: SOVEREIGN KERNEL COMPONENT IMPORTS ---
import AuditFindingsTable from "@/components/audit/AuditFindingsTable";
import AuditIngestionPortal from "@/components/audit/AuditIngestionPortal";
// --------------------------------------------------

import { Activity, ShieldCheck, Fingerprint, Zap } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AuditCenterPage() {
  return (
    <main className="container mx-auto py-8 px-4 md:px-8 max-w-[1600px]">
      <div className="flex flex-col gap-8">
        
        {/* Header Section (Original logic preserved, enriched with Forensic Identity) */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
              <Fingerprint className="w-8 h-8 text-primary" />
              Sovereign Audit Command
            </h1>
            <p className="text-muted-foreground max-w-2xl">
              Continuous monitoring of the 11-industry Sovereign Kernel. 
              Autonomous Forensic Guard active. All entries are verified 1:1 with the General Ledger.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-lg">
             <Zap size={16} className="text-emerald-600 fill-current animate-pulse" />
             <span className="text-xs font-black text-emerald-800 uppercase tracking-widest">Golden Seal Active</span>
          </div>
        </div>

        {/* Top Tier: Forensic Intelligence KPIs */}
        <Suspense fallback={<KpiCardSkeleton />}>
          <AuditKpiCards />
        </Suspense>

        {/* 
            UPGRADE: ENTERPRISE TABBED ARCHITECTURE 
            This organizes the 'Findings' (Exceptions) separately from the 'Logs' (History).
        */}
        <Tabs defaultValue="findings" className="space-y-6">
          <TabsList className="grid grid-cols-3 w-full md:w-[600px]">
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

          {/* 
              UPGRADE Content 1: Findings Table 
              Displays rows from 'sovereign_audit_anomalies'
          */}
          <TabsContent value="findings" className="space-y-4 outline-none">
            <Suspense fallback={<AuditLogTableSkeleton />}>
              <AuditFindingsTable />
            </Suspense>
          </TabsContent>

          {/* 
              UPGRADE Content 2: Ingestion Portal 
              Entry point for autonomous kernel seal (v10.1)
          */}
          <TabsContent value="ingestion" className="outline-none">
             <AuditIngestionPortal />
          </TabsContent>

          {/* Original Logic Content: Raw Audit Log Table */}
          <TabsContent value="logs" className="outline-none">
            <Suspense fallback={<AuditLogTableSkeleton />}>
              <AuditLogTable />
            </Suspense>
          </TabsContent>
        </Tabs>
        
      </div>
    </main>
  );
}