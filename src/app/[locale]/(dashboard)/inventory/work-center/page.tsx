import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import WorkCenterSchedule, { WorkCenterScheduleEntry } from "@/components/inventory/WorkCenterSchedule";

// Enterprise Grade: Explicitly define the logic
export default async function WorkCentersPage() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // 1. Secure Authentication
  const { data: { user } } = await supabase.auth.getUser();

  // 2. Multi-tenant Context: Fetch active entity
  let entitySlug = null;
  if (user) {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("active_entity_slug")
      .eq("user_id", user.id)
      .single();
    entitySlug = profile?.active_entity_slug;
  }

  // 3. Initialize as a typed array (FIXES THE BUILD ERROR)
  // Even if no data exists, this is now a valid empty array of the correct type.
  let schedule: WorkCenterScheduleEntry[] = [];

  // 4. Fetch Data only if we have a valid entity context
  if (entitySlug) {
    const { data: scheduleData } = await supabase
      .from("work_center_schedule")
      .select("*")
      .eq("entity", entitySlug) 
      .order("start_time", { ascending: true });

    // 5. Professional Mapping: robust handling of null values
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
        country: "UG", // Dynamic country logic can be added here later
        tenantId: "system"
      }));
    }
  }

  // 6. Return the UI (Passes empty array if no data, preventing crashes)
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <h2 className="text-3xl font-bold tracking-tight">Work Center Schedule</h2>
      <WorkCenterSchedule initialData={schedule} />
    </div>
  );
}