/**
 * --- DELIVERY VERIFICATION QUEUE ---
 * PATH: /distribution/handshake
 * Use: Managing and verifying in-transit shipments
 */

import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { 
    Truck, 
    ScanLine, 
    Clock, 
    ChevronRight, 
    ShieldCheck, 
    Package,
    Navigation
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function HandshakeQueuePage({ params: { locale } }: { params: { locale: string } }) {
  
  // 1. Authentication and Profile Verification
  const supabase = await createClient(await cookies());
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect(`/${locale}/auth/login`);

  const { data: profile } = await supabase
    .from("profiles")
    .select("business_id, business_name")
    .eq("id", user.id)
    .single();

  if (!profile?.business_id) redirect(`/${locale}/dashboard`);

  // 2. Fetch Active Shipments (In-Transit Queue)
  const { data: activeLoads } = await supabase
    .from('van_loads')
    .select(`
        id,
        status,
        load_date,
        manifest_id,
        logistics_manifests (
            seal_no,
            shipment_ref,
            shipment_type
        )
    `)
    .eq('business_id', profile.business_id)
    .eq('status', 'in-transit')
    .order('load_date', { ascending: false });

  return (
    <main className="min-h-screen bg-slate-50/20 p-6 lg:p-10 space-y-10 animate-in fade-in duration-500">
      
      {/* --- PAGE HEADER --- */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-100 pb-10">
        <div className="space-y-2">
            <div className="flex items-center gap-2 text-blue-600">
                <ScanLine size={20} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Field Operations</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Delivery Verification</h1>
            <p className="text-sm text-slate-500 font-medium max-w-lg">
                View shipments currently in transit for <span className="text-slate-800 font-semibold">{profile.business_name}</span>. 
                Select a shipment to confirm delivery.
            </p>
        </div>

        <div className="bg-white px-5 py-3 rounded-xl border border-slate-200/60 shadow-sm flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">System Synchronized</span>
        </div>
      </header>

      {/* --- SHIPMENT LIST --- */}
      <div className="max-w-4xl mx-auto space-y-4">
        {(!activeLoads || activeLoads.length === 0) ? (
            <div className="py-40 text-center space-y-4 opacity-40">
                <Navigation size={64} strokeWidth={1.5} className="mx-auto text-slate-300" />
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500">No shipments awaiting verification</p>
            </div>
        ) : (
            activeLoads.map((load: any) => (
                <Card key={load.id} className="group border border-slate-100 shadow-sm hover:shadow-md transition-all bg-white rounded-2xl overflow-hidden">
                    <CardContent className="p-0">
                        <div className="flex flex-col sm:flex-row items-center p-6 gap-6">
                            
                            {/* STATUS ICON */}
                            <div className="flex flex-col items-center justify-center w-16 h-16 rounded-xl bg-slate-50 group-hover:bg-blue-50 transition-colors border border-slate-100/50">
                                <Truck className="text-slate-400 group-hover:text-blue-500 transition-colors" size={24} />
                            </div>

                            {/* SHIPMENT INFO */}
                            <div className="flex-1 space-y-1 text-center sm:text-left">
                                <div className="flex items-center justify-center sm:justify-start gap-3">
                                    <h4 className="text-md font-bold text-slate-900 uppercase">
                                        Seal: {load.logistics_manifests?.seal_no || 'Pending'}
                                    </h4>
                                    <Badge variant="secondary" className="bg-blue-50 text-blue-700 font-bold text-[8px] uppercase border-none px-2 rounded-md">
                                        {load.status}
                                    </Badge>
                                </div>
                                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                                    <span className="flex items-center gap-1.5">
                                        <Clock size={12} /> Dispatch: {new Date(load.load_date).toLocaleDateString()}
                                    </span>
                                    <span>•</span>
                                    <span className="flex items-center gap-1.5">
                                        <Package size={12} /> Ref: {load.logistics_manifests?.shipment_ref || load.id}
                                    </span>
                                </div>
                            </div>

                            {/* ACTION BUTTON */}
                            <Button className="h-12 px-6 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-[10px] uppercase tracking-wider shadow-sm transition-all active:scale-95" asChild>
                                <Link href={`/${locale}/distribution/handshake/${load.id}`}>
                                    Verify Delivery <ChevronRight size={14} className="ml-2" />
                                </Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            ))
        )}
      </div>

      {/* --- FOOTER SECTION --- */}
      <footer className="pt-20 pb-10 flex flex-col items-center gap-4 opacity-30">
        <div className="flex items-center gap-4">
            <div className="h-px w-16 bg-slate-300" />
            <ShieldCheck size={18} className="text-slate-400" />
            <div className="h-px w-16 bg-slate-300" />
        </div>
        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
            Secure Logistics Verification Protocol
        </p>
      </footer>
    </main>
  );
}