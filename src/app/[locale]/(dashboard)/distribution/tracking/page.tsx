/**
 * --- FLEET TRACKING INDEX ---
 * Use: Corporate dashboard listing all active shipments currently in transit.
 * Path: /distribution/tracking
 */

import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { 
    Truck, 
    Search, 
    Navigation, 
    ChevronRight, 
    Activity, 
    Clock, 
    MapPin,
    Package
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function TrackingIndexPage({ params: { locale } }: { params: { locale: string } }) {
  
  // 1. Authentication & Identity Handshake
  const supabase = await createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);

  const { data: profile } = await supabase
    .from("profiles")
    .select("business_id, business_name")
    .eq("id", user.id)
    .single();

  if (!profile?.business_id) redirect(`/${locale}/dashboard`);

  // 2. Fetch Active Shipments (Only those currently moving)
  const { data: activeLoads } = await supabase
    .from('van_loads')
    .select(`
        id,
        status,
        load_date,
        logistics_manifests (
            seal_no,
            shipment_ref
        )
    `)
    .eq('business_id', profile.business_id)
    .eq('status', 'in-transit')
    .order('load_date', { ascending: false });

  return (
    <main className="min-h-screen bg-slate-50/20 p-6 lg:p-10 space-y-10 animate-in fade-in duration-700">
      
      {/* --- PAGE HEADER --- */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-100 pb-10">
        <div className="space-y-2">
            <div className="flex items-center gap-2 text-blue-600">
                <Navigation size={20} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Fleet Intelligence</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Active Shipments</h1>
            <p className="text-sm text-slate-500 font-medium">
                Real-time monitoring for <span className="text-slate-800 font-semibold">{profile.business_name}</span>.
            </p>
        </div>

        <div className="flex items-center gap-4">
            <div className="bg-white px-5 py-3 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Live Satellite Feed Active</span>
            </div>
        </div>
      </header>

      {/* --- SHIPMENT SELECTION QUEUE --- */}
      <div className="max-w-5xl mx-auto space-y-6">
        
        {(!activeLoads || activeLoads.length === 0) ? (
            /* Empty State: Clean Corporate Design */
            <div className="py-40 text-center bg-white rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col items-center justify-center space-y-4">
                <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                    <Truck size={32} />
                </div>
                <div className="space-y-1">
                    <h3 className="text-lg font-bold text-slate-900 uppercase tracking-tight">No Active Transit Detected</h3>
                    <p className="text-sm font-medium text-slate-400 max-w-sm mx-auto uppercase tracking-widest leading-relaxed">
                        There are currently no shipments in transit. Active loads will appear here for live tracking.
                    </p>
                </div>
            </div>
        ) : (
            /* Active Loads List */
            <div className="grid grid-cols-1 gap-4">
                {activeLoads.map((load: any) => (
                    <Card key={load.id} className="group border border-slate-100 shadow-sm hover:shadow-md transition-all bg-white rounded-2xl overflow-hidden">
                        <CardContent className="p-0">
                            <div className="flex flex-col sm:flex-row items-center p-6 gap-6">
                                
                                {/* Status Icon */}
                                <div className="flex flex-col items-center justify-center w-16 h-16 rounded-xl bg-slate-50 group-hover:bg-blue-50 transition-colors border border-slate-100/50 text-slate-400 group-hover:text-blue-500">
                                    <Activity size={24} />
                                </div>

                                {/* Information Block */}
                                <div className="flex-1 space-y-1 text-center sm:text-left">
                                    <div className="flex items-center justify-center sm:justify-start gap-3">
                                        <h4 className="text-md font-bold text-slate-900 uppercase">
                                            Seal: {load.logistics_manifests?.seal_no || 'Pending'}
                                        </h4>
                                        <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 font-bold text-[8px] uppercase border-none px-2 rounded-md">
                                            {load.status}
                                        </Badge>
                                    </div>
                                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                                        <span className="flex items-center gap-1.5"><Clock size={12} /> Dispatched: {new Date(load.load_date).toLocaleDateString()}</span>
                                        <span>•</span>
                                        <span className="flex items-center gap-1.5"><Package size={12} /> Ref: {load.logistics_manifests?.shipment_ref || `#${load.id}`}</span>
                                    </div>
                                </div>

                                {/* Action Button */}
                                <Button className="h-12 px-8 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-[10px] uppercase tracking-wider shadow-sm transition-all active:scale-95" asChild>
                                    <Link href={`/${locale}/distribution/tracking/${load.id}`}>
                                        Open Live Map <ChevronRight size={14} className="ml-2" />
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
        <div className="flex items-center gap-4">
            <div className="h-px w-16 bg-slate-300" />
            <MapPin size={18} className="text-slate-400" />
            <div className="h-px w-16 bg-slate-300" />
        </div>
        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
            Secure Fleet Asset Management System
        </p>
      </footer>
    </main>
  );
}