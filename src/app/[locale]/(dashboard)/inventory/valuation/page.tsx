import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

// ✅ CORRECT PATH: Imports 'InventoryValuationReport.tsx'
import InventoryValuationReport from "@/components/inventory/InventoryValuationReport";

interface PageProps {
  params: { locale: string };
}

export default async function ValuationPage({ params }: PageProps) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${params.locale}/login`);

  const { data: userProfile } = await supabase
    .from("user_profiles")
    .select("active_entity_slug")
    .eq("user_id", user.id)
    .single();

  const activeSlug = userProfile?.active_entity_slug;
  if (!activeSlug) redirect(`/${params.locale}/select-entity`);

  const { data: entityConfig } = await supabase
    .from("entities")
    .select("name, currency_code, locale")
    .eq("slug", activeSlug)
    .single();

  // Call Supabase RPC function
  const { data: valuationData } = await supabase.rpc("get_inventory_valuation", {
    target_entity_slug: activeSlug,
  });

  // Map DB data to component props
  const reportRows = (valuationData || []).map((row: any, index: number) => ({
    id: `val-${row.sku}-${index}`,
    productName: row.product_name,
    sku: row.sku,
    warehouseName: row.warehouse,
    stockQuantity: Number(row.quantity),
    unitCost: Number(row.unit_cost),
    totalValue: Number(row.total_value),
  }));

  // ✅ CALLING THE COMPONENT
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Inventory Valuation</h2>
          <p className="text-muted-foreground">
            Financial reporting for <span className="font-semibold text-foreground">{entityConfig?.name || activeSlug}</span>
          </p>
        </div>
      </div>
      
      <InventoryValuationReport 
        data={reportRows} 
        currencyCode={entityConfig?.currency_code || 'USD'} 
        locale={entityConfig?.locale || 'en-US'}              
      />
    </div>
  );
}