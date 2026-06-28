/**
 * --- BBU1 SOVEREIGN: DISPATCH HUB ROUTE ---
 * PATH: /distribution/dispatch
 * JURISDICTION: Professional Outbound Sealing
 */

import DispatchWorkbench from "@/components/distribution/DispatchWorkbench";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { ShieldCheck, ArrowLeft, Navigation } from "lucide-react";
import Link from "next/link";

export default async function DispatchPage({ params: { locale } }: { params: { locale: string } }) {
  
  // 1. Enterprise Identity Handshake
  const supabase = await createClient(await cookies());
  
  // 2. Security Guard
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect(`/${locale}/auth/login`);

  const { data: profile } = await supabase
    .from("profiles")
    .select("business_id, business_name")
    .eq("id", user.id)
    .single();

  if (!profile?.business_id) redirect(`/${locale}/dashboard`);

  return (
    <div className="flex-1 bg-white min-h-screen">
      {/* PROFESSIONAL HEADER FOR DISPATCH SECTOR */}
      <div className="max-w-[1400px] mx-auto p-8 border-b border-slate-50 flex items-center justify-between">
        <div className="space-y-1">
            <div className="flex items-center gap-2 text-blue-600">
                <Navigation size={16} strokeWidth={2.5} />
                <span className="text-[10px] font-black uppercase tracking-[0.3em]">Logistics Dispatch Protocol</span>
            </div>
            <h1 className="text-3xl font-black tracking-tighter text-slate-900">Cargo Dispatch & Sealing</h1>
        </div>

        <Link href={`/${locale}/distribution`} className="flex items-center gap-2 text-slate-400 hover:text-slate-900 transition-colors group">
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Back to Overview</span>
        </Link>
      </div>

      <div className="max-w-[1400px] mx-auto p-8">
         {/* THE MASTER COMPONENT: Handles Scanning, Multi-Currency, and PDF Generation */}
         <DispatchWorkbench businessId={profile.business_id} />
      </div>
    </div>
  );
}