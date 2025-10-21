// src/app/(dashboard)/compliance/page.tsx
import TaxReportGenerator from "@/components/compliance/TaxReportGenerator";

export default function CompliancePage() {
  return (
    <div className="space-y-6">
      <TaxReportGenerator />
      {/* The Bank Reconciliation component will go here later */}
    </div>
  );
}