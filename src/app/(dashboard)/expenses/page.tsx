import ExpenseDataTable from "@/components/expenses/ExpenseDataTable";
import { columns } from "@/components/expenses/columns";

// This is the main page for the /expenses route.
// It sets up the page title and renders our more complex client component.
export default function ExpensesPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Expense Tracking</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        Record and monitor all business expenses to maintain accurate financial records.
      </p>
      <ExpenseDataTable columns={columns} />
    </div>
  );
}