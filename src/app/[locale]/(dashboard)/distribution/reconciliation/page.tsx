/**
 * --- RETURNS RECONCILIATION PAGE ---
 * Use: Professional audit page for restocking returned inventory.
 * Path: /distribution/reconciliation
 */

import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import ReturnsManager from "@/components/distribution/ReturnsManager";

export default async function ReconciliationPage({ params: { locale } }: { params: { locale: string } }) {
  
  // 1. Authentication and Security Handshake
  const supabase = await createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) redirect(`/${locale}/auth/login`);

  // 2. Resolve Business Identity
  const { data: profile } = await supabase
    .from('profiles')
    .select('business_id')
    .eq('id', user.id)
    .single();

  if (!profile?.business_id) {
      return (
          <div className="p-10 text-slate-500 font-medium">
              Error: Business identity not found.
          </div>
      );
  }

  return (
    /**
     * CLEAN CORPORATE LAYOUT
     * - This page is dedicated to the physical restocking logic.
     * - No duplicate headings.
     * - Standard professional dashboard styling.
     */
    <main className="flex-1 bg-slate-50/20 min-h-screen p-6 md:p-10 animate-in fade-in duration-700">
      <div className="max-w-[1500px] mx-auto">
        
        {/* 
            ReturnsManager is the deeply logic-heavy component we built 
            that handles the SQL stock movements and restocking.
        */}
        <ReturnsManager businessId={profile.business_id} />
        
      </div>
    </main>
  );
}