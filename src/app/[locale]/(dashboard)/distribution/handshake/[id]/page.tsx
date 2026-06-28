/**
 * --- BBU1 SOVEREIGN: DELIVERY HANDSHAKE ROUTE ---
 * PATH: /distribution/handshake/[id]
 * JURISDICTION: Final Destination Verification
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
  
  // 1. Enterprise Security Check
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
    <div className="flex-1 bg-slate-50 min-h-screen flex flex-col items-center justify-center p-6">
      <div className="mb-8 text-center space-y-2">
        <div className="flex items-center justify-center gap-2 text-blue-600 mb-4">
            <MapPin size={24} />
            <div className="h-px w-8 bg-blue-200" />
            <QrCode size={24} />
        </div>
        <h2 className="text-xl font-black uppercase tracking-tight text-slate-900">Destination Arrival</h2>
        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Verifying Load Identity: #{id}</p>
      </div>

      {/* THE HANDSHAKE COMPONENT: Validates GPS and Breaks the Digital Seal */}
      <DeliveryHandshake loadId={id} businessId={profile.business_id} />
      
      <p className="mt-10 text-[9px] font-black uppercase tracking-[0.5em] text-slate-300">
        BBU1 Sovereign Neural Logistics Shield
      </p>
    </div>
  );
}