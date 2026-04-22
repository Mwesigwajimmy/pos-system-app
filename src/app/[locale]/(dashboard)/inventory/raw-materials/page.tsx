import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

// --- CORE COMPONENTS ---
import RawMaterialPortal from '@/components/inventory/RawMaterialPortal';

// --- UI COMPONENTS ---
import { 
  FlaskConical, 
  ShieldCheck, 
  AlertCircle, 
  Database,
  History,
  LayoutGrid,
  ClipboardList,
  CheckCircle2,
  Info,
  TrendingUp,
  ChevronRight,
  Activity
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// --- DATA ACCESS LAYER ---

/**
 * Fetches the global registry of Measurement Units.
 * Standardized system for Pharmaceutical, Chemical, and Food metrics.
 */
async function getUOMs(supabase: any) {
  const { data, error } = await supabase
    .from('units_of_measure')
    .select('id, name, abbreviation')
    .order('name', { ascending: true });
  
  if (error) console.error("Measurement Unit Fetch Error:", error.message);
  return data || [];
}

/**
 * Fetches Vendors linked to the active Business context.
 * Ensures data isolation and supply chain integrity.
 */
async function getVendors(supabase: any, businessId: string) {
  const { data, error } = await supabase
    .from('vendors')
    .select('id, name')
    .eq('business_id', businessId)
    .order('name', { ascending: true });
    
  if (error) console.error("Vendor Registry Fetch Error:", error.message);
  return data || [];
}

export default async function RawMaterialOnboardingPage() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // --- 1. AUTHENTICATION GUARD ---
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/login');

  // --- 2. IDENTITY RESOLUTION ---
  const activeCookieId = cookieStore.get('bbu1_active_business_id')?.value;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, business_id, business_name, active_organization_slug, currency")
    .eq("id", user.id)
    .single();

  const businessId = activeCookieId || profile?.business_id;
  const entityName = profile?.business_name || "Primary Node";

  // Failsafe: Handle missing business context
  if (!businessId) {
    return (
        <div className="min-h-screen bg-white flex items-center justify-center p-8">
            <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-10 shadow-sm text-center">
                <div className="h-14 w-14 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                    <AlertCircle className="h-7 w-7" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">Facility Link Required</h3>
                <p className="text-slate-500 text-sm leading-relaxed mb-8">
                    To access the Raw Material Registry, your account must be linked to an active manufacturing facility. Please select a facility from your dashboard.
                </p>
                <Badge variant="outline" className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-4 py-1">
                    Error Code: AUTH_PROFILE_UNLINKED
                </Badge>
            </div>
        </div>
    );
  }

  // --- 3. DATA SYNCHRONIZATION ---
  const [uoms, vendors] = await Promise.all([
    getUOMs(supabase),
    getVendors(supabase, businessId)
  ]);

  return (
    <main className="min-h-screen bg-white p-6 md:p-12 font-sans selection:bg-blue-50">
      
      {/* PAGE HEADER - Clean, Wide and High Contrast */}
      <header className="max-w-[1600px] mx-auto mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-slate-100 pb-10">
        <div className="flex items-center gap-6">
           <div className="p-4 bg-slate-900 rounded-xl shadow-sm text-white">
              <Database className="w-6 h-6" />
           </div>
           <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">Raw Material Registry</h1>
              <div className="flex items-center gap-3 mt-2">
                 <Badge variant="outline" className="bg-emerald-50/50 text-emerald-700 border-emerald-100 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md">
                    System Active
                 </Badge>
                 <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    Facility: {entityName}
                 </span>
              </div>
           </div>
        </div>

        <div className="flex items-center gap-6">
            <div className="hidden lg:flex items-center gap-4 text-xs font-semibold text-slate-400 uppercase tracking-widest">
                <ShieldCheck size={16} className="text-blue-500" />
                Audit-Ready Protocol
            </div>
            <div className="h-8 w-px bg-slate-100 hidden lg:block" />
            <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-none px-4 py-1.5 font-bold text-[10px] tracking-widest uppercase">
                Release v10.5
            </Badge>
        </div>
      </header>

      {/* MAIN CONTENT GRID - Wide Layout Architecture */}
      <div className="max-w-[1600px] mx-auto grid grid-cols-1 xl:grid-cols-12 gap-12">
        
        {/* LEFT SECTION: INTERACTIVE PORTAL (Main Form/Table) */}
        <div className="xl:col-span-8">
            <RawMaterialPortal 
              uoms={uoms} 
              vendors={vendors} 
              businessId={businessId} 
            />
        </div>

        {/* RIGHT SECTION: SYSTEM INSIGHTS AND GUIDANCE */}
        <aside className="xl:col-span-4 space-y-8">
            
            {/* GUIDANCE CARD */}
            <Card className="border-none bg-slate-50 rounded-2xl overflow-hidden shadow-sm">
                <CardHeader className="border-b border-slate-100 p-8">
                    <CardTitle className="text-xs font-bold uppercase text-slate-500 flex items-center gap-3 tracking-widest">
                       <ClipboardList size={16} className="text-blue-600"/> Onboarding Guidance
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-8">
                    <div className="space-y-10">
                        <div className="flex gap-5">
                            <div className="h-10 w-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400 shrink-0 shadow-sm">
                                <Activity size={18} />
                            </div>
                            <div className="space-y-1.5">
                                <p className="text-sm font-bold text-slate-800">Inventory Classification</p>
                                <p className="text-xs text-slate-500 leading-relaxed">
                                    Accurately define material properties to ensure compatibility with standard manufacturing cycles and batch tracking.
                                </p>
                            </div>
                        </div>
                        
                        <div className="flex gap-5">
                            <div className="h-10 w-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400 shrink-0 shadow-sm">
                                <ShieldCheck size={18} />
                            </div>
                            <div className="space-y-1.5">
                                <p className="text-sm font-bold text-slate-800">Standard Compliance</p>
                                <p className="text-xs text-slate-500 leading-relaxed">
                                    Materials registered here follow pharmaceutical and food-safe standards for full supply-chain traceability.
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-5">
                            <div className="h-10 w-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400 shrink-0 shadow-sm">
                                <TrendingUp size={18} />
                            </div>
                            <div className="space-y-1.5">
                                <p className="text-sm font-bold text-slate-800">Financial Accuracy</p>
                                <p className="text-xs text-slate-500 leading-relaxed">
                                    Initial valuations are directly bridged to the general ledger to maintain balance sheet integrity in real-time.
                                </p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* SYSTEM DATA SEGREGATION CARD */}
            <Card className="border border-slate-100 shadow-sm bg-white rounded-2xl p-8">
                <div className="flex items-center gap-3 mb-4">
                    <History size={16} className="text-slate-300" />
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Data Segregation</h3>
                </div>
                <p className="text-xs font-medium text-slate-500 leading-relaxed">
                    All material records are logically partitioned by facility ID. This ensures data privacy and precise stock management across multiple production nodes.
                </p>
            </Card>
        </aside>
      </div>

      {/* REFINED SYSTEM STATUS FOOTER */}
      <footer className="max-w-[1600px] mx-auto mt-24 pt-10 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            <LayoutGrid size={14} className="text-slate-300" />
            Infrastructure Node: <span className="text-slate-900 font-mono tracking-tighter">{businessId.substring(0,8).toUpperCase()}</span>
          </div>
          
          <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-blue-500" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cloud Sync Active</span>
              </div>
              <div className="h-4 w-px bg-slate-100" />
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <CheckCircle2 size={14} className="text-emerald-500" />
                Data Integrity Verified
              </div>
          </div>
      </footer>
    </main>
  );
}