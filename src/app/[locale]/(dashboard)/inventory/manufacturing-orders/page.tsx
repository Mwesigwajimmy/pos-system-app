import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ManufacturingOrderManager from "@/components/inventory/ManufacturingOrderManager";
import WorkCenterSchedule from "@/components/inventory/WorkCenterSchedule";

export default async function ManufacturingPage() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // REAL DATA FETCHING - No mocks
  const [ordersRes, scheduleRes] = await Promise.all([
    supabase.from("manufacturing_orders").select("*").order("planned_start", { ascending: true }),
    supabase.from("work_center_schedule").select("*").order("start_time", { ascending: true })
  ]);

  // Transform DB data to UI props
  const orders = (ordersRes.data || []).map((o) => ({
    id: o.id,
    moNumber: o.mo_number,
    outputSku: o.sku,
    productName: o.product_name,
    quantity: o.quantity,
    plannedStart: o.planned_start,
    plannedFinish: o.planned_finish,
    status: o.status,
    workCenter: o.work_center_id,
    entity: o.entity,
    country: o.country,
    tenantId: "system" // or from auth context
  }));

  const schedule = (scheduleRes.data || []).map((s) => ({
    id: s.id,
    workCenter: s.work_center_name,
    session: s.session_name,
    product: s.product_name,
    scheduledStart: s.start_time,
    scheduledEnd: s.end_time,
    status: s.status as "planned" | "running" | "stopped" | "finished",
    machineOperator: s.operator_name || "Unassigned",
    entity: s.entity,
    country: "UG", // Assuming default or fetch from related entity table
    tenantId: "system"
  }));

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Manufacturing Operations</h2>
      </div>
      <Tabs defaultValue="orders" className="space-y-4">
        <TabsList>
          <TabsTrigger value="orders">Manufacturing Orders</TabsTrigger>
          <TabsTrigger value="schedule">Work Center Schedule</TabsTrigger>
        </TabsList>
        <TabsContent value="orders">
          <ManufacturingOrderManager initialData={orders} />
        </TabsContent>
        <TabsContent value="schedule">
          <WorkCenterSchedule initialData={schedule} />
        </TabsContent>
      </Tabs>
    </div>
  );
}