import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import WorkCenterSchedule, { WorkCenterScheduleEntry } from "@/components/inventory/WorkCenterSchedule";

export default async function WorkCentersPage() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();

  let entitySlug = null;
  if (user) {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("active_entity_slug")
      .eq("user_id", user.id)
      .single();
    entitySlug = profile?.active_entity_slug;
  }

  let schedule: WorkCenterScheduleEntry[] = [];

  if (entitySlug) {
    const [entityResult, scheduleResult] = await Promise.all([
      supabase
        .from("entities")
        .select("id, country, locale")
        .eq("slug", entitySlug)
        .single(),
      supabase
        .from("work_center_schedule")
        .select("*")
        .eq("entity", entitySlug)
        .order("start_time", { ascending: true })
    ]);

    const entityData = entityResult.data;
    const scheduleData = scheduleResult.data;
    
    // Dynamic Country Logic: Prefer direct country column, fallback to locale suffix
    const dynamicCountry = entityData?.country || entityData?.locale?.split('-')[1] || "UG";
    const dynamicTenantId = entityData?.id || "";

    if (scheduleData) {
      schedule = scheduleData.map((s: any) => ({
        id: s.id,
        workCenter: s.work_center_name || "Unknown Center",
        session: s.session_name || "Unassigned Session",
        product: s.product_name || "General Task",
        scheduledStart: s.start_time || new Date().toISOString(),
        scheduledEnd: s.end_time || new Date().toISOString(),
        status: s.status || "planned",
        machineOperator: s.operator_name || "Unassigned",
        entity: s.entity,
        country: dynamicCountry,
        tenantId: dynamicTenantId
      }));
    }
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <h2 className="text-3xl font-bold tracking-tight">Work Center Schedule</h2>
      <WorkCenterSchedule initialData={schedule} />
    </div>
  );
}