import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ManufacturingOrderManager from "@/components/inventory/ManufacturingOrderManager";
import WorkCenterSchedule from "@/components/inventory/WorkCenterSchedule";
import { 
  Factory, 
  Calendar as CalendarIcon, 
  ClipboardList, 
  ShieldCheck, 
  Activity,
  LayoutDashboard
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

/**
 * --- MANUFACTURING OPERATIONS PAGE ---
 * Use: Enterprise management for production orders and facility scheduling.
 */

const generateProductionBatchId = () => {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `BATCH-${date}-${randomSuffix}`;
};

export default async function ManufacturingPage() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/login');

  const activeCookieId = cookieStore.get('bbu1_active_business_id')?.value;

  const { data: profile } = await supabase
    .from("profiles")
    .select("business_id, business_name, currency")
    .eq("id", user.id)
    .single();

  const workingBizId = activeCookieId || profile?.business_id;

  // 🛡️ PROFESSIONAL ACCESS GUARD
  if (!workingBizId) {
    return (
        <div className="min-h-screen bg-slate-50/20 flex items-center justify-center p-6">
            <div className="text-center space-y-6 max-w-sm bg-white p-12 rounded-3xl border border-slate-200 shadow-xl">
                <div className="h-14 w-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto border border-blue-100">
                    <ShieldCheck className="h-7 w-7 text-blue-500" />
                </div>
                <div className="space-y-2">
                    <h3 className="text-xl font-bold text-slate-900">Access Restricted</h3>
                    <p className="text-slate-500 text-sm leading-relaxed">
                      This session is not associated with an active production facility. Please select a business unit to proceed.
                    </p>
                </div>
                <Badge variant="secondary" className="bg-slate-100 text-slate-400 font-bold px-4 py-1 rounded-md text-[10px] uppercase tracking-widest border-none">
                    NO_BUSINESS_CONTEXT
                </Badge>
            </div>
        </div>
    );
  }

  const entityName = profile?.business_name || "Production Facility";

  // DATA HANDSHAKE
  const [ordersRes, scheduleRes] = await Promise.all([
    supabase
      .from("mfg_production_orders")
      .select(`
        *,
        output_variant:product_variants (
          id,
          sku,
          product:products (name)
        )
      `)
      .eq('business_id', workingBizId)
      .order("created_at", { ascending: false }),
    supabase
      .from("work_center_schedule")
      .select("*")
      .eq('business_id', workingBizId)
      .order("start_time", { ascending: true })
  ]);

  const orders = (ordersRes.data || []).map((o) => ({
    id: o.id,
    batch_number: o.batch_number || o.id.slice(0,12).toUpperCase(), 
    output_variant_id: o.output_variant_id,
    product_name: o.output_variant?.product?.name || "Standard Product",
    sku: o.output_variant?.sku || "N/A",
    planned_quantity: o.planned_quantity,
    actual_quantity_produced: o.actual_quantity_produced || 0,
    status: o.status,
    tenant_id: o.tenant_id,
    business_id: o.business_id,
    created_at: o.created_at,
    final_unit_cost: o.final_unit_cost || 0
  }));

  const schedule = (scheduleRes.data || []).map((s) => ({
    id: s.id,
    workCenter: s.title || "Main Work Center",
    product: s.notes || "Production Run",
    scheduledStart: s.start_time,
    scheduledEnd: s.end_time,
    status: s.status,
    machineOperator: s.operator_id || "Unassigned",
    tenantId: s.tenant_id || workingBizId
  }));

  const nextBatchSuggestion = generateProductionBatchId();

  return (
    <main className="min-h-screen bg-slate-50/20">
      <div className="max-w-[1600px] mx-auto py-10 px-6 md:px-12 space-y-10 animate-in fade-in duration-700">
        
        {/* CLEAN PAGE HEADER */}
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-slate-200 pb-10">
            <div className="flex items-center gap-6">
                <div className="p-4 bg-slate-900 rounded-2xl text-white shadow-lg">
                    <Factory className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Manufacturing Center</h1>
                    <div className="flex items-center gap-3">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            Facility: <span className="text-slate-800">{entityName}</span>
                        </span>
                        <div className="h-1 w-1 rounded-full bg-slate-300" />
                        <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-100 font-bold px-3 py-0.5 rounded-full text-[10px] uppercase tracking-wider">
                            System Connected
                        </Badge>
                    </div>
                </div>
            </div>
            
            <div className="hidden lg:flex items-center gap-4 text-right">
                <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Local Currency</p>
                    <p className="text-sm font-bold text-slate-700 uppercase">{profile?.currency || 'USD'}</p>
                </div>
            </div>
        </header>
        
        <Tabs defaultValue="orders" className="space-y-8">
            {/* CLEAN CONTROL & STATS BAR */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
                <TabsList className="bg-slate-50 p-1 rounded-xl h-12 w-full md:w-auto border border-slate-100">
                    <TabsTrigger 
                        value="orders" 
                        className="font-bold px-8 h-10 text-[10px] uppercase tracking-wider gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"
                    >
                        <ClipboardList size={14} />
                        Production Orders
                    </TabsTrigger>
                    <TabsTrigger 
                        value="schedule" 
                        className="font-bold px-8 h-10 text-[10px] uppercase tracking-wider gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"
                    >
                        <CalendarIcon size={14} />
                        Facility Schedule
                    </TabsTrigger>
                </TabsList>
                
                <div className="flex items-center gap-10 px-6">
                    <div className="text-right">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Active Runs</p>
                        <p className="text-xl font-bold text-slate-900 tabular-nums">
                            {orders.filter(o => o.status !== 'completed').length}
                        </p>
                    </div>
                    <div className="h-8 w-px bg-slate-100" />
                    <div className="text-right">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Completed</p>
                        <p className="text-xl font-bold text-emerald-600 tabular-nums">
                            {orders.filter(o => o.status === 'completed').length}
                        </p>
                    </div>
                    <div className="h-8 w-px bg-slate-100 hidden sm:block" />
                    <div className="hidden sm:block text-right">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">System Load</p>
                        <div className="flex items-center gap-2 justify-end">
                            <Activity size={14} className="text-blue-500" />
                            <span className="text-[10px] font-bold text-slate-700 uppercase">Balanced</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* MAIN CONTENT AREA */}
            <div className="animate-in slide-in-from-bottom-2 duration-500">
                <TabsContent value="orders" className="m-0 outline-none">
                    <ManufacturingOrderManager 
                        suggestedBatchId={nextBatchSuggestion} 
                        workingBizId={workingBizId}
                        currency={profile?.currency}
                    />
                </TabsContent>

                <TabsContent value="schedule" className="m-0 outline-none">
                    <WorkCenterSchedule initialData={schedule} workingBizId={workingBizId} />
                </TabsContent>
            </div>
        </Tabs>

        {/* FOOTER */}
        <footer className="pt-24 pb-12 border-t border-slate-100">
            <div className="flex justify-center items-center gap-6 mb-4 opacity-40">
                <div className="h-px w-20 bg-slate-200" />
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.4em]">
                    Enterprise Operations System
                </p>
                <div className="h-px w-20 bg-slate-200" />
            </div>
            <p className="text-center text-[10px] font-bold text-slate-300 uppercase tracking-widest">
              Audit Trail Verified • Managed Production Environment • Unit: {entityName}
            </p>
        </footer>
      </div>
    </main>
  );
}