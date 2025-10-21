import SalesHistoryDataTable from "@/components/reports/SalesHistoryDataTable";
import { columns } from "@/components/reports/sales-history-columns";

export default function SalesHistoryPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <h1 className="text-3xl font-bold">Sales History</h1>
      <p className="text-sm text-muted-foreground">
        A detailed, filterable log of all transactions. Export any date range to CSV for accounting or auditing purposes.
      </p>
      <SalesHistoryDataTable columns={columns} />
    </div>
  );
}