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
  Zap, 
  Activity,
  Database,
  LayoutDashboard,
  Settings2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default async function ManufacturingPage() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // --- 1. AUTHENTICATION & BUSINESS RESOLUTION ---
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/login');

  const { data: profile } = await supabase
    .from("profiles")
    .select("business_id, business_name")
    .eq("id", user.id)
    .single();

  if (!profile?.business_id) {
    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-10">
            <div className="text-center space-y-4 max-w-sm bg-white p-10 rounded-3xl shadow-sm border border-slate-100">
                <ShieldCheck className="h-12 w-12 text-slate-200 mx-auto" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Business Context Required</h3>
                <p className="text-slate-500 text-xs leading-relaxed">
                  Your account must be linked to an active organization to access manufacturing data.
                </p>
            </div>
        </div>
    );
  }

  const businessId = profile.business_id;

  // --- 2. DATA SYNCHRONIZATION ---
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
      .eq('tenant_id', businessId)
      .order("created_at", { ascending: false }),
    supabase
      .from("work_center_schedule")
      .select("*")
      .eq('tenant_id', businessId)
      .order("start_time", { ascending: true })
  ]);

  // --- 3. DATA TRANSFORMATION ---
  const orders = (ordersRes.data || []).map((o) => ({
    id: o.id,
    batch_number: o.batch_number || o.id.slice(0,10).toUpperCase(), 
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
    <main className="min-h-screen bg-slate-50/50 p-6 md:p-10 animate-in fade-in duration-700 font-sans">
      
      {/* PAGE HEADER */}
      <header className="max-w-7xl mx-auto mb-10 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-8">
        <div className="flex items-center gap-5">
            <div className="p-3.5 bg-slate-900 rounded-2xl shadow-xl text-white">
                <Factory className="w-7 h-7" />
            </div>
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">Manufacturing Hub</h1>
                <div className="flex items-center gap-3 mt-1">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Database size={13} /> Node: {businessId.substring(0,8).toUpperCase()}
                    </span>
                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 border px-3 py-0.5 font-bold text-[10px] uppercase tracking-wide rounded-full flex items-center gap-1.5 shadow-none">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Real-time Sync Active
                    </Badge>
                </div>
            </div>
        </div>
        
        <div className="flex items-center gap-4">
             <div className="hidden md:flex flex-col text-right">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">System Status</p>
                <p className="text-xs font-bold text-slate-900 uppercase">Operational v10.4</p>
             </div>
             <div className="h-11 w-11 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-blue-600 shadow-sm">
                <Settings2 size={20} />
             </div>
        </div>
      </header>
      
      {/* TABS & ANALYTICS BAR */}
      <Tabs defaultValue="orders" className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
            <TabsList className="bg-slate-100/50 p-1 rounded-xl h-12 w-full lg:w-auto">
                <TabsTrigger 
                    value="orders" 
                    className="font-bold px-8 h-10 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm transition-all gap-2 text-xs uppercase tracking-tight rounded-lg"
                >
                    <ClipboardList size={16} />
                    Production Orders
                </TabsTrigger>
                <TabsTrigger 
                    value="schedule" 
                    className="font-bold px-8 h-10 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm transition-all gap-2 text-xs uppercase tracking-tight rounded-lg"
                >
                    <CalendarIcon size={16} />
                    Work Schedules
                </TabsTrigger>
            </TabsList>
            
            <div className="flex items-center gap-8 px-6">
                <div className="flex flex-col items-center lg:items-end">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Active Batches</p>
                    <p className="text-xl font-bold text-slate-900">{orders.filter(o => o.status !== 'completed').length}</p>
                </div>
                <div className="h-8 w-px bg-slate-200 hidden lg:block" />
                <div className="flex flex-col items-center lg:items-end">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Completed Runs</p>
                    <p className="text-xl font-bold text-emerald-600">{orders.filter(o => o.status === 'completed').length}</p>
                </div>
            </div>
        </div>

        <TabsContent value="orders" className="outline-none mt-0 animate-in slide-in-from-bottom-2 duration-500">
          <ManufacturingOrderManager />
        </TabsContent>

        <TabsContent value="schedule" className="outline-none mt-0 animate-in slide-in-from-bottom-2 duration-500">
          <WorkCenterSchedule initialData={schedule} />
        </TabsContent>
      </Tabs>

      {/* PAGE FOOTER */}
      <footer className="max-w-7xl mx-auto mt-20 pb-10">
          <div className="flex justify-center items-center gap-6 mb-4">
              <div className="h-px flex-1 bg-slate-200" />
              <div className="flex items-center gap-2">
                  <ShieldCheck size={14} className="text-slate-300" />
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Production Protocol v10.4.2
                  </p>
              </div>
              <div className="h-px flex-1 bg-slate-200" />
          </div>
          <p className="text-center text-[9px] font-semibold text-slate-400 uppercase tracking-widest opacity-60">
            Licensed for Enterprise Use • Manufacturing Registry Sync Verified
          </p>
      </footer>
    </main>
  );
}