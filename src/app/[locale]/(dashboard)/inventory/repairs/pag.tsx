import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import RepairTicketManager from "@/components/inventory/RepairTicketsManager";

export default async function RepairTicketsPage({ params }: { params: { locale: string } }) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${params.locale}/login`);

  const { data: profile } = await supabase.from("user_profiles").select("active_entity_slug").eq("user_id", user.id).single();
  const entitySlug = profile?.active_entity_slug || "BBU1"; // Fallback for safety

  const { data: repairsData } = await supabase
    .from("repair_tickets")
    .select(`*, assets (name, location, country, entity)`)
    .eq("assets.entity", entitySlug); // Join filter

  const repairs = (repairsData || []).map((r: any) => ({
    id: r.id,
    asset: r.assets?.name || "Unknown Asset",
    fault: r.issue_description,
    reportedBy: r.reported_by,
    openDate: r.opened_at,
    country: r.assets?.country || "N/A",
    entity: r.assets?.entity || entitySlug,
    techAssigned: r.assigned_tech || "Unassigned",
    closeDate: r.closed_at,
    status: r.status as any,
    cost: r.cost,
    notes: r.notes,
    tenantId: "system"
  }));

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <h2 className="text-3xl font-bold tracking-tight">Repair Tickets</h2>
      <RepairTicketManager initialData={repairs} />
    </div>
  );
}