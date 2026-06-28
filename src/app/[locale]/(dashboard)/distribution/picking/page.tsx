/**
 * --- WAREHOUSE PICKING QUEUE ---
 * Use: Enterprise dashboard listing manifests awaiting warehouse collection.
 * Path: /distribution/picking
 */

import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { 
    Warehouse, 
    ClipboardList, 
    ChevronRight, 
    Package, 
    Clock, 
    Search,
    ListChecks
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function PickingQueuePage({ params: { locale } }: { params: { locale: string } }) {
  
  // 1. Authentication & Security Handshake
  const supabase = await createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);

  const { data: profile } = await supabase
    .from("profiles")
    .select("business_id, business_name")
    .eq("id", user.id)
    .single();

  if (!profile?.business_id) redirect(`/${locale}/dashboard`);

  // 2. Fetch Manifests awaiting picking (Status is 'sealed' or 'pending')
  const { data: manifests } = await supabase
    .from('logistics_manifests')
    .select(`
        id,
        status,
        created_at,
        shipment_ref,
        shipment_type
    `)
    .eq('business_id', profile.business_id)
    .neq('status', 'delivered')
    .order('created_at', { ascending: false });

  return (
    <main className="min-h-screen bg-slate-50/20 p-6 lg:p-10 space-y-10 animate-in fade-in duration-700">
      
      {/* --- PAGE HEADER --- */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-100 pb-10">
        <div className="space-y-2">
            <div className="flex items-center gap-2 text-blue-600">
                <Warehouse size={20} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Internal Logistics</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Picking Queue</h1>
            <p className="text-sm text-slate-500 font-medium">
                Warehouse directives for <span className="text-slate-800 font-semibold">{profile.business_name}</span>.
            </p>
        </div>

        <div className="bg-white px-5 py-3 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
            <ListChecks size={18} className="text-blue-500" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Inventory Sync Active</span>
        </div>
      </header>

      {/* --- QUEUE LIST --- */}
      <div className="max-w-5xl mx-auto space-y-6">
        
        {(!manifests || manifests.length === 0) ? (
            <div className="py-40 text-center bg-white rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col items-center justify-center space-y-4">
                <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                    <ClipboardList size={32} />
                </div>
                <div className="space-y-1">
                    <h3 className="text-lg font-bold text-slate-900 uppercase tracking-tight">Queue Empty</h3>
                    <p className="text-sm font-medium text-slate-400 max-w-sm mx-auto uppercase tracking-widest">
                        There are currently no active manifests awaiting warehouse picking.
                    </p>
                </div>
            </div>
        ) : (
            <div className="grid grid-cols-1 gap-4">
                {manifests.map((m: any) => (
                    <Card key={m.id} className="group border border-slate-100 shadow-sm hover:shadow-md transition-all bg-white rounded-2xl overflow-hidden">
                        <CardContent className="p-0">
                            <div className="flex flex-col sm:flex-row items-center p-6 gap-6">
                                
                                {/* Status Icon */}
                                <div className="flex flex-col items-center justify-center w-16 h-16 rounded-xl bg-slate-50 group-hover:bg-blue-50 transition-colors border border-slate-100/50 text-slate-400 group-hover:text-blue-500">
                                    <Package size={24} />
                                </div>

                                {/* Manifest Info */}
                                <div className="flex-1 space-y-1 text-center sm:text-left">
                                    <div className="flex items-center justify-center sm:justify-start gap-3">
                                        <h4 className="text-md font-bold text-slate-900 uppercase">
                                            Ref: {m.shipment_ref || 'UNNAMED'}
                                        </h4>
                                        <Badge variant="secondary" className="bg-slate-100 text-slate-600 font-bold text-[8px] uppercase px-2 rounded-md">
                                            {m.shipment_type}
                                        </Badge>
                                    </div>
                                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                                        <span className="flex items-center gap-1.5"><Clock size={12} /> Issued: {new Date(m.created_at).toLocaleDateString()}</span>
                                        <span>•</span>
                                        <span className="text-emerald-600 font-bold uppercase tracking-widest">{m.status}</span>
                                    </div>
                                </div>

                                {/* Action Button */}
                                <Button className="h-12 px-8 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-[10px] uppercase tracking-wider shadow-sm transition-all active:scale-95" asChild>
                                    <Link href={`/${locale}/distribution/picking/${m.id}`}>
                                        Start Picking <ChevronRight size={14} className="ml-2" />
                                    </Link>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        )}
      </div>

      {/* --- FOOTER --- */}
      <footer className="pt-20 pb-10 flex flex-col items-center gap-4 opacity-30">
        <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-slate-400">
            Internal Distribution & Warehouse Management System
        </p>
      </footer>
    </main>
  );
}