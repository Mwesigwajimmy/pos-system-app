import DistributionDashboard from "@/components/distribution/DistributionDashboard";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
// ✅ DEEP ADDITIONS
import Link from "next/link";
import { Radar } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function DistributionDashboardPage({ params: { locale } }: { params: { locale: string } }) {
  // Enterprise Grade: Server-Side Auth Check before rendering
  const supabase = await createClient(await cookies());
  
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect(`/${locale}/auth/login`);
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Distribution Overview</h2>

        {/* ✅ SOVEREIGN WELD: Direct access to the Deep Tracking Radar */}
        <Button variant="outline" className="rounded-xl font-bold uppercase text-[10px] tracking-widest gap-2 shadow-sm transition-all active:scale-95" asChild>
            <Link href={`/${locale}/distribution/radar`}>
               <Radar size={14} className="text-blue-600" /> Open Fleet Radar
            </Link>
        </Button>
      </div>
      
      <DistributionDashboard />
    </div>
  );
}