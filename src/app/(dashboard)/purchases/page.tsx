import PurchaseOrderDataTable from "@/components/purchases/PurchaseOrderDataTable";
import { columns } from "@/components/purchases/columns";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function PurchasesPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Purchase Orders</h1>
        <Button asChild>
          <Link href="/purchases/new">Create New Purchase Order</Link>
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Track and manage orders from your suppliers to maintain optimal stock levels.
      </p>
      <PurchaseOrderDataTable columns={columns} />
    </div>
  );
}