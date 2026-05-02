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
  Database,
  Settings2,
  Activity,
  CheckCircle2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const generateIndustrialBatchId = () => {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const salt = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `BATCH-${date}-${salt}`;
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

  if (!workingBizId) {
    return (
        <div className="min-h-screen bg-white flex items-center justify-center p-6">
            <div className="text-center space-y-6 max-w-sm bg-white p-10 rounded-2xl border border-slate-100 shadow-sm">
                <div className="h-12 w-12 bg-slate-50 rounded-xl flex items-center justify-center mx-auto border border-slate-100">
                    <ShieldCheck className="h-6 w-6 text-slate-400" />
                </div>
                <div className="space-y-2">
                    <h3 className="text-lg font-bold text-slate-900 tracking-tight">Access Restricted</h3>
                    <p className="text-slate-500 text-xs leading-relaxed">
                      Session not associated with an active production facility. Select a business unit from your profile to continue.
                    </p>
                </div>
                <Badge variant="outline" className="text-[9px] font-bold text-slate-300 uppercase tracking-widest border-slate-100">
                    ERR_PROFILE_NULL
                </Badge>
            </div>
        </div>
    );
  }

  const entityName = profile?.business_name || "Manufacturing Hub";

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
    workCenter: s.title || "Standard Work Center",
    product: s.notes || "Production Run",
    scheduledStart: s.start_time,
    scheduledEnd: s.end_time,
    status: s.status,
    machineOperator: s.operator_id || "Unassigned",
    tenantId: s.tenant_id || workingBizId
  }));

  const nextBatchSuggestion = generateIndustrialBatchId();

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-[1400px] mx-auto py-8 px-6 md:px-12 space-y-10 animate-in fade-in duration-500">
        
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-slate-50 pb-8">
            <div className="flex items-center gap-5">
                <div className="p-3 bg-slate-900 rounded-xl text-white shadow-md">
                    <Factory className="w-6 h-6" />
                </div>
                <div className="space-y-0.5">
                    <h1 className="text-2xl font-bold tracking-tight text-slate-950">Production Management</h1>
                    <div className="flex items-center gap-3">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                            <Database size={12} className="text-blue-500" /> {workingBizId.substring(0,8).toUpperCase()}
                        </span>
                        <Badge className="bg-emerald-50 text-emerald-600 font-bold px-3 py-0.5 rounded-full text-[9px] uppercase tracking-wider border-none">
                            Network Active
                        </Badge>
                    </div>
                </div>
            </div>
            
            <div className="flex items-center gap-6">
                 <div className="hidden sm:block text-right">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Environment</p>
                    <p className="text-xs font-bold text-slate-700 uppercase">{profile?.currency} • v4.0.2</p>
                 </div>
                 <button className="h-10 w-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all">
                    <Settings2 size={18} />
                 </button>
            </div>
        </header>
        
        <Tabs defaultValue="orders" className="space-y-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                <TabsList className="bg-slate-200/50 p-1 rounded-lg h-10 w-full md:w-auto">
                    <TabsTrigger 
                        value="orders" 
                        className="font-bold px-6 h-8 text-[10px] uppercase tracking-widest gap-2"
                    >
                        <ClipboardList size={12} />
                        Production Orders
                    </TabsTrigger>
                    <TabsTrigger 
                        value="schedule" 
                        className="font-bold px-6 h-8 text-[10px] uppercase tracking-widest gap-2"
                    >
                        <CalendarIcon size={12} />
                        Shift Schedule
                    </TabsTrigger>
                </TabsList>
                
                <div className="flex items-center gap-8 px-4">
                    <div className="text-right">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">In Progress</p>
                        <p className="text-lg font-bold text-slate-900 tabular-nums">{orders.filter(o => o.status !== 'completed').length}</p>
                    </div>
                    <div className="h-6 w-px bg-slate-200" />
                    <div className="text-right">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Total Yield</p>
                        <p className="text-lg font-bold text-emerald-600 tabular-nums">{orders.filter(o => o.status === 'completed').length}</p>
                    </div>
                    <div className="h-6 w-px bg-slate-200 hidden sm:block" />
                    <div className="hidden sm:block text-right">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Data Link</p>
                        <div className="flex items-center gap-1.5 justify-end">
                            <Activity size={12} className="text-blue-500" />
                            <span className="text-[10px] font-bold text-slate-700">OPTIMIZED</span>
                        </div>
                    </div>
                </div>
            </div>

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
        </Tabs>

        <footer className="pt-20 pb-12">
            <div className="flex justify-center items-center gap-4 mb-6 opacity-30">
                <div className="h-px w-16 bg-slate-200" />
                <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-slate-400" />
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.4em]">
                        Standard Architecture v4.0.2
                    </p>
                </div>
                <div className="h-px w-16 bg-slate-200" />
            </div>
            <p className="text-center text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed max-w-2xl mx-auto">
              Production Registry Access • Unit: {entityName} • Full Ledger Integrity Enabled
            </p>
        </footer>
      </div>
    </main>
  );
}