// src/app/(dashboard)/audit/page.tsx
import AuditLogTable from "@/components/audit/AuditLogTable";
import AuditKpiCards from "@/components/audit/AuditKpiCards";

export const metadata = {
  title: "Audit Center",
  description: "Monitor and review all system activities.",
};

export default function AuditCenterPage() {
  return (
    <div className="flex flex-col gap-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          Audit Center
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          A complete and immutable log of all significant activities within the system.
        </p>
      </div>

      {/* High-Level Statistics Cards */}
      <AuditKpiCards />

      {/* Detailed Log Table with Filters */}
      <AuditLogTable />
    </div>
  );
}