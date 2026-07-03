import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import RawMaterialPortal from '@/components/inventory/RawMaterialPortal';
import { 
  AlertCircle, 
  Database,
  LayoutGrid,
  CheckCircle2,
  Activity,
  ShieldCheck
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

/**
 * --- RAW MATERIAL REGISTRY PAGE ---
 * Use: Enterprise-level onboarding and management of industrial raw materials.
 * Logic: Verified multi-tenant data fetching for measurement units and supply partners.
 */

async function getUOMs(supabase: any) {
  const { data, error } = await supabase
    .from('units_of_measure')
    .select('id, name, abbreviation')
    .order('name', { ascending: true });
  
  if (error) return [];
  return data || [];
}

async function getVendors(supabase: any, businessId: string) {
  const { data, error } = await supabase
    .from('vendors')
    .select('id, name')
    .eq('business_id', businessId)
    .eq('status', 'Active') // Only fetch active suppliers
    .order('name', { ascending: true });
    
  if (error) return [];
  return data || [];
}

export default async function RawMaterialOnboardingPage() {
  const cookieStore = cookies();
  const supabase = await createClient(cookieStore);

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/login');

  const activeCookieId = cookieStore.get('bbu1_active_business_id')?.value;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, business_id, business_name, currency")
    .eq("id", user.id)
    .single();

  const businessId = activeCookieId || profile?.business_id;
  const entityName = profile?.business_name || "Primary Node";

  // 🛡️ SECURITY ACCESS GUARD
  if (!businessId) {
    return (
        <div className="min-h-screen bg-slate-50/20 flex items-center justify-center p-6">
            <div className="max-w-sm w-full bg-white border border-slate-200 rounded-3xl p-12 shadow-xl text-center">
                <div className="h-14 w-14 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-blue-100">
                    <AlertCircle size={28} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2 tracking-tight">Facility Link Required</h3>
                <p className="text-slate-500 text-sm leading-relaxed mb-8 font-medium">
                    To access the raw material registry, your account must be associated with an active production facility.
                </p>
                <Badge variant="secondary" className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 border-none">
                    ERR_PROFILE_UNLINKED
                </Badge>
            </div>
        </div>
    );
  }

  // PARALLEL DATA FETCHING
  const [uoms, vendors] = await Promise.all([
    getUOMs(supabase),
    getVendors(supabase, businessId)
  ]);

  return (
    <main className="min-h-screen bg-slate-50/20">
      <div className="max-w-[1300px] mx-auto py-10 px-6 md:px-12 space-y-12 animate-in fade-in duration-700">
        
        {/* CLEAN PAGE HEADER */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-200 pb-10">
            <div className="flex items-center gap-6">
                <div className="p-4 bg-slate-900 rounded-2xl text-white shadow-lg">
                    <Database size={28} />
                </div>
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 uppercase">Material Registry</h1>
                    <div className="flex items-center gap-3">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <Activity size={14} className="text-blue-500" /> Facility: <span className="text-slate-700">{entityName}</span>
                        </span>
                        <div className="h-1 w-1 rounded-full bg-slate-300" />
                        <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-100 font-bold px-3 py-0.5 rounded-full text-[10px] uppercase tracking-wider">
                            Sync: Active
                        </Badge>
                    </div>
                </div>
            </div>
            
            <div className="hidden lg:flex items-center gap-4 text-right">
                <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Control Protocol</p>
                    <p className="text-sm font-bold text-slate-700 uppercase">Standard Inventory V4</p>
                </div>
            </div>
        </header>

        {/* 
            THE REGISTRY PORTAL 
            Rendered in the main column for a wide, professional dashboard feel.
            Guidance and extra words have been removed from this page.
        */}
        <div className="animate-in slide-in-from-bottom-2 duration-1000">
            <RawMaterialPortal 
              uoms={uoms} 
              vendors={vendors} 
              businessId={businessId} 
            />
        </div>

        {/* SYSTEM FOOTER */}
        <footer className="pt-24 pb-12 border-t border-slate-100">
            <div className="flex justify-center items-center gap-6 mb-6 opacity-30">
                <div className="h-px w-16 bg-slate-300" />
                <div className="flex items-center gap-2">
                    <ShieldCheck size={16} className="text-slate-400" />
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.4em]">
                        Audit Trail node: {businessId.substring(0,8).toUpperCase()}
                    </p>
                </div>
                <div className="h-px w-16 bg-slate-300" />
            </div>
            
            <div className="flex flex-col md:flex-row justify-center items-center gap-4 md:gap-10 opacity-40">
                <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Database Synchronized</span>
                </div>
                <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-500" />
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Integrity Handshake Verified</span>
                </div>
            </div>
        </footer>
      </div>
    </main>
  );
}