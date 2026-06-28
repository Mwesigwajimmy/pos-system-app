/**
 * --- DELIVERY VERIFICATION PAGE ---
 * PATH: /distribution/handshake/[id]
 * Use: Final confirmation and seal verification at destination
 */

import DeliveryHandshake from "@/components/distribution/DeliveryHandshake";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { MapPin, QrCode } from "lucide-react";

export default async function HandshakePage({ 
    params: { locale, id } 
}: { 
    params: { locale: string; id: string } 
}) {
  
  // 1. Authentication Check
  const supabase = await createClient(await cookies());
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect(`/${locale}/auth/login`);

  const { data: profile } = await supabase
    .from("profiles")
    .select("business_id")
    .eq("id", user.id)
    .single();

  if (!profile?.business_id) redirect(`/${locale}/dashboard`);

  return (
    <main className="flex-1 bg-slate-50/20 min-h-screen flex flex-col items-center justify-center p-6 animate-in fade-in duration-500">
      
      {/* SECTION HEADER */}
      <div className="mb-10 text-center space-y-3">
        <div className="flex items-center justify-center gap-3 text-blue-600 mb-6 opacity-80">
            <div className="p-3 bg-white rounded-xl shadow-sm border border-slate-100">
                <MapPin size={22} />
            </div>
            <div className="h-px w-10 bg-slate-200" />
            <div className="p-3 bg-white rounded-xl shadow-sm border border-slate-100">
                <QrCode size={22} />
            </div>
        </div>
        
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Confirm Delivery
        </h2>
        <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest">
            Verifying Shipment ID: #{id}
        </p>
      </div>

      {/* 
          THE VERIFICATION COMPONENT 
          Handles GPS validation and security seal confirmation
      */}
      <div className="w-full max-w-md shadow-sm">
        <DeliveryHandshake loadId={id} businessId={profile.business_id} />
      </div>
      
      {/* SYSTEM FOOTER */}
      <div className="mt-12 flex flex-col items-center gap-2 opacity-30">
        <div className="h-px w-24 bg-slate-300" />
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">
            Secure Logistics Verification System
        </p>
      </div>
    </main>
  );
}