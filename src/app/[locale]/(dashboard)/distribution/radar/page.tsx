/**
 * --- BBU1 SOVEREIGN: LOGISTICS RADAR ROUTE ---
 * PATH: /distribution/radar
 * JURISDICTION: Professional Deep Tracking Ledger
 */

import LogisticsCommandCenter from "@/components/distribution/LogisticsCommandCenter";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export default async function LogisticsRadarPage({ params: { locale } }: { params: { locale: string } }) {
  
  // 1. Enterprise Security Handshake
  const supabase = await createClient(await cookies());
  
  // 2. Auth Guard
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    redirect(`/${locale}/auth/login`);
  }

  // 3. Render the Logistics Command Center
  return (
    <div className="flex-1 bg-white">
      {/* This renders the OMEGA-ULTIMATUM logic you sent me */}
      <LogisticsCommandCenter />
    </div>
  );
}