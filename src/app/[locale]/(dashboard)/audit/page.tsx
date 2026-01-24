import { Suspense } from 'react';
import AuditLogTable, { AuditLogTableSkeleton } from "@/components/audit/AuditLogTable";
import AuditKpiCards, { KpiCardSkeleton } from "@/components/audit/AuditKpiCards";
import { Activity } from 'lucide-react';

export default function AuditCenterPage() {
  return (
    <main className="container mx-auto py-8 px-4 md:px-8 max-w-[1600px]">
      <div className="flex flex-col gap-8">
        
        <div className="flex flex-col gap-2 border-b pb-6">
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <Activity className="w-8 h-8 text-primary" />
            System Audit Log
          </h1>
          <p className="text-muted-foreground">
            Continuous monitoring of the 11-industry Sovereign Kernel. 
            All entries are verified 1:1 with the General Ledger.
          </p>
        </div>

        <Suspense fallback={<KpiCardSkeleton />}>
          <AuditKpiCards />
        </Suspense>

        <Suspense fallback={<AuditLogTableSkeleton />}>
          <AuditLogTable />
        </Suspense>
        
      </div>
    </main>
  );
}