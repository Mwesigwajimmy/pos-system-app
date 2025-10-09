// src/app/(dashboard)/inventory/page.tsx
import InventoryDataTable from "@/components/inventory/InventoryDataTable";
import { columns } from "@/components/inventory/columns";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { Button } from "@/components/ui/button"; // <-- Import Button
import Link from "next/link"; // <-- Import Link

export default async function InventoryPage() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { data, error } = await supabase.rpc('get_paginated_products', {
    p_page: 1,
    p_page_size: 10,
  });

  if (error) {
    console.error("Error fetching initial products:", error);
  }

  const initialData = data?.products ?? [];
  const totalCount = data?.total_count ?? 0;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center"> {/* <-- Add this container */}
        <h1 className="text-3xl font-bold">Inventory Management</h1>
        {/* Add a link to the new adjustment page */}
        <Button variant="secondary" asChild>
            <Link href="/inventory/adjustments">New Stock Adjustment</Link>
        </Button>
      </div>
      <InventoryDataTable
        columns={columns}
        initialData={initialData}
        totalCount={totalCount}
      />
    </div>
  );
}