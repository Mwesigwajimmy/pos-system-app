import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import PurchaseOrderDataTable from "@/components/purchases/PurchaseOrderDataTable";
import SupplierDataTable from "@/components/purchases/SupplierDataTable";
import { poColumns } from "@/components/purchases/poColumns";
import { supplierColumns } from "@/components/purchases/supplierColumns";

/**
 * Renders the main Purchases page, allowing users to switch between
 * viewing Purchase Orders and Suppliers via a tabbed interface.
 * Provides a primary action button to create new purchase orders.
 */
export default function PurchasesPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <Tabs defaultValue="purchase-orders" className="space-y-4">
        <div className="flex justify-between items-center">
          <TabsList>
            <TabsTrigger value="purchase-orders">Purchase Orders</TabsTrigger>
            <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
          </TabsList>
          <Button asChild>
            <Link href="/purchases/new">Create New Purchase Order</Link>
          </Button>
        </div>

        {/* Tab panel for Purchase Orders */}
        <TabsContent value="purchase-orders">
          <p className="text-sm text-muted-foreground mb-4">
            Track and manage orders from your suppliers to maintain optimal stock levels.
          </p>
          <PurchaseOrderDataTable columns={poColumns} />
        </TabsContent>

        {/* Tab panel for Suppliers */}
        <TabsContent value="suppliers">
          <p className="text-sm text-muted-foreground mb-4">
            Manage all your supplier records and contact information.
          </p>
          <SupplierDataTable columns={supplierColumns} />
        </TabsContent>
      </Tabs>
    </div>
  );
}