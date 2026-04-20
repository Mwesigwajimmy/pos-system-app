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
  LayoutGrid
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from '@/components/ui/badge';

// 1. DATA ACCESS: Fetching UOMs for the Selection Logic
async function getUOMs(supabase: any) {
  const { data } = await supabase
    .from('units_of_measure')
    .select('id, name, abbreviation')
    .order('name', { ascending: true });
  return data || [];
}

// 2. DATA ACCESS: Fetching Vendors for the Supplier Link
async function getVendors(supabase: any, businessId: string) {
  const { data } = await supabase
    .from('vendors')
    .select('id, name')
    .eq('business_id', businessId)
    .order('name', { ascending: true });
  return data || [];
}

export default async function RawMaterialOnboardingPage() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // --- 1. HARD SECURITY AUTH GUARD ---
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/login');

  // --- 2. MASTER IDENTITY RESOLUTION ---
  const { data: profile } = await supabase
    .from("profiles")
    .select("business_id, business_name, active_organization_slug")
    .eq("id", user.id)
    .single();

  if (!profile?.business_id) {
    return (
        <div className="p-8">
            <Alert variant="destructive" className="rounded-2xl border-2">
                <AlertCircle className="h-5 w-5" />
                <AlertTitle className="font-black uppercase tracking-widest text-xs">Identity Conflict</AlertTitle>
                <AlertDescription className="font-bold">
                    This terminal requires an active Business ID to onboard raw assets.
                </AlertDescription>
            </Alert>
        </div>
    );
  }

  const businessId = profile.business_id;
  const entityName = profile.business_name || "Sovereign Entity";

  // --- 3. PARALLEL DATA FETCHING (Zero Hardcoding) ---
  const [uoms, vendors] = await Promise.all([
    getUOMs(supabase),
    getVendors(supabase, businessId)
  ]);

  return (
    <div className="flex-1 space-y-8 p-6 md:p-10 pt-6 animate-in fade-in duration-700 bg-slate-50/40 min-h-screen">
      
      {/* --- HEADER SECTION --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-8 border-b border-slate-200">
        <div className="space-y-1">
          <div className="flex items-center gap-4">
             <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-100">
                <Database size={24} />
             </div>
             <div>
                <h2 className="text-3xl font-black tracking-tight text-slate-900">
                   Input Registry
                </h2>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">
                  Onboarding Raw Materials & Chemicals • {entityName}
                </p>
             </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
            <div className="hidden lg:flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black text-slate-500 uppercase tracking-widest shadow-sm">
                <ShieldCheck size={14} className="text-emerald-500" />
                Forensic Audit Active
            </div>
            <Badge className="bg-slate-900 text-white px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg">
                V10.2 SECURE
            </Badge>
        </div>
      </div>

      {/* --- MAIN PORTAL GRID --- */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
        
        {/* Left Side: The Primary Form Component */}
        <div className="xl:col-span-8">
            <RawMaterialPortal 
              uoms={uoms} 
              vendors={vendors} 
              businessId={businessId} 
            />
        </div>

        {/* Right Side: Quick Insight & Instructions */}
        <div className="xl:col-span-4 space-y-6">
            <div className="p-8 bg-slate-900 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group">
                <div className="absolute -right-10 -top-10 opacity-10 group-hover:scale-110 transition-transform">
                    <FlaskConical size={200} />
                </div>
                <h4 className="text-xs font-black uppercase tracking-[0.3em] text-blue-400 mb-6">Manufacturing Protocol</h4>
                <ul className="space-y-6">
                    <li className="flex gap-4">
                        <div className="h-6 w-6 rounded-full bg-blue-500/20 flex items-center justify-center text-[10px] font-bold shrink-0">1</div>
                        <p className="text-sm font-medium text-slate-300 leading-relaxed">
                            Define the <span className="text-white font-bold">Base Material</span> to create a unique SKU fingerprint.
                        </p>
                    </li>
                    <li className="flex gap-4">
                        <div className="h-6 w-6 rounded-full bg-blue-500/20 flex items-center justify-center text-[10px] font-bold shrink-0">2</div>
                        <p className="text-sm font-medium text-slate-300 leading-relaxed">
                            Assign <span className="text-white font-bold">Quality Grades</span> to automate forensic anomaly detection.
                        </p>
                    </li>
                    <li className="flex gap-4">
                        <div className="h-6 w-6 rounded-full bg-blue-500/20 flex items-center justify-center text-[10px] font-bold shrink-0">3</div>
                        <p className="text-sm font-medium text-slate-300 leading-relaxed">
                            Input <span className="text-white font-bold">Landed Cost</span> to initialize the Perpetual Valuation Ledger.
                        </p>
                    </li>
                </ul>
            </div>

            <div className="p-8 bg-white rounded-[2rem] border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center gap-3">
                    <History size={18} className="text-slate-400" />
                    <h5 className="text-[11px] font-black uppercase tracking-widest text-slate-400">System Integrity</h5>
                </div>
                <p className="text-xs font-bold text-slate-500 leading-loose">
                    Materials onboarded via this terminal are isolated from retail inventory to prevent cross-contamination in the Recipe Builder.
                </p>
            </div>
        </div>
      </div>

      {/* --- FOOTER --- */}
      <div className="mt-12 pt-8 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
          <div className="flex items-center gap-3">
            <LayoutGrid size={14} className="text-slate-300" />
            Infrastructure Node: {businessId.substring(0,8).toUpperCase()}
          </div>
          <div className="bg-emerald-50 text-emerald-600 px-4 py-1.5 rounded-full flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Neural Ledger Sync Enabled
          </div>
      </div>
    </div>
  );
}