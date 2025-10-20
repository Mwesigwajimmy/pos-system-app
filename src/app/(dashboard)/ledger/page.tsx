// src/app/(dashboard)/ledger/page.tsx
import GeneralLedgerTable from "@/components/ledger/GeneralLedgerTable";

export default function LedgerPage() {
  return (
    <div className="space-y-6">
        <header>
            <h1 className="text-3xl font-bold">General Ledger Explorer</h1>
            <p className="text-muted-foreground mt-1">
                A complete, interactive, and drill-down view of all financial transactions in your business.
            </p>
        </header>
        <GeneralLedgerTable />
    </div>
  );
}