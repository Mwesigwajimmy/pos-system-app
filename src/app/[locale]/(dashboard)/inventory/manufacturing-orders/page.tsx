import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ManufacturingOrderManager from "@/components/inventory/ManufacturingOrderManager";
import WorkCenterSchedule from "@/components/inventory/WorkCenterSchedule";
import { Factory, Calendar as CalendarIcon, ClipboardList } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default async function ManufacturingPage() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // 1. Get User Session for Tenant Security (Logic Intact)
  const { data: { user } } = await supabase.auth.getUser();
  const tenantId = user?.user_metadata?.tenant_id || "system";

  // 2. ENTERPRISE FETCH (Logic Intact)
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

  // 3. DATA TRANSFORMATION (Logic Intact)
  const orders = (ordersRes.data || []).map((o) => ({
    id: o.id,
    mo_number: o.batch_number || o.id.slice(0,8).toUpperCase(), 
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
    <div className="flex-1 space-y-8 p-8 pt-10 bg-slate-50/50 min-h-screen animate-in fade-in duration-500">
      
      {/* PAGE HEADER */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-200 pb-8">
        <div className="flex items-center gap-5">
            <div className="p-3.5 bg-blue-50 rounded-xl border border-blue-100 text-blue-600 shadow-sm">
                <Factory size={28} />
            </div>
            <div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">Manufacturing Operations</h2>
                <div className="flex items-center gap-3 mt-1">
                    <p className="text-slate-500 text-sm font-medium">Production runs, batch cycles, and center scheduling.</p>
                    <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 font-bold px-2 py-0 border border-emerald-100 uppercase text-[10px]">
                        Live Audit Active
                    </Badge>
                </div>
            </div>
        </div>
      </div>
      
      {/* TABBED INTERFACE */}
      <Tabs defaultValue="orders" className="space-y-8">
        <div className="flex items-center justify-between">
            <TabsList className="bg-white border border-slate-200 p-1 shadow-sm rounded-lg h-11">
                <TabsTrigger 
                    value="orders" 
                    className="font-bold px-10 h-9 data-[state=active]:bg-[#2557D6] data-[state=active]:text-white transition-all gap-2"
                >
                    <ClipboardList size={16} />
                    Manufacturing Orders
                </TabsTrigger>
                <TabsTrigger 
                    value="schedule" 
                    className="font-bold px-10 h-9 data-[state=active]:bg-[#2557D6] data-[state=active]:text-white transition-all gap-2"
                >
                    <CalendarIcon size={16} />
                    Work Center Schedule
                </TabsTrigger>
            </TabsList>
            
            <div className="hidden lg:flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                System Status: Operational
                <div className="h-2 w-2 rounded-full bg-emerald-500" />
            </div>
        </div>

        <TabsContent value="orders" className="border-none p-0 outline-none animate-in slide-in-from-bottom-2 duration-300">
          <ManufacturingOrderManager initialData={orders} />
        </TabsContent>

        <TabsContent value="schedule" className="border-none p-0 outline-none animate-in slide-in-from-bottom-2 duration-300">
          <WorkCenterSchedule initialData={schedule} />
        </TabsContent>
      </Tabs>

      {/* COMPLIANCE FOOTER */}
      <div className="flex justify-center items-center gap-4 pt-10 opacity-30">
          <div className="h-[1px] w-12 bg-slate-400" />
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              MRP Engine • Production Version 10.4
          </p>
          <div className="h-[1px] w-12 bg-slate-400" />
      </div>
    </div>
  );
}