import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import CycleCountProgram from "@/components/inventory/CycleCountProgram";

export default async function CycleCountsPage() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { data } = await supabase
    .from("cycle_counts")
    .select("*")
    .order("scheduled_date", { ascending: false });

  const counts = (data || []).map(c => ({
    id: c.id,
    warehouse: c.warehouse_name,
    product: c.product_name,
    sku: c.sku,
    scheduledDate: c.scheduled_date,
    countedBy: c.counted_by || "Pending",
    countedQty: c.counted_qty || 0,
    recordedQty: c.system_qty || 0,
    variance: (c.counted_qty || 0) - (c.system_qty || 0),
    status: c.status as "scheduled" | "done" | "reconciled",
    entity: c.entity,
    country: "UG",
    tenantId: "system"
  }));

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Cycle Count Program</h2>
      </div>
      <CycleCountProgram initialData={counts} />
    </div>
  );
}