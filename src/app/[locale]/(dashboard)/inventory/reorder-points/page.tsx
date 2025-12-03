import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
// FIX: Import the List component, NOT the settings manager
import StockReplenishmentList, { ProductReorderEntry } from "@/components/inventory/StockReplenishmentList";

export default async function ReorderPointsPage() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // REAL DATA FETCHING
  const { data } = await supabase
    .from('products')
    .select(`
      id, name, sku, stock_quantity, reorder_point, reorder_quantity, 
      vendors (id, name, lead_time_days)
    `)
    .order('name');

  // Map to the Interface
  const products: ProductReorderEntry[] = (data || []).map((p: any) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    // Handle database column names safely (using stock_quantity or quantity_on_hand depending on your schema)
    currentStock: p.stock_quantity || p.quantity_on_hand || 0,
    reorderPoint: p.reorder_point || 0,
    reorderQuantity: p.reorder_quantity || 0,
    vendorName: p.vendors?.name || "No Vendor",
    vendorLeadTime: p.vendors?.lead_time_days || 0,
    status: (p.stock_quantity || 0) <= (p.reorder_point || 0) ? "low_stock" : "healthy"
  }));

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Procurement & Reorder Points</h2>
      </div>
      {/* Use the correct list component */}
      <StockReplenishmentList initialData={products} />
    </div>
  );
}