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

  // --------------------------------------------------------------------------
  // 1. STRICT AUTHENTICATION
  // --------------------------------------------------------------------------
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect(`/${params.locale}/login`);
  }

  // --------------------------------------------------------------------------
  // 2. ACTIVE ENTITY CONTEXT (No Guessing)
  // --------------------------------------------------------------------------
  // We query the user's profile to find exactly which business unit they are 
  // currently operating in. This prevents data leaks between tenants.
  const { data: userProfile, error: profileError } = await supabase
    .from("user_profiles")
    .select("active_entity_slug")
    .eq("user_id", user.id)
    .single();

  if (profileError || !userProfile?.active_entity_slug) {
    // If user has no context, force them to the entity selection screen
    redirect(`/${params.locale}/select-entity`);
  }

  const activeSlug = userProfile.active_entity_slug;

  // --------------------------------------------------------------------------
  // 3. ENTITY CONFIGURATION (Currency & Locale)
  // --------------------------------------------------------------------------
  // Fetch the settings for this specific entity (e.g. Uganda Branch)
  // to ensure we display 'UGX' and format dates correctly.
  const { data: entityConfig, error: configError } = await supabase
    .from("entities")
    .select("name, currency_code, locale")
    .eq("slug", activeSlug)
    .single();

  if (configError || !entityConfig) {
    console.error(`Configuration Error for entity ${activeSlug}:`, configError);
    return (
      <div className="p-8 text-red-500">
        System Error: Entity configuration missing. Please contact IT support.
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // 4. SECURE DATA FETCHING (RPC)
  // --------------------------------------------------------------------------
  // Calculate inventory value on the server side using the strict entity slug.
  const { data: valuationData, error: rpcError } = await supabase.rpc("get_inventory_valuation", {
    target_entity_slug: activeSlug,
  });

  if (rpcError) {
    console.error("Valuation Logic Error:", rpcError);
    // In a real app, render a robust Error Boundary here
  }

  // Transform Postgres data types to strict TS types for the frontend
  const reportRows = (valuationData || []).map((row: any, index: number) => ({
    id: `val-${row.sku}-${index}`,
    productName: row.product_name,
    sku: row.sku,
    warehouseName: row.warehouse,
    stockQuantity: Number(row.quantity),     // Ensure numeric precision
    unitCost: Number(row.unit_cost),         // Ensure numeric precision
    totalValue: Number(row.total_value),     // Ensure numeric precision
  }));

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Inventory Valuation</h2>
          <p className="text-muted-foreground">
            Financial reporting for <span className="font-semibold text-foreground">{entityConfig.name}</span>
            <span className="ml-2 text-xs bg-muted px-2 py-1 rounded border">
              {activeSlug.toUpperCase()}
            </span>
          </p>
        </div>
      </div>
      
      {/* Pass the strictly fetched configuration to the UI */}
      <InventoryValuationReport 
        data={reportRows} 
        currencyCode={entityConfig.currency_code} // e.g., 'UGX', 'AUD', 'USD'
        locale={entityConfig.locale}              // e.g., 'en-UG', 'en-AU'
      />
    </div>
  );
}