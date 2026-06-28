/**
 * --- LIVE TRANSIT TRACKING PAGE ---
 * Use: Real-time satellite visualization of active fleet movement.
 * Path: /distribution/tracking/[id]
 */

import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import TransitRadar from "@/components/distribution/TransitRadar";
import { Truck, MapPin } from "lucide-react";

export default async function TrackingPage({ 
    params: { locale, id } 
}: { 
    params: { locale: string; id: string } 
}) {
  
  // 1. Enterprise Identity & Security Check
  const supabase = await createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) redirect(`/${locale}/auth/login`);

  // 2. Resolve Business Context
  const { data: profile } = await supabase
    .from('profiles')
    .select('business_id')
    .eq('id', user.id)
    .single();

  if (!profile?.business_id) return null;

  return (
    /**
     * PROFESSIONAL WHITE DASHBOARD LAYOUT
     * - Background: Subtle slate tint to ensure the map card is the focus.
     * - No duplicate headings (TransitRadar manages the map title).
     * - Clean, upright typography.
     */
    <main className="flex-1 bg-slate-50/20 min-h-screen p-6 md:p-10 animate-in fade-in duration-1000">
      <div className="max-w-[1600px] mx-auto space-y-8">
        
        {/* TOP STATUS BAR (Optional Breadcrumb-style info) */}
        <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center text-blue-600 shadow-sm border border-slate-100">
                    <Truck size={20} />
                </div>
                <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Fleet Intelligence</p>
                    <h2 className="text-sm font-bold text-slate-800 uppercase mt-1">Shipment Reference: #{id}</h2>
                </div>
            </div>
            
            <div className="hidden md:flex items-center gap-2 px-4 py-1.5 bg-emerald-50 rounded-full border border-emerald-100">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Live Telemetry Link Active</span>
            </div>
        </div>

        {/* 
            THE MASTER RADAR COMPONENT
            This is the Mapbox logic that draws the 3D map, the truck icon, 
            and the real-time breadcrumb route.
        */}
        <div className="rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden bg-white">
            <TransitRadar loadId={id} />
        </div>

        {/* FOOTER METADATA */}
        <div className="flex justify-center pt-4 opacity-30">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.4em] flex items-center gap-2">
                <MapPin size={12} /> Global Positioning Registry Node
            </p>
        </div>

      </div>
    </main>
  );
}