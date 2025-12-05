import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers"; // <--- 1. Add this import
import DriverAssignmentsTable from "@/components/distribution/DriverAssignmentsTable";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

export default async function AssignmentsPage({
  params: { locale }
}: {
  params: { locale: string }
}) {
  // 2. Get cookies and pass them to createClient
  const cookieStore = await cookies(); 
  const supabase = await createClient(cookieStore); 

  // 3. Check Auth
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect(`/${locale}/auth/login`);
  }

  // 4. Get Business Context (Enterprise Multi-tenancy)
  const { data: profile } = await supabase
    .from('profiles')
    .select('business_id')
    .eq('id', user.id)
    .single();

  if (!profile?.business_id) {
    return (
      <div className="p-10 flex flex-col items-center justify-center text-center">
         <h2 className="text-xl font-bold text-red-600">Account Configuration Error</h2>
         <p className="text-muted-foreground">Your user account is not linked to a valid Business ID.</p>
      </div>
    );
  }

  // 5. Fetch Real Data via RPC
  const { data: assignments, error } = await supabase
    .rpc('get_business_driver_assignments', {
      p_business_id: profile.business_id
    });

  if (error) {
    console.error("Fetch Error:", error);
    return <div className="p-10 text-red-500">System Error: Failed to load distribution data.</div>;
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Distribution & Logistics</h2>
      </div>
      
      <Suspense fallback={
        <div className="flex items-center justify-center h-64 border rounded-lg bg-muted/10">
            <Loader2 className="w-8 h-8 animate-spin text-primary"/>
        </div>
      }>
        <DriverAssignmentsTable initialData={assignments || []} />
      </Suspense>
    </div>
  );
}