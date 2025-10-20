import { Suspense } from 'react';
import type { Metadata } from 'next';

import AuditLogTable, { AuditLogTableSkeleton } from "@/components/audit/AuditLogTable";
import AuditKpiCards, { KpiCardSkeleton } from "@/components/audit/AuditKpiCards";

export const metadata: Metadata = {
  title: "Audit Center",
  description: "Monitor and review all system activities and data changes.",
};

/**
 * A reusable header component for dashboard pages.
 */
const PageHeader = () => (
  <div>
    <h1 className="text-3xl font-bold tracking-tight text-foreground">
      Audit Center
    </h1>
    <p className="mt-1 text-muted-foreground">
      A complete and immutable log of all significant activities within the system.
    </p>
  </div>
);

/**
 * The main page for the Audit Center, demonstrating streaming UI with Suspense.
 * The static header renders instantly, while the data-heavy components stream in
 * as they become ready, each with their own specific loading skeleton.
 */
export default function AuditCenterPage() {
  return (
    <main className="container mx-auto py-6 px-4 md:px-6">
      <div className="flex flex-col gap-8">
        
        <PageHeader />

        {/* 
          Suspense boundary for the KPI cards.
          The user sees the skeletons immediately while the data is fetched.
        */}
        <Suspense fallback={<KpiCardSkeleton />}>
          <AuditKpiCards />
        </Suspense>

        {/* 
          Suspense boundary for the detailed audit log table.
          This allows the KPI cards above to render even if the table's
          data query is slower, improving perceived performance.
        */}
        <Suspense fallback={<AuditLogTableSkeleton />}>
          <AuditLogTable />
        </Suspense>
        
      </div>
    </main>
  );
}