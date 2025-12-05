import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers"; // <--- Add this import
import GeofencingDashboard from "@/components/distribution/GeofencingDashboard";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

export default async function GeofencingPage({ params: { locale } }: { params: { locale: string } }) {
  // Pass cookies to createClient
  const supabase = await createClient(await cookies());

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);

  const { data: profile } = await supabase.from('profiles').select('business_id').eq('id', user.id).single();
  if (!profile?.business_id) return <div>No Business ID.</div>;

  const { data: fences } = await supabase.rpc('get_geofences', { p_business_id: profile.business_id });

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 max-w-[1600px] mx-auto">
      <h2 className="text-3xl font-bold tracking-tight">Geofencing & Boundaries</h2>
      <Suspense fallback={<Loader2 className="w-8 h-8 animate-spin"/>}>
        <GeofencingDashboard initialFences={fences || []} />
      </Suspense>
    </div>
  );
}