/**
 * --- BBU1 SOVEREIGN: HANDSHAKE QUEUE ---
 * VERSION: v4.8 OMEGA (THE LOGISTICS SENTINEL)
 * PATH: /distribution/handshake
 * JURISDICTION: Field Operations / In-Transit Queue
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
    MapPin, 
    Search,
    Package,
    Navigation
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function HandshakeQueuePage({ params: { locale } }: { params: { locale: string } }) {
  
  // 1. Enterprise Identity Handshake
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
  // Logic: We look for van_loads that are 'in-transit' and link their manifest details
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
    <main className="min-h-screen bg-slate-50/50 p-6 lg:p-10 space-y-10 animate-in fade-in duration-700">
      
      {/* --- SECTOR HEADER --- */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-200 pb-10">
        <div className="space-y-4">
            <div className="flex items-center gap-3 text-blue-600">
                <div className="bg-slate-900 p-2.5 rounded-2xl text-white shadow-lg">
                    <ScanLine size={22} strokeWidth={2.5} />
                </div>
                <span className="text-[11px] font-black uppercase tracking-[0.4em]">Field Operations</span>
            </div>
            <h1 className="text-5xl font-black tracking-tighter text-slate-900 uppercase">Handshake Queue</h1>
            <p className="text-slate-500 font-medium max-w-lg">
                Authorized verification queue for <span className="text-slate-900 font-bold">{profile.business_name}</span>. 
                Scan cargo to finalize legal delivery.
            </p>
        </div>

        <div className="bg-white px-6 py-4 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Terminal Synchronized</span>
        </div>
      </header>

      {/* --- QUEUE SECTOR --- */}
      <div className="max-w-4xl mx-auto space-y-4">
        {(!activeLoads || activeLoads.length === 0) ? (
            <div className="py-40 text-center space-y-6 opacity-20">
                <Navigation size={80} strokeWidth={1} className="mx-auto" />
                <p className="text-[11px] font-black uppercase tracking-[0.5em]">No Shipments Awaiting Handshake</p>
            </div>
        ) : (
            activeLoads.map((load: any) => (
                <Card key={load.id} className="group border-none shadow-sm hover:shadow-xl transition-all bg-white rounded-[2.5rem] overflow-hidden">
                    <CardContent className="p-0">
                        <div className="flex flex-col sm:flex-row items-center p-8 gap-8">
                            
                            {/* SHIPMENT ICON */}
                            <div className="flex flex-col items-center justify-center w-20 h-20 rounded-[1.8rem] bg-slate-50 group-hover:bg-blue-50 transition-colors">
                                <Truck className="text-slate-400 group-hover:text-blue-500 transition-colors" />
                            </div>

                            {/* CORE IDENTITY */}
                            <div className="flex-1 space-y-1 text-center sm:text-left">
                                <div className="flex items-center justify-center sm:justify-start gap-3">
                                    <h4 className="text-lg font-black text-slate-900 uppercase tracking-tighter">
                                        Seal: {load.logistics_manifests?.seal_no || 'NOT_SET'}
                                    </h4>
                                    <Badge className="bg-blue-50 text-blue-600 font-black text-[9px] uppercase border-none px-3">
                                        {load.status}
                                    </Badge>
                                </div>
                                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                    <span className="flex items-center gap-1.5"><Clock size={12} /> Loaded: {new Date(load.load_date).toLocaleDateString()}</span>
                                    <span>•</span>
                                    <span className="flex items-center gap-1.5"><Package size={12} /> Ref: {load.logistics_manifests?.shipment_ref || load.id}</span>
                                </div>
                            </div>

                            {/* ACTION LINK */}
                            <Button className="h-14 px-8 rounded-2xl bg-slate-950 text-white font-black text-[10px] uppercase tracking-widest group-hover:bg-blue-600 transition-all shadow-lg active:scale-95" asChild>
                                <Link href={`/${locale}/distribution/handshake/${load.id}`}>
                                    Begin Handshake <ChevronRight size={16} className="ml-2" />
                                </Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            ))
        )}
      </div>

      {/* --- SYSTEM FOOTER --- */}
      <footer className="pt-20 pb-10 flex flex-col items-center gap-6 opacity-40">
        <div className="flex items-center gap-4">
            <div className="h-px w-20 bg-slate-300" />
            <ShieldCheck size={20} className="text-slate-500" />
            <div className="h-px w-20 bg-slate-300" />
        </div>
        <p className="text-[9px] font-black uppercase tracking-[0.5em] text-slate-400">
            Sovereign Handshake Protocol • Unified Node Logic
        </p>
      </footer>
    </main>
  );
}