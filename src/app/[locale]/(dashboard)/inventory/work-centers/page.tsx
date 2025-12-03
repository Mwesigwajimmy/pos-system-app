import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
// NOTE: Your file in screenshot 3 is named 'WorkCentreSchedule.tsx' (British 're')
import WorkCenterSchedule from "@/components/inventory/WorkCentreSchedule"; 

export default async function WorkCentersPage({ params }: { params: { locale: string } }) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // 1. Auth & Entity Context
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${params.locale}/login`);

  const { data: profile } = await supabase.from("user_profiles").select("active_entity_slug").eq("user_id", user.id).single();
  if (!profile?.active_entity_slug) redirect(`/${params.locale}/select-entity`);
  const entitySlug = profile.active_entity_slug;

  // 2. Fetch Data
  const { data: scheduleData } = await supabase
    .from("work_center_schedule")
    .select("*")
    .eq("entity", entitySlug) 
    .order("start_time", { ascending: true });

  const schedule = (scheduleData || []).map((s: any) => ({
    id: s.id,
    workCenter: s.work_center_name,
    session: s.session_name,
    product: s.product_name,
    scheduledStart: s.start_time,
    scheduledEnd: s.end_time,
    status: s.status as any,
    machineOperator: s.operator_name || "Unassigned",
    entity: s.entity,
    country: "UG", 
    tenantId: "system"
  }));

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <h2 className="text-3xl font-bold tracking-tight">Work Center Schedule</h2>
      <WorkCenterSchedule initialData={schedule} />
    </div>
  );
}