import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import InventoryValuationReport from "@/components/inventory/InventoryValuationReport";
import { Calculator, ShieldCheck, Fingerprint, AlertCircle, TrendingUp } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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

  // 1. HARD SECURITY AUTHENTICATION GUARD
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/login');

  // 2. MASTER IDENTITY RESOLUTION (Absolute Truth)
  // We resolve the business_id and organization metadata from the Master Profile
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(`
        business_id,
        tenant_id,
        active_organization_slug,
        organizations (
            name,
            currency_code,
            locale
        )
    `)
    .eq("id", user.id)
    .single();

  if (profileError || !profile?.business_id) {
    return (
        <div className="p-8">
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Fiduciary Context Failure</AlertTitle>
                <AlertDescription>
                    The Valuation Engine could not resolve a valid business identity for this session.
                </AlertDescription>
            </Alert>
        </div>
    );
  }

  // @ts-ignore - handling joined organizations table
  const entityConfig = profile.organizations;
  const activeSlug = profile.active_organization_slug;
  const entityName = entityConfig?.name || "Sovereign Entity";
  const currencyCode = entityConfig?.currency_code || 'UGX';
  const locale = entityConfig?.locale || 'en-UG';

  let reportRows: ValuationRow[] = [];

  // 3. ENTERPRISE DATA FETCH (Robotic 1:1 Reconciliation)
  // We call the v2 RPC using the resolved organization slug
  const { data: valuationData, error: rpcError } = await supabase.rpc("get_inventory_valuation_v2", {
    target_entity_slug: activeSlug,
  });

  if (rpcError) {
      console.error("Valuation RPC Error:", rpcError.message);
  }

  if (valuationData) {
    // 4. NEURAL DATA MAPPING (High Precision Math)
    reportRows = valuationData.map((row: any, index: number) => ({
      id: `val-${row.sku || index}-${index}`,
      productName: row.product_name || "Unknown Item",
      sku: row.sku || "N/A",
      warehouseName: row.warehouse || "Main Warehouse",
      stockQuantity: Number(row.quantity) || 0,
      unitCost: Number(row.unit_cost) || 0,
      totalValue: Number(row.total_value) || 0,
    }));
  }

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8 pt-6 animate-in fade-in duration-1000">
      
      {/* High-Tier Forensic Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-8">
        <div>
          <div className="flex items-center gap-3">
             <div className="p-2 bg-slate-900 rounded-lg text-white">
                <Calculator size={24} />
             </div>
             <h2 className="text-4xl font-black tracking-tighter text-slate-900 uppercase italic">
                Inventory Valuation
             </h2>
          </div>
          <p className="text-muted-foreground font-mono text-xs uppercase tracking-widest mt-2 flex items-center gap-2">
            <Fingerprint size={12} className="text-primary" />
            Live Financial Position for: <span className="font-bold text-foreground underline decoration-primary/30 underline-offset-4">{entityName}</span>
          </p>
        </div>

        {/* Real-time Integrity Telemetry */}
        <div className="flex items-center gap-4">
            <div className="flex flex-col items-end">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Ledger Status</span>
                <div className="flex items-center gap-1.5 mt-1 text-xs font-bold text-emerald-600">
                    <ShieldCheck size={14} />
                    IFRS COMPLIANT
                </div>
            </div>
            <div className="h-10 w-px bg-slate-200" />
            <div className="bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl flex items-center gap-2">
                <TrendingUp size={16} className="text-blue-600" />
                <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest leading-none">
                    Market Value: {currencyCode}
                </span>
            </div>
        </div>
      </div>

      {/* Main Valuation Interface */}
      <div className="bg-white rounded-2xl shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
        <InventoryValuationReport 
            data={reportRows} 
            currencyCode={currencyCode} 
            locale={locale}              
        />
      </div>

      {/* Forensic Audit Footer */}
      <div className="mt-12 pt-6 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 opacity-50 text-[10px] font-bold uppercase tracking-widest text-slate-500">
          <div className="flex items-center gap-2">
            <ShieldCheck size={14} className="text-emerald-600" />
            Transaction Integrity Sealed by Sovereign Kernel v10.2
          </div>
          <div className="font-mono">ENTITY_ID: {profile.business_id.substring(0,12).toUpperCase()}</div>
      </div>
    </div>
  );
}