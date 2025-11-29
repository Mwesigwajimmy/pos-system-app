import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import PurchaseOrderDataTable from "@/components/purchases/PurchaseOrderDataTable";
import SupplierDataTable from "@/components/purchases/SupplierDataTable";
import { poColumns } from "@/components/purchases/poColumns";
import { supplierColumns } from "@/components/purchases/supplierColumns";

export default async function PurchasesPage() {
  // 1. Init Supabase on Server
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  
  // 2. Get Authenticated User
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/auth/login');
  }

  // 3. Get Tenant ID (Fallback to user ID if no specific tenant metadata exists)
  const tenantId = user.user_metadata?.tenant_id || user.id;

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
          {/* Note: Ensure PurchaseOrderDataTable is also updated to accept tenantId if you refactored it similarly */}
          <PurchaseOrderDataTable columns={poColumns} />
        </TabsContent>

        {/* Tab panel for Suppliers */}
        <TabsContent value="suppliers">
          <p className="text-sm text-muted-foreground mb-4">
            Manage all your supplier records and contact information.
          </p>
          {/* FIX: Passed the required tenantId prop here */}
          <SupplierDataTable columns={supplierColumns} tenantId={tenantId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}