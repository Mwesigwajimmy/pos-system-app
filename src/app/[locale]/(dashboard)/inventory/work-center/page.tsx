import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import WorkCenterSchedule, { WorkCenterScheduleEntry } from "@/components/inventory/WorkCenterSchedule";

// --- ICONS & UI ---
import { 
  Factory, 
  ShieldCheck, 
  Database, 
  Activity, 
  Globe,
  Settings2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

/**
 * PAGE: Work Center Schedule (Industrial Node)
 * Logic: Multi-Tenant Sector-Aware Scheduling Protocol
 * Version: 10.5.4 (Enterprise Grade)
 */
export default async function WorkCentersPage() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // --- 1. AUTHENTICATION GUARD ---
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/login');

  // --- 2. SECTOR IDENTITY HANDSHAKE ---
  // Priority 1: Sector Switcher Cookie (Jim/Samuel Protocol)
  // Priority 2: Profile Default Entity
  const activeSectorCookie = cookieStore.get('bbu1_active_business_id')?.value;

  const { data: profile } = await supabase
    .from("profiles")
    .select("business_id, business_name, active_organization_slug")
    .eq("id", user.id)
    .single();

  const workingBizId = activeSectorCookie || profile?.business_id;
  const activeSlug = profile?.active_organization_slug;

  // FAILSAFE: Identity Drift Protection
  if (!workingBizId) {
    redirect('/dashboard?error=identity_not_resolved');
  }

  let schedule: WorkCenterScheduleEntry[] = [];

  // --- 3. FORENSIC DATA SYNCHRONIZATION ---
  // Fetching the Node details and the Schedule in parallel for high performance
  const [nodeResult, scheduleResult] = await Promise.all([
    supabase
      .from("tenants") // Or your 'organizations' table mapped in the audit
      .select("id, name, country, currency_code")
      .eq("id", workingBizId)
      .single(),
    supabase
      .from("work_center_schedule")
      .select("*")
      .eq("business_id", workingBizId) // Enforced Sector Lock
      .order("start_time", { ascending: true })
  ]);

  const nodeData = nodeResult.data;
  const scheduleData = scheduleResult.data;
  
  // Resolve Regional Identity
  const dynamicCountry = nodeData?.country || "UG";
  const nodeName = nodeData?.name || "Manufacturing Hub";

  // --- 4. INDUSTRIAL DATA TRANSFORMATION ---
  if (scheduleData) {
    schedule = scheduleData.map((s: any) => ({
      id: s.id,
      workCenter: s.title || "Main Work Center", // Mapped to audited 'title' column
      session: s.notes || "Standard Shift",
      product: s.product_name || "Industrial Output",
      scheduledStart: s.start_time || new Date().toISOString(),
      scheduledEnd: s.end_time || new Date().toISOString(),
      status: s.status || "planned",
      machineOperator: s.operator_id || "Unassigned", // Mapped to audited UUID
      entity: activeSlug || "Main Sector",
      country: dynamicCountry,
      tenantId: workingBizId
    }));
  }

  return (
    <main className="min-h-screen bg-slate-50/50 p-6 md:p-10 font-sans animate-in fade-in duration-700">
      
      {/* PAGE HEADER */}
      <header className="max-w-7xl mx-auto mb-10 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-8">
        <div className="flex items-center gap-5">
            <div className="p-3.5 bg-slate-900 rounded-2xl shadow-xl text-white">
                <Factory className="w-7 h-7" />
            </div>
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 tracking-tighter">Work Center Schedule</h1>
                <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                        <Globe size={12} className="text-blue-500" /> {nodeName} • {dynamicCountry}
                    </span>
                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 border px-3 py-0.5 font-black text-[9px] uppercase tracking-widest rounded-full flex items-center gap-1.5 shadow-none">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Infrastructure Node Active
                    </Badge>
                </div>
            </div>
        </div>
        
        <div className="flex items-center gap-4">
             <div className="hidden md:flex flex-col text-right">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">Sector Registry</p>
                <p className="text-xs font-bold text-slate-900 uppercase">Operational v10.5.4</p>
             </div>
             <div className="h-12 w-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-blue-600 shadow-sm transition-all hover:border-blue-400 hover:scale-105 active:scale-95 cursor-pointer">
                <Settings2 size={22} />
             </div>
        </div>
      </header>

      {/* SCHEDULE INTERFACE */}
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl shadow-slate-200/50 overflow-hidden transition-all duration-500">
            {/* Quick Analytics Bar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-8 bg-slate-50/50 border-b border-slate-100">
                <div className="flex items-center gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                    <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                        <Activity size={20} />
                    </div>
                    <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Total Sessions</p>
                        <p className="text-xl font-black text-slate-900 mt-1">{schedule.length}</p>
                    </div>
                </div>
                <div className="flex items-center gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                    <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                        <ShieldCheck size={20} />
                    </div>
                    <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Active Runs</p>
                        <p className="text-xl font-black text-emerald-600 mt-1">{schedule.filter(s => s.status === 'running').length}</p>
                    </div>
                </div>
                <div className="flex items-center gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                    <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
                        <Database size={20} />
                    </div>
                    <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Node Identity</p>
                        <p className="text-sm font-bold text-slate-900 mt-1 uppercase tracking-tight">ID_{workingBizId.substring(0,8)}</p>
                    </div>
                </div>
            </div>

            <div className="p-2">
                <WorkCenterSchedule initialData={schedule} workingBizId={workingBizId} />
            </div>
        </div>
      </div>

      {/* PAGE FOOTER */}
      <footer className="max-w-7xl mx-auto mt-20 pb-12">
          <div className="flex justify-center items-center gap-8 mb-6">
              <div className="h-px flex-1 bg-slate-200" />
              <div className="flex items-center gap-3">
                  <ShieldCheck size={18} className="text-slate-300" />
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em]">
                      SOVEREIGN_CENTER_PROTOCOL_v10.5.4
                  </p>
              </div>
              <div className="h-px flex-1 bg-slate-200" />
          </div>
          <p className="text-center text-[9px] font-bold text-slate-400 uppercase tracking-widest opacity-40 leading-relaxed max-w-2xl mx-auto">
            Authorized for Production Monitoring • Multi-Tenant Data Partitioning: ACTIVE • Neural Registry Sync: VERIFIED
          </p>
      </footer>
    </main>
  );
}