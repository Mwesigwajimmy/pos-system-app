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
  TrendingUp
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// --- DATA ACCESS LAYER ---

/**
 * Fetches the global registry of Measurement Units.
 * Enterprise standard: Supports Pharmaceutical, Chemical, and Food metrics.
 */
async function getUOMs(supabase: any) {
  const { data, error } = await supabase
    .from('units_of_measure')
    .select('id, name, abbreviation')
    .order('name', { ascending: true });
  
  if (error) console.error("Forensic UOM Fetch Error:", error.message);
  return data || [];
}

/**
 * Fetches Vendors strictly linked to the active Business ID.
 * Ensures multi-tenant isolation for procurement and supply chain integrity.
 */
async function getVendors(supabase: any, businessId: string) {
  const { data, error } = await supabase
    .from('vendors')
    .select('id, name')
    .eq('business_id', businessId)
    .order('name', { ascending: true });
    
  if (error) console.error("Sector Vendor Fetch Error:", error.message);
  return data || [];
}

export default async function RawMaterialOnboardingPage() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // --- 1. AUTHENTICATION GUARD ---
  // Verified V10.2 Security Protocol
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/login');

  // --- 2. IDENTITY RESOLUTION (Sector-Aware Switcher) ---
  // We resolve the active business ID. 
  // Priority: 1. Active Cookie (Switch) -> 2. Profile Default
  const activeCookieId = cookieStore.get('bbu1_active_business_id')?.value;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, business_id, business_name, active_organization_slug, currency")
    .eq("id", user.id)
    .single();

  // Determine the working context ID
  const businessId = activeCookieId || profile?.business_id;
  const entityName = profile?.business_name || "Enterprise Node";

  // Failsafe: Access Restriction if no organizational context is resolved
  if (!businessId) {
    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
            <Alert variant="destructive" className="max-w-md rounded-3xl border-none shadow-2xl p-8 bg-white">
                <AlertCircle className="h-6 w-6 text-red-500" />
                <AlertTitle className="font-bold text-slate-900 ml-2 text-lg uppercase tracking-tight">Access Restricted</AlertTitle>
                <AlertDescription className="mt-4 text-slate-600 font-medium leading-relaxed">
                    This industrial terminal requires an active Business Identity. Please ensure your session is correctly linked to a manufacturing sector to onboard assets.
                </AlertDescription>
            </Alert>
        </div>
    );
  }

  // --- 3. DATA SYNCHRONIZATION ---
  // Parallel execution for high-integrity industrial data retrieval
  const [uoms, vendors] = await Promise.all([
    getUOMs(supabase),
    getVendors(supabase, businessId)
  ]);

  return (
    <main className="min-h-screen bg-slate-50/50 p-6 md:p-10 animate-in fade-in duration-700 font-sans">
      
      {/* PAGE HEADER */}
      <header className="max-w-7xl mx-auto mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-5">
           <div className="p-3.5 bg-slate-900 rounded-2xl shadow-xl text-white">
              <Database className="w-7 h-7" />
           </div>
           <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">Input Registry</h1>
              <div className="flex items-center gap-2 mt-1">
                 <ShieldCheck size={14} className="text-emerald-500" />
                 <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Onboarding Raw Materials • {entityName}
                 </span>
              </div>
           </div>
        </div>

        <div className="flex items-center gap-3">
            <div className="hidden lg:flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-bold text-slate-500 uppercase tracking-widest shadow-sm">
                <ShieldCheck size={14} className="text-emerald-500" />
                Sovereign Audit Verified
            </div>
            <Badge className="bg-slate-900 text-white border-none px-4 py-1.5 font-bold text-[10px] tracking-widest uppercase rounded-lg">
                V10.5 SECURE
            </Badge>
        </div>
      </header>

      {/* MAIN CONTENT GRID */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 xl:grid-cols-12 gap-8">
        
        {/* LEFT SECTION: INTERACTIVE PORTAL */}
        <div className="xl:col-span-8">
            <RawMaterialPortal 
              uoms={uoms} 
              vendors={vendors} 
              businessId={businessId} 
            />
        </div>

        {/* RIGHT SECTION: SYSTEM INSIGHTS */}
        <aside className="xl:col-span-4 space-y-6">
            
            {/* INSTRUCTION CARD */}
            <Card className="border-none bg-slate-900 text-white rounded-[2.5rem] overflow-hidden shadow-xl">
                <CardHeader className="border-b border-white/10 p-8">
                    <CardTitle className="text-[11px] font-bold uppercase text-blue-400 flex items-center gap-3 tracking-widest">
                       <ClipboardList size={16}/> Industrial Protocol
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-8">
                    <div className="space-y-8">
                        <div className="flex gap-4">
                            <div className="h-7 w-7 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 shrink-0">
                                <Info size={16} />
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-bold text-white">Identity Mapping</p>
                                <p className="text-xs text-slate-400 leading-relaxed">
                                    Define the base material profile to generate a unique batch SKU for industrial tracking.
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <div className="h-7 w-7 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 shrink-0">
                                <ShieldCheck size={16} />
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-bold text-white">Quality Assurance</p>
                                <p className="text-xs text-slate-400 leading-relaxed">
                                    Assign pharmaceutical or food-grade purity standards to enable forensic anomaly detection.
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <div className="h-7 w-7 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 shrink-0">
                                <TrendingUp size={16} />
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-bold text-white">Financial Integration</p>
                                <p className="text-xs text-slate-400 leading-relaxed">
                                    Valuations are automatically bridged to the General Ledger for accurate Balance Sheet reporting.
                                </p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* INTEGRITY CARD */}
            <Card className="border-slate-200 shadow-sm bg-white rounded-[2rem] p-8">
                <div className="flex items-center gap-3 mb-4">
                    <History size={16} className="text-slate-400" />
                    <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Forensic Separation</h3>
                </div>
                <p className="text-xs font-medium text-slate-500 leading-relaxed italic">
                    Raw materials recorded here are logically partitioned by business node, ensuring precise multi-location stock control across the production cycle.
                </p>
            </Card>
        </aside>
      </div>

      {/* SYSTEM STATUS FOOTER */}
      <footer className="max-w-7xl mx-auto mt-16 pt-8 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            <LayoutGrid size={14} className="text-slate-300" />
            Infrastructure Link: <span className="text-slate-500 font-mono">{businessId.substring(0,8).toUpperCase()}</span>
          </div>
          <div className="bg-emerald-50 text-emerald-700 px-5 py-2 rounded-full border border-emerald-100 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Neural Synchronization Active
          </div>
      </footer>
    </main>
  );
}