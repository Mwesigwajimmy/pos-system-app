// src/app/(dashboard)/customers/page.tsx
import CustomerDataTable from "@/components/customers/CustomerDataTable";
import { columns } from "@/components/customers/columns";

// This is the main page for the /customers route.
// It's a simple server component that renders our more complex client component.
export default function CustomersPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Customer Management</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        View, search, and manage all of your customer records.
      </p>
      <CustomerDataTable columns={columns} />
    </div>
  );
}