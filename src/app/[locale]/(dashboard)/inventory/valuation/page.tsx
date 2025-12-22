import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import InventoryValuationReport from "@/components/inventory/InventoryValuationReport";

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

  const { data: { user } } = await supabase.auth.getUser();

  let activeSlug = null;
  if (user) {
    const { data: userProfile } = await supabase
      .from("user_profiles")
      .select("active_entity_slug")
      .eq("user_id", user.id)
      .single();
    activeSlug = userProfile?.active_entity_slug;
  }

  let reportRows: ValuationRow[] = [];
  let currencyCode = 'USD';
  let locale = 'en-US';
  let entityName = 'System';

  if (activeSlug) {
    // 1. Fetch Entity Configuration and live Valuation Data in parallel
    // Using v2 for enterprise-grade multi-currency and live inventory linking
    const [entityResult, valuationResult] = await Promise.all([
      supabase
        .from("organizations")
        .select("name, currency_code, locale")
        .eq("slug", activeSlug)
        .single(),
      supabase.rpc("get_inventory_valuation_v2", {
        target_entity_slug: activeSlug,
      })
    ]);

    const entityConfig = entityResult.data;
    const valuationData = valuationResult.data; // Conflict resolved: only defined once here

    if (entityConfig) {
      // 2. Dynamic multi-currency and locale configuration from DB
      currencyCode = entityConfig.currency_code || 'USD';
      locale = entityConfig.locale || 'en-US';
      entityName = entityConfig.name || activeSlug;
    }

    if (valuationData) {
      // 3. Map live data to the UI rows automatically
      reportRows = valuationData.map((row: any, index: number) => ({
        id: `val-${row.sku || index}-${index}`,
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
            Financial reporting for <span className="font-semibold text-foreground">{entityName}</span>
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