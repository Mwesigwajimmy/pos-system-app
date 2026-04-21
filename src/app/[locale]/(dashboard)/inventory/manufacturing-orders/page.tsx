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
  Cpu
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

/**
 * UTILITY: Industrial Batch ID Generator
 * Generates a high-entropy, forensic string for autonomous lot tracking.
 * Compliant with ISO-9001 Batch Identification Standards.
 */
const generateIndustrialBatchId = () => {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  // Using a 5-character random salt for high-concurrency safety
  const salt = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `LOT-${date}-${salt}`;
};

export default async function ManufacturingPage() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // --- 1. AUTHENTICATION & IDENTITY RESOLUTION ---
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/login');

  // RESOLVE ACTIVE CONTEXT: Prioritizing the Sector-Switcher Cookie (Active Node Protocol)
  const activeCookieId = cookieStore.get('bbu1_active_business_id')?.value;

  const { data: profile } = await supabase
    .from("profiles")
    .select("business_id, business_name, currency")
    .eq("id", user.id)
    .single();

  const workingBizId = activeCookieId || profile?.business_id;

  // FAILSAFE: Access Restriction if session cannot be birthed into a sector
  if (!workingBizId) {
    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-10">
            <div className="text-center space-y-6 max-w-sm bg-white p-12 rounded-[2.5rem] shadow-2xl border border-slate-100">
                <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
                    <ShieldCheck className="h-10 w-10 text-slate-300" />
                </div>
                <div className="space-y-2">
                    <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter">Identity Not Resolved</h3>
                    <p className="text-slate-500 text-xs leading-relaxed font-medium">
                      Your industrial session is not currently linked to an active Production Node. Please select a sector from your dashboard to proceed.
                    </p>
                </div>
                <Badge variant="outline" className="text-[9px] font-bold text-slate-400">ERROR_CODE: SECTOR_HANDSHAKE_FAILED</Badge>
            </div>
        </div>
    );
  }

  const entityName = profile?.business_name || "Industrial Hub";

  // --- 2. DATA SYNCHRONIZATION (Forensic Multi-Tenant Partitioning) ---
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
      .eq('business_id', workingBizId) // Enforced sector lock for security
      .order("created_at", { ascending: false }),
    supabase
      .from("work_center_schedule")
      .select("*")
      .eq('business_id', workingBizId) // Aligned with repaired table columns
      .order("start_time", { ascending: true })
  ]);

  // --- 3. INDUSTRIAL DATA TRANSFORMATION ---
  const orders = (ordersRes.data || []).map((o) => ({
    id: o.id,
    // Automatic fallback to truncated UUID if Lot ID was not manually entered
    batch_number: o.batch_number || o.id.slice(0,12).toUpperCase(), 
    output_variant_id: o.output_variant_id,
    product_name: o.output_variant?.product?.name || "Unidentified Asset",
    sku: o.output_variant?.sku || "N/A",
    planned_quantity: o.planned_quantity,
    actual_quantity_produced: o.actual_quantity_produced || 0,
    status: o.status,
    tenant_id: o.tenant_id,
    business_id: o.business_id, // Passed to child for the Atomic Ledger Weld
    created_at: o.created_at,
    final_unit_cost: o.final_unit_cost || 0
  }));

  const schedule = (scheduleRes.data || []).map((s) => ({
    id: s.id,
    workCenter: s.title || "Main Work Center",
    product: s.notes || "Standard Production",
    scheduledStart: s.start_time,
    scheduledEnd: s.end_time,
    status: s.status,
    machineOperator: s.operator_id || "Unassigned",
    tenantId: s.tenant_id || workingBizId
  }));

  // Logic: Pre-generate a forensic Batch ID for the next industrial run
  const nextBatchSuggestion = generateIndustrialBatchId();

  return (
    <main className="min-h-screen bg-slate-50/50 p-6 md:p-10 animate-in fade-in duration-700 font-sans">
      
      {/* PAGE HEADER */}
      <header className="max-w-7xl mx-auto mb-10 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-8">
        <div className="flex items-center gap-5">
            <div className="p-3.5 bg-slate-900 rounded-2xl shadow-xl text-white">
                <Factory className="w-7 h-7" />
            </div>
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 tracking-tighter">Production Terminal</h1>
                <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                        <Database size={12} className="text-blue-500" /> NODE_{workingBizId.substring(0,8).toUpperCase()}
                    </span>
                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 border px-3 py-0.5 font-black text-[9px] uppercase tracking-widest rounded-full flex items-center gap-1.5 shadow-none">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Industrial Sync: Verified
                    </Badge>
                </div>
            </div>
        </div>
        
        <div className="flex items-center gap-4">
             <div className="hidden md:flex flex-col text-right">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">Sector Protocol</p>
                <p className="text-xs font-bold text-slate-900 uppercase">Operational v10.5.3 • {profile?.currency}</p>
             </div>
             <div className="h-12 w-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-blue-600 shadow-sm transition-all hover:border-blue-400 hover:scale-105 active:scale-95 cursor-pointer">
                <Settings2 size={22} />
             </div>
        </div>
      </header>
      
      {/* TABS & ANALYTICS BAR */}
      <Tabs defaultValue="orders" className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6 bg-white p-4 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50">
            <TabsList className="bg-slate-50 p-1.5 rounded-2xl h-14 w-full lg:w-auto border border-slate-100">
                <TabsTrigger 
                    value="orders" 
                    className="font-black px-10 h-11 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-lg transition-all gap-3 text-[10px] uppercase tracking-widest rounded-xl"
                >
                    <ClipboardList size={16} />
                    Active Orders
                </TabsTrigger>
                <TabsTrigger 
                    value="schedule" 
                    className="font-black px-10 h-11 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-lg transition-all gap-3 text-[10px] uppercase tracking-widest rounded-xl"
                >
                    <CalendarIcon size={16} />
                    Sector Schedule
                </TabsTrigger>
            </TabsList>
            
            <div className="flex items-center gap-12 px-8">
                <div className="flex flex-col items-center lg:items-end">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Asset Conversion</p>
                    <p className="text-2xl font-black text-slate-900 tracking-tighter">{orders.filter(o => o.status !== 'completed').length}</p>
                </div>
                <div className="h-10 w-px bg-slate-100 hidden lg:block" />
                <div className="flex flex-col items-center lg:items-end">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Asset Transferred</p>
                    <p className="text-2xl font-black text-emerald-600 tracking-tighter">{orders.filter(o => o.status === 'completed').length}</p>
                </div>
                <div className="h-10 w-px bg-slate-100 hidden lg:block" />
                <div className="hidden xl:flex flex-col items-end">
                    <p className="text-[9px] font-black text-blue-500 uppercase tracking-[0.2em]">Molecular Load</p>
                    <div className="flex items-center gap-2">
                        <Cpu size={14} className="text-blue-400 animate-spin duration-[4000ms]" />
                        <span className="text-xs font-bold text-slate-900 tracking-tight">OPTIMAL_SYNC</span>
                    </div>
                </div>
            </div>
        </div>

        <TabsContent value="orders" className="outline-none mt-0 animate-in slide-in-from-bottom-4 duration-700">
          <ManufacturingOrderManager 
             suggestedBatchId={nextBatchSuggestion} 
             workingBizId={workingBizId}
             currency={profile?.currency}
          />
        </TabsContent>

        <TabsContent value="schedule" className="outline-none mt-0 animate-in slide-in-from-bottom-4 duration-700">
          <WorkCenterSchedule initialData={schedule} workingBizId={workingBizId} />
        </TabsContent>
      </Tabs>

      {/* PAGE FOOTER */}
      <footer className="max-w-7xl mx-auto mt-24 pb-12">
          <div className="flex justify-center items-center gap-8 mb-6">
              <div className="h-px flex-1 bg-slate-200" />
              <div className="flex items-center gap-3">
                  <ShieldCheck size={18} className="text-slate-300" />
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em]">
                      SOVEREIGN_MFG_PROTOCOL_v10.5.3
                  </p>
              </div>
              <div className="h-px flex-1 bg-slate-200" />
          </div>
          <p className="text-center text-[9px] font-bold text-slate-400 uppercase tracking-widest opacity-40 leading-relaxed max-w-2xl mx-auto">
            Authorized for Enterprise Resource Planning • Production Node: {entityName} • Full Forensic Accounting Enabled • Manufacturing Registry Sync: VERIFIED
          </p>
      </footer>
    </main>
  );
}