import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import CompositeRegistry from '@/components/inventory/CompositeRegistry';
import { 
  ShieldCheck, 
  Database,
  Layers,
  Settings2,
  ChevronRight,
  Activity,
  Globe,
  Lock
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default async function CompositeDesignerPage() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/login');

  const activeSectorCookie = cookieStore.get('bbu1_active_business_id')?.value;

  const { data: profile } = await supabase
    .from("profiles")
    .select("business_id, business_name, currency, active_organization_slug")
    .eq("id", user.id)
    .single();

  const workingBizId = activeSectorCookie || profile?.business_id;

  if (!workingBizId) {
    return (
        <div className="min-h-screen bg-white flex items-center justify-center p-6">
            <div className="text-center space-y-6 max-w-sm bg-white p-10 rounded-2xl border border-slate-100 shadow-sm">
                <div className="h-12 w-12 bg-slate-50 rounded-xl flex items-center justify-center mx-auto border border-slate-100">
                    <Lock className="h-6 w-6 text-slate-400" />
                </div>
                <div className="space-y-2">
                    <h3 className="text-lg font-bold text-slate-900 tracking-tight">Identity Handshake Failed</h3>
                    <p className="text-slate-500 text-xs leading-relaxed">
                      This designer requires an active Production Node identity. Please select a sector from your dashboard to proceed.
                    </p>
                </div>
                <Badge variant="outline" className="text-[9px] font-bold text-slate-300 uppercase tracking-widest border-slate-100">
                    ERR_IDENTITY_NULL
                </Badge>
            </div>
        </div>
    );
  }

  const entityName = profile?.business_name || "Enterprise Hub";
  const nodeIdentity = workingBizId.substring(0, 8).toUpperCase();

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-[1400px] mx-auto py-8 px-6 md:px-12 space-y-10 animate-in fade-in duration-500">
        
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-slate-50 pb-8">
            <div className="flex items-center gap-5">
                <div className="p-3 bg-slate-900 rounded-xl text-white shadow-md">
                    <Settings2 className="w-6 h-6" />
                </div>
                <div className="space-y-0.5">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest flex items-center gap-1.5">
                           <Layers size={12} /> Production Catalog
                        </span>
                        <ChevronRight size={10} className="text-slate-300" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            Designer
                        </span>
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-950">Asset Designer</h1>
                    <div className="flex items-center gap-3 mt-2">
                         <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 border border-slate-100 rounded-lg">
                            <Globe size={12} className="text-blue-500" />
                            <span className="text-[11px] font-bold text-slate-600 uppercase">
                                {entityName}
                            </span>
                         </div>
                         <Badge className="bg-slate-900 text-white font-bold px-3 py-0.5 rounded-full text-[9px] uppercase tracking-wider border-none">
                            NODE_{nodeIdentity}
                         </Badge>
                    </div>
                </div>
            </div>
            
            <div className="flex items-center gap-6">
                 <div className="hidden sm:block text-right">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Environment Status</p>
                    <div className="flex items-center justify-end gap-2 mt-0.5">
                        <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-tight">System Optimal</span>
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    </div>
                 </div>
                 <Badge variant="outline" className="h-9 px-4 flex items-center text-slate-400 border-slate-200 font-bold text-[9px] uppercase tracking-widest rounded-lg">
                    V10.5.5
                 </Badge>
            </div>
        </header>

        <div className="animate-in slide-in-from-bottom-2 duration-700">
            <CompositeRegistry />
        </div>

        <footer className="pt-20 pb-12">
            <div className="flex justify-center items-center gap-4 mb-6 opacity-30">
                <div className="h-px w-16 bg-slate-200" />
                <div className="flex items-center gap-2">
                    <ShieldCheck size={14} className="text-slate-400" />
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.4em]">
                        Industrial Protocol Node: {nodeIdentity}
                    </p>
                </div>
                <div className="h-px w-16 bg-slate-200" />
            </div>
            
            <div className="flex flex-col md:flex-row justify-center items-center gap-4 md:gap-8 opacity-40">
                <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Registry Handshake Verified</span>
                </div>
                <div className="flex items-center gap-2">
                    <Activity size={12} className="text-emerald-500" />
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Ledger Sync: High Integrity</span>
                </div>
            </div>
        </footer>
      </div>
    </main>
  );
}