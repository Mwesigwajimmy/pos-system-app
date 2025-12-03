import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import StockReplenishmentList, { ProductReorderEntry } from "@/components/inventory/StockReplenishmentList";

export default async function ReplenishmentPage() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // Real Query: Fetch products and join with preferred vendor
  const { data } = await supabase
    .from('products')
    .select('*, vendors(name, lead_time)')
    .order('name');

  // Logic: Determine status based on Real DB Data
  const products: ProductReorderEntry[] = (data || []).map((p: any) => {
    const currentStock = p.quantity_on_hand || 0;
    const rop = p.reorder_point || 0;
    
    return {
      id: p.id,
      name: p.name,
      sku: p.sku,
      currentStock: currentStock,
      reorderPoint: rop,
      reorderQuantity: p.reorder_quantity || 0,
      vendorName: p.vendors?.name || "Unknown",
      vendorLeadTime: p.vendors?.lead_time || 0,
      // Real-time logic:
      status: currentStock <= rop ? 'low_stock' : 'healthy'
    };
  });

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Replenishment</h2>
      </div>
      <StockReplenishmentList initialData={products} />
    </div>
  );
}