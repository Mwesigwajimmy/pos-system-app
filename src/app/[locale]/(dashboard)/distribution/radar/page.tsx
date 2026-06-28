/**
 * --- LOGISTICS TRACKING PAGE ---
 * PATH: /distribution/radar
 * Use: Comprehensive tracking and reporting for all shipments
 */

import LogisticsCommandCenter from "@/components/distribution/LogisticsCommandCenter";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export default async function LogisticsRadarPage({ params: { locale } }: { params: { locale: string } }) {
  
  // 1. Authentication Check
  const supabase = await createClient(await cookies());
  
  // 2. Security Guard
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    redirect(`/${locale}/auth/login`);
  }

  // 3. Main Layout
  return (
    <main className="flex-1 bg-slate-50/20 min-h-screen">
      <div className="max-w-[1600px] mx-auto p-4 md:p-8 lg:p-10">
        {/* 
            The main header has been removed from this page file 
            to prevent duplicates, as the LogisticsCommandCenter 
            component manages its own professional title and tools.
        */}
        <div className="animate-in fade-in duration-700">
            <LogisticsCommandCenter />
        </div>
      </div>
    </main>
  );
}