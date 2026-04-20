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
  Database
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default async function ManufacturingPage() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // --- 1. HARD SECURITY: AUTH & TENANT RESOLUTION ---
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/login');

  // Resolve business context for forensic data scoping
  const { data: profile } = await supabase
    .from("profiles")
    .select("business_id, business_name")
    .eq("id", user.id)
    .single();

  if (!profile?.business_id) {
    return (
        <div className="p-10 flex items-center justify-center min-h-[400px]">
            <div className="text-center space-y-4">
                <ShieldCheck className="h-12 w-12 text-slate-200 mx-auto" />
                <p className="text-slate-500 font-black uppercase tracking-widest text-xs">Access Denied: Business Context Required</p>
            </div>
        </div>
    );
  }

  const businessId = profile.business_id;

  // --- 2. PARALLEL SECURE FETCH (High-Efficiency Node) ---
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
      .eq('tenant_id', businessId) // Scoping to current business
      .order("created_at", { ascending: false }),
    supabase
      .from("work_center_schedule")
      .select("*")
      .eq('tenant_id', businessId)
      .order("start_time", { ascending: true })
  ]);

  // --- 3. DATA TRANSFORMATION: Mapping DB to Audit-Ready Objects ---
  const orders = (ordersRes.data || []).map((o) => ({
    id: o.id,
    batch_number: o.batch_number || o.id.slice(0,10).toUpperCase(), 
    output_variant_id: o.output_variant_id,
    product_name: o.output_variant?.product?.name || "Unknown Asset",
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
    <div className="flex-1 space-y-10 p-8 md:p-12 bg-slate-50/40 min-h-screen animate-in fade-in duration-1000">
      
      {/* --- PAGE HEADER: ENTERPRISE STYLE --- */}
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-8 border-b border-slate-200 pb-10">
        <div className="flex items-center gap-6">
            <div className="p-4 bg-slate-900 rounded-[1.5rem] text-white shadow-2xl shadow-blue-900/10">
                <Factory size={32} />
            </div>
            <div>
                <h2 className="text-3xl font-black tracking-tighter text-slate-900">
                    Sovereign Manufacturing
                </h2>
                <div className="flex items-center gap-4 mt-1.5">
                    <p className="text-slate-400 text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                        <Database size={14} /> Node: {businessId.substring(0,8).toUpperCase()}
                    </p>
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-600 font-black px-3 py-0.5 border-emerald-100 uppercase text-[9px] tracking-widest rounded-full flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Forensic Audit Sync: Active
                    </Badge>
                </div>
            </div>
        </div>
        
        <div className="flex items-center gap-4">
             <div className="hidden md:flex flex-col text-right">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Global Status</span>
                <span className="text-sm font-bold text-slate-900">OPERATIONAL.v10.4</span>
             </div>
             <div className="h-12 w-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-blue-600 shadow-sm">
                <Zap size={20} />
             </div>
        </div>
      </div>
      
      {/* --- CORE MANAGEMENT TABS --- */}
      <Tabs defaultValue="orders" className="space-y-10">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            <TabsList className="bg-white border border-slate-200 p-1.5 shadow-xl rounded-2xl h-14 w-full lg:w-auto">
                <TabsTrigger 
                    value="orders" 
                    className="font-black px-12 h-11 data-[state=active]:bg-slate-900 data-[state=active]:text-white transition-all gap-3 uppercase text-[11px] tracking-widest rounded-xl"
                >
                    <ClipboardList size={16} />
                    Production Orders
                </TabsTrigger>
                <TabsTrigger 
                    value="schedule" 
                    className="font-black px-12 h-11 data-[state=active]:bg-slate-900 data-[state=active]:text-white transition-all gap-3 uppercase text-[11px] tracking-widest rounded-xl"
                >
                    <CalendarIcon size={16} />
                    Work Centers
                </TabsTrigger>
            </TabsList>
            
            <div className="flex items-center gap-8 px-8 py-3 bg-white border border-slate-200 rounded-2xl shadow-sm">
                <div className="text-center">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Active Runs</p>
                    <p className="text-lg font-black text-slate-900">{orders.filter(o => o.status !== 'completed').length}</p>
                </div>
                <div className="h-8 w-[1px] bg-slate-100" />
                <div className="text-center">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Verified Batches</p>
                    <p className="text-lg font-black text-emerald-600">{orders.filter(o => o.status === 'completed').length}</p>
                </div>
            </div>
        </div>

        <TabsContent value="orders" className="border-none p-0 outline-none animate-in slide-in-from-bottom-4 duration-500">
          <ManufacturingOrderManager />
        </TabsContent>

        <TabsContent value="schedule" className="border-none p-0 outline-none animate-in slide-in-from-bottom-4 duration-500">
          <WorkCenterSchedule initialData={schedule} />
        </TabsContent>
      </Tabs>

      {/* --- COMPLIANCE FOOTER --- */}
      <div className="pt-20 pb-10">
          <div className="flex justify-center items-center gap-6">
              <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-slate-200" />
              <div className="flex items-center gap-3">
                  <ShieldCheck size={16} className="text-slate-300" />
                  <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em]">
                      BBU1 NEURAL ERP • MANUFACTURING PROTOCOL v10.4.2
                  </p>
              </div>
              <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-slate-200" />
          </div>
          <p className="text-center text-[8px] font-bold text-slate-300 mt-4 uppercase tracking-widest">
            Licensed for Sovereign Enterprise Use • Forensic Isolation Verified
          </p>
      </div>
    </div>
  );
}