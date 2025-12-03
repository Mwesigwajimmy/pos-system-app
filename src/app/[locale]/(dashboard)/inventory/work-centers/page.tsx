import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

// ✅ CORRECT PATH: Imports the file 'WorkCenterSchedule.tsx'
import WorkCenterSchedule from "@/components/inventory/WorkCenterSchedule"; 

export default async function WorkCentersPage({ params }: { params: { locale: string } }) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${params.locale}/login`);

  const { data: profile } = await supabase.from("user_profiles").select("active_entity_slug").eq("user_id", user.id).single();
  const entitySlug = profile?.active_entity_slug;
  
  if (!entitySlug) redirect(`/${params.locale}/select-entity`);

  const { data: scheduleData } = await supabase
    .from("work_center_schedule")
    .select("*")
    .eq("entity", entitySlug) 
    .order("start_time", { ascending: true });

  // Map DB data to the shape your component expects
  const schedule = (scheduleData || []).map((s: any) => ({
    id: s.id,
    workCenter: s.work_center_name,
    session: s.session_name,
    product: s.product_name,
    scheduledStart: s.start_time,
    scheduledEnd: s.end_time,
    status: s.status,
    machineOperator: s.operator_name || "Unassigned",
    entity: s.entity,
    country: "UG", 
    tenantId: "system"
  }));

  // ✅ CALLING THE COMPONENT
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <h2 className="text-3xl font-bold tracking-tight">Work Center Schedule</h2>
      <WorkCenterSchedule initialData={schedule} />
    </div>
  );
}