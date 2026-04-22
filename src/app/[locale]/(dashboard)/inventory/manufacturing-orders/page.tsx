import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

// --- UI ARCHITECTURE ---
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ManufacturingOrderManager from "@/components/inventory/ManufacturingOrderManager";
import WorkCenterSchedule from "@/components/inventory/WorkCenterSchedule";

// --- ICONS & BRANDING ---
import { 
  Factory, 
  Calendar as CalendarIcon, 
  ClipboardList, 
  ShieldCheck, 
  Database,
  Settings2,
  Cpu,
  Activity,
  CheckCircle2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

/**
 * UTILITY: Batch ID Generator
 * Generates a professional batch identification string for production tracking.
 * Compliant with standard inventory management protocols.
 */
const generateIndustrialBatchId = () => {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const salt = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `BATCH-${date}-${salt}`;
};

export default async function ManufacturingPage() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // --- 1. AUTHENTICATION & IDENTITY RESOLUTION ---
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/login');

  // RESOLVE ACTIVE CONTEXT
  const activeCookieId = cookieStore.get('bbu1_active_business_id')?.value;

  const { data: profile } = await supabase
    .from("profiles")
    .select("business_id, business_name, currency")
    .eq("id", user.id)
    .single();

  const workingBizId = activeCookieId || profile?.business_id;

  // FAILSAFE: Access Restriction
  if (!workingBizId) {
    return (
        <div className="min-h-screen bg-white flex items-center justify-center p-10">
            <div className="text-center space-y-6 max-w-md bg-white p-12 rounded-xl border border-slate-200">
                <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto border border-slate-100">
                    <ShieldCheck className="h-8 w-8 text-slate-400" />
                </div>
                <div className="space-y-2">
                    <h3 className="text-xl font-semibold text-slate-900 tracking-tight">Business Profile Not Linked</h3>
                    <p className="text-slate-500 text-sm leading-relaxed">
                      Your current session is not associated with an active production facility. Please select a business from your dashboard to continue.
                    </p>
                </div>
                <Badge variant="outline" className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Error: Profile_Incomplete</Badge>
            </div>
        </div>
    );
  }

  const entityName = profile?.business_name || "Manufacturing Hub";

  // --- 2. DATA SYNCHRONIZATION ---
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

  // --- 3. DATA TRANSFORMATION ---
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
    <main className="min-h-screen bg-white p-6 md:p-10 font-sans selection:bg-blue-50">
      
      {/* PROFESSIONAL PAGE HEADER */}
      <header className="max-w-[1600px] mx-auto mb-10 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-8 border-b border-slate-100 pb-10">
        <div className="flex items-center gap-6">
            <div className="p-4 bg-slate-900 rounded-lg shadow-sm text-white">
                <Factory className="w-6 h-6" />
            </div>
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">Manufacturing Center</h1>
                <div className="flex items-center gap-4 mt-2">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Database size={14} className="text-blue-500" /> Facility: {workingBizId.substring(0,8).toUpperCase()}
                    </span>
                    <Badge variant="outline" className="bg-emerald-50/50 text-emerald-700 border-emerald-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        System Sync: Online
                    </Badge>
                </div>
            </div>
        </div>
        
        <div className="flex items-center gap-6">
             <div className="hidden md:flex flex-col text-right">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Environment Status</p>
                <p className="text-sm font-semibold text-slate-700">Enterprise v4.0 • {profile?.currency}</p>
             </div>
             <button className="h-11 w-11 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50/30 transition-all shadow-sm">
                <Settings2 size={20} />
             </button>
        </div>
      </header>
      
      {/* TABS & ANALYTICS INTERFACE */}
      <Tabs defaultValue="orders" className="max-w-[1600px] mx-auto space-y-10">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-8 bg-slate-50/50 p-6 rounded-xl border border-slate-100 shadow-sm">
            <TabsList className="bg-slate-200/50 p-1 rounded-lg h-12 w-full lg:w-auto">
                <TabsTrigger 
                    value="orders" 
                    className="font-bold px-8 h-10 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm transition-all gap-2 text-xs uppercase tracking-wider"
                >
                    <ClipboardList size={14} />
                    Production Orders
                </TabsTrigger>
                <TabsTrigger 
                    value="schedule" 
                    className="font-bold px-8 h-10 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm transition-all gap-2 text-xs uppercase tracking-wider"
                >
                    <CalendarIcon size={14} />
                    Shift Schedule
                </TabsTrigger>
            </TabsList>
            
            <div className="flex items-center gap-10">
                <div className="flex flex-col items-center lg:items-end">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Orders</p>
                    <p className="text-2xl font-bold text-slate-900">{orders.filter(o => o.status !== 'completed').length}</p>
                </div>
                <div className="h-8 w-px bg-slate-200 hidden lg:block" />
                <div className="flex flex-col items-center lg:items-end">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Completed Runs</p>
                    <p className="text-2xl font-bold text-emerald-600">{orders.filter(o => o.status === 'completed').length}</p>
                </div>
                <div className="h-8 w-px bg-slate-200 hidden lg:block" />
                <div className="hidden xl:flex flex-col items-end">
                    <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">Network Status</p>
                    <div className="flex items-center gap-2">
                        <Activity size={14} className="text-blue-400" />
                        <span className="text-xs font-bold text-slate-700">OPTIMIZED</span>
                    </div>
                </div>
            </div>
        </div>

        <TabsContent value="orders" className="outline-none mt-0">
          <ManufacturingOrderManager 
             suggestedBatchId={nextBatchSuggestion} 
             workingBizId={workingBizId}
             currency={profile?.currency}
          />
        </TabsContent>

        <TabsContent value="schedule" className="outline-none mt-0">
          <WorkCenterSchedule initialData={schedule} workingBizId={workingBizId} />
        </TabsContent>
      </Tabs>

      {/* REFINED PAGE FOOTER */}
      <footer className="max-w-[1600px] mx-auto mt-24 pb-12">
          <div className="flex justify-center items-center gap-6 mb-8">
              <div className="h-px flex-1 bg-slate-100" />
              <div className="flex items-center gap-3">
                  <CheckCircle2 size={16} className="text-slate-300" />
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.4em]">
                      Enterprise Manufacturing System v4.0
                  </p>
              </div>
              <div className="h-px flex-1 bg-slate-100" />
          </div>
          <p className="text-center text-[10px] font-semibold text-slate-400 uppercase tracking-widest leading-relaxed max-w-3xl mx-auto">
            Authorized Production Access • Business Unit: {entityName} • Inventory Control Enabled • Data Integrity Verified
          </p>
      </footer>
    </main>
  );
}