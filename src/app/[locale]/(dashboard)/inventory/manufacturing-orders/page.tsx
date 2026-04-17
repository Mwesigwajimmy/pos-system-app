import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ManufacturingOrderManager from "@/components/inventory/ManufacturingOrderManager";
import WorkCenterSchedule from "@/components/inventory/WorkCenterSchedule";

export default async function ManufacturingPage() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // 1. Get User Session for Tenant Security
  const { data: { user } } = await supabase.auth.getUser();
  const tenantId = user?.user_metadata?.tenant_id || "system";

  // 2. ENTERPRISE FETCH: Join with Products to get Names and SKUs
  // We use the new table name mfg_production_orders we defined in the SQL
  const [ordersRes, scheduleRes] = await Promise.all([
    supabase
      .from("mfg_production_orders")
      .select(`
        *,
        output_variant:product_variants (
          sku,
          product:products (name)
        )
      `)
      .order("created_at", { ascending: false }),
    supabase
      .from("work_center_schedule")
      .select("*")
      .order("start_time", { ascending: true })
  ]);

  // 3. DATA TRANSFORMATION: Mapping DB Joins to Component Props
  const orders = (ordersRes.data || []).map((o) => ({
    id: o.id,
    mo_number: o.batch_number || o.id.slice(0,8).toUpperCase(), // Fallback if no batch number
    output_variant_id: o.output_variant_id,
    product_name: o.output_variant?.product?.name || "Unknown Product",
    sku: o.output_variant?.sku || "N/A",
    planned_quantity: o.planned_quantity,
    status: o.status,
    tenant_id: o.tenant_id
  }));

  const schedule = (scheduleRes.data || []).map((s) => ({
    id: s.id,
    workCenter: s.work_center_name,
    product: s.product_name,
    scheduledStart: s.start_time,
    scheduledEnd: s.end_time,
    status: s.status,
    machineOperator: s.operator_name || "Unassigned",
    tenantId: s.tenant_id
  }));

  return (
    <div className="flex-1 space-y-4 p-8 pt-6 bg-slate-50/30 min-h-screen">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Manufacturing Operations</h2>
          <p className="text-slate-500 text-sm font-medium">Manage production runs, batch audits, and inventory synchronization.</p>
        </div>
      </div>
      
      <Tabs defaultValue="orders" className="space-y-6">
        <TabsList className="bg-white border border-slate-200 p-1 shadow-sm">
          <TabsTrigger value="orders" className="font-bold px-8">Manufacturing Orders</TabsTrigger>
          <TabsTrigger value="schedule" className="font-bold px-8">Work Center Schedule</TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="border-none p-0 outline-none">
          {/* We pass the initialData so the page loads instantly */}
          <ManufacturingOrderManager initialData={orders} />
        </TabsContent>

        <TabsContent value="schedule" className="border-none p-0 outline-none">
          <WorkCenterSchedule initialData={schedule} />
        </TabsContent>
      </Tabs>
    </div>
  );
}