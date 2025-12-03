import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import InventoryValuationReport from "@/components/inventory/InventoryValuationReport";

// Define the type locally to ensure type safety during build
interface ValuationRow {
  id: string;
  productName: string;
  sku: string;
  warehouseName: string;
  stockQuantity: number;
  unitCost: number;
  totalValue: number;
}

export default async function ValuationPage() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // 1. Authentication
  const { data: { user } } = await supabase.auth.getUser();

  // 2. Multi-tenant Context
  let activeSlug = null;
  if (user) {
    const { data: userProfile } = await supabase
      .from("user_profiles")
      .select("active_entity_slug")
      .eq("user_id", user.id)
      .single();
    activeSlug = userProfile?.active_entity_slug;
  }

  // 3. Initialize Variables (Safe defaults)
  let reportRows: ValuationRow[] = []; // Typed array to prevent build error
  let currencyCode = 'USD';
  let locale = 'en-US';

  if (activeSlug) {
    // 4. Fetch Entity Config (Currency/Locale)
    const { data: entityConfig } = await supabase
      .from("entities")
      .select("name, currency_code, locale")
      .eq("slug", activeSlug)
      .single();
    
    if (entityConfig) {
      currencyCode = entityConfig.currency_code || 'USD';
      locale = entityConfig.locale || 'en-US';
    }

    // 5. Fetch Valuation Data via RPC
    const { data: valuationData, error } = await supabase.rpc("get_inventory_valuation", {
      target_entity_slug: activeSlug,
    });

    if (!error && valuationData) {
      // 6. Map Data strictly
      reportRows = valuationData.map((row: any, index: number) => ({
        id: `val-${row.sku}-${index}`,
        productName: row.product_name || "Unknown Item",
        sku: row.sku || "N/A",
        warehouseName: row.warehouse || "Main",
        stockQuantity: Number(row.quantity) || 0,
        unitCost: Number(row.unit_cost) || 0,
        totalValue: Number(row.total_value) || 0,
      }));
    }
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Inventory Valuation</h2>
          <p className="text-muted-foreground">
            Financial reporting for <span className="font-semibold text-foreground">{activeSlug || 'System'}</span>
          </p>
        </div>
      </div>
      
      <InventoryValuationReport 
        data={reportRows} 
        currencyCode={currencyCode} 
        locale={locale}              
      />
    </div>
  );
}