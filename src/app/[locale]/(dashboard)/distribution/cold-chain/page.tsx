import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers"; // <--- Add this import
import ColdChainMonitor from "@/components/distribution/ColdChainMonitor";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

export default async function ColdChainPage({
  params: { locale }
}: {
  params: { locale: string }
}) {
  // Pass cookies to createClient
  const supabase = await createClient(await cookies());

  // 1. Auth Check
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect(`/${locale}/auth/login`);
  }

  // 2. Business Context Check
  const { data: profile } = await supabase
    .from('profiles')
    .select('business_id')
    .eq('id', user.id)
    .single();

  if (!profile?.business_id) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-center p-4">
         <h2 className="text-xl font-bold text-red-600">Access Denied</h2>
         <p className="text-muted-foreground mt-2">No valid Business ID associated with this account.</p>
      </div>
    );
  }

  // 3. Fetch Data via RPC
  const { data: logs, error } = await supabase
    .rpc('get_cold_chain_logs', {
      p_business_id: profile.business_id
    });

  if (error) {
    console.error("Cold Chain Fetch Error:", error);
    return <div className="p-8 text-red-500">System Error: Unable to load cold chain data.</div>;
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between space-y-2">
        <div>
            <h2 className="text-3xl font-bold tracking-tight">Cold Chain Logistics</h2>
            <p className="text-muted-foreground">Monitor temperature sensitive deliveries across your fleet.</p>
        </div>
      </div>
      
      <Suspense fallback={
        <div className="flex items-center justify-center h-[400px] border rounded-lg bg-muted/10">
            <Loader2 className="w-10 h-10 animate-spin text-blue-500"/>
        </div>
      }>
        <ColdChainMonitor initialData={logs || []} />
      </Suspense>
    </div>
  );
}