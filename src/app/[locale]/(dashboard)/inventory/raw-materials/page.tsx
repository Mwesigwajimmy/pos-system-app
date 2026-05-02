import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import RawMaterialPortal from '@/components/inventory/RawMaterialPortal';
import { 
  AlertCircle, 
  Database,
  History,
  LayoutGrid,
  ClipboardList,
  CheckCircle2,
  TrendingUp,
  Activity,
  ShieldCheck
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
    .order('name', { ascending: true });
    
  if (error) return [];
  return data || [];
}

export default async function RawMaterialOnboardingPage() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

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

  if (!businessId) {
    return (
        <div className="min-h-screen bg-white flex items-center justify-center p-6">
            <div className="max-w-sm w-full bg-white border border-slate-100 rounded-2xl p-10 shadow-sm text-center">
                <div className="h-12 w-12 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center mx-auto mb-6 border border-slate-100">
                    <AlertCircle size={24} />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Facility Link Required</h3>
                <p className="text-slate-500 text-xs leading-relaxed mb-8">
                    To access the registry, your account must be associated with an active production facility.
                </p>
                <Badge variant="outline" className="text-[9px] font-bold text-slate-300 uppercase tracking-widest border-slate-100">
                    ERR_PROFILE_UNLINKED
                </Badge>
            </div>
        </div>
    );
  }

  const [uoms, vendors] = await Promise.all([
    getUOMs(supabase),
    getVendors(supabase, businessId)
  ]);

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-[1400px] mx-auto py-8 px-6 md:px-12 space-y-10 animate-in fade-in duration-500">
        
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-slate-50 pb-8">
            <div className="flex items-center gap-5">
                <div className="p-3 bg-slate-900 rounded-xl text-white shadow-md">
                    <Database className="w-6 h-6" />
                </div>
                <div className="space-y-0.5">
                    <h1 className="text-2xl font-bold tracking-tight text-slate-950">Raw Material Registry</h1>
                    <div className="flex items-center gap-3">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                            <Activity size={12} className="text-blue-500" /> Facility: {entityName}
                        </span>
                        <Badge className="bg-emerald-50 text-emerald-600 font-bold px-3 py-0.5 rounded-full text-[9px] uppercase tracking-wider border-none">
                            Registry Active
                        </Badge>
                    </div>
                </div>
            </div>
            
            <div className="flex items-center gap-6">
                 <div className="hidden sm:block text-right">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Compliance Level</p>
                    <p className="text-xs font-bold text-slate-700 uppercase">Audit-Ready Protocol</p>
                 </div>
                 <Badge variant="outline" className="h-9 px-4 flex items-center text-slate-400 border-slate-200 font-bold text-[9px] uppercase tracking-widest rounded-lg">
                    v10.5.2
                 </Badge>
            </div>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
            <div className="xl:col-span-8">
                <RawMaterialPortal 
                  uoms={uoms} 
                  vendors={vendors} 
                  businessId={businessId} 
                />
            </div>

            <aside className="xl:col-span-4 space-y-6">
                <Card className="border border-slate-100 bg-slate-50/30 rounded-xl shadow-none overflow-hidden">
                    <CardHeader className="bg-white border-b border-slate-50 px-6 py-4">
                        <CardTitle className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-2 tracking-widest">
                           <ClipboardList size={14} className="text-blue-600"/> Onboarding Guidance
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="space-y-8">
                            <div className="flex gap-4">
                                <div className="h-9 w-9 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-slate-300 shrink-0 shadow-sm">
                                    <Activity size={16} />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs font-bold text-slate-800">Inventory Classification</p>
                                    <p className="text-[11px] text-slate-500 leading-relaxed">
                                        Accurately define properties to ensure compatibility with standard manufacturing cycles.
                                    </p>
                                </div>
                            </div>
                            
                            <div className="flex gap-4">
                                <div className="h-9 w-9 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-slate-300 shrink-0 shadow-sm">
                                    <ShieldCheck size={16} />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs font-bold text-slate-800">Standard Compliance</p>
                                    <p className="text-[11px] text-slate-500 leading-relaxed">
                                        Materials registered here follow pharmaceutical and food-safe standards for traceability.
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <div className="h-9 w-9 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-slate-300 shrink-0 shadow-sm">
                                    <TrendingUp size={16} />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs font-bold text-slate-800">Financial Accuracy</p>
                                    <p className="text-[11px] text-slate-500 leading-relaxed">
                                        Initial valuations are directly bridged to the general ledger for real-time balance sheet integrity.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-slate-100 bg-white rounded-xl p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                        <History size={14} className="text-slate-300" />
                        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Data Partitioning</h3>
                    </div>
                    <p className="text-[11px] font-medium text-slate-500 leading-relaxed">
                        Records are logically partitioned by facility ID to ensure privacy and precise stock management across multiple nodes.
                    </p>
                </Card>
            </aside>
        </div>

        <footer className="pt-20 pb-12">
            <div className="flex justify-center items-center gap-4 mb-6 opacity-30">
                <div className="h-px w-16 bg-slate-200" />
                <div className="flex items-center gap-2">
                    <LayoutGrid size={14} className="text-slate-400" />
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.4em]">
                        Node: {businessId.substring(0,8).toUpperCase()}
                    </p>
                </div>
                <div className="h-px w-16 bg-slate-200" />
            </div>
            
            <div className="flex flex-col md:flex-row justify-center items-center gap-4 md:gap-8 opacity-40">
                <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Cloud Sync Active</span>
                </div>
                <div className="flex items-center gap-2">
                    <CheckCircle2 size={12} className="text-emerald-500" />
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Integrity Verified</span>
                </div>
            </div>
        </footer>
      </div>
    </main>
  );
}