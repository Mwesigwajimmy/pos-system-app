import DistributionDashboard from "@/components/distribution/DistributionDashboard";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers"; // <--- 1. Add this import

export default async function DistributionDashboardPage({ params: { locale } }: { params: { locale: string } }) {
  // Enterprise Grade: Server-Side Auth Check before rendering
  
  // 2. Pass cookies into createClient
  const supabase = await createClient(await cookies());
  
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect(`/${locale}/auth/login`);
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Distribution Overview</h2>
      </div>
      <DistributionDashboard />
    </div>
  );
}