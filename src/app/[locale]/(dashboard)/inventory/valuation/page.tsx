import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import InventoryValuationReport from "@/components/inventory/InventoryValuationReport";

interface PageProps {
  params: { locale: string };
}

export default async function ValuationPage({ params }: PageProps) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect(`/${params.locale}/login`);
  }

  const { data: userProfile, error: profileError } = await supabase
    .from("user_profiles")
    .select("active_entity_slug")
    .eq("user_id", user.id)
    .single();

  if (profileError || !userProfile?.active_entity_slug) {
    redirect(`/${params.locale}/select-entity`);
  }

  const activeSlug = userProfile.active_entity_slug;

  const { data: entityConfig, error: configError } = await supabase
    .from("entities")
    .select("name, currency_code, locale")
    .eq("slug", activeSlug)
    .single();

  if (configError || !entityConfig) {
    console.error(`Configuration Error for entity ${activeSlug}:`, configError);
    return (
      <div className="p-8 text-red-500">
        System Error: Entity configuration missing.
      </div>
    );
  }

  const { data: valuationData, error: rpcError } = await supabase.rpc("get_inventory_valuation", {
    target_entity_slug: activeSlug,
  });

  if (rpcError) {
    console.error("Valuation Logic Error:", rpcError);
  }

  const reportRows = (valuationData || []).map((row: any, index: number) => ({
    id: `val-${row.sku}-${index}`,
    productName: row.product_name,
    sku: row.sku,
    warehouseName: row.warehouse,
    stockQuantity: Number(row.quantity),
    unitCost: Number(row.unit_cost),
    totalValue: Number(row.total_value),
  }));

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Inventory Valuation</h2>
          <p className="text-muted-foreground">
            Financial reporting for <span className="font-semibold text-foreground">{entityConfig.name}</span>
          </p>
        </div>
      </div>
      
      <InventoryValuationReport 
        data={reportRows} 
        currencyCode={entityConfig.currency_code} 
        locale={entityConfig.locale}              
      />
    </div>
  );
}