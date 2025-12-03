import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Import the component and its Interface
import RepairTicketManager, { RepairTicket } from "@/components/inventory/RepairTicketsManager";
import AssetMaintenanceScheduler from "@/components/inventory/AssetMaintenanceScheduler";

export default async function MaintenancePage() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // REAL DATA FETCHING
  const [maintenanceRes, repairsRes] = await Promise.all([
    supabase.from("maintenance_schedules").select(`
      *,
      assets (name, location, country)
    `),
    supabase.from("repair_tickets").select(`
      *,
      assets (name, location, country, entity)
    `)
  ]);

  const schedules = (maintenanceRes.data || []).map((m: any) => ({
    id: String(m.id),
    asset: m.assets?.name || "Unknown Asset",
    assetId: m.asset_id,
    entity: m.entity,
    country: m.assets?.country || "N/A",
    location: m.assets?.location || "N/A",
    scheduleCron: m.frequency,
    nextDue: m.next_due,
    technician: m.technician_name || "Unassigned",
    status: m.status,
    tenantId: "system"
  }));

  // Map database results to the RepairTicket interface
  const repairs: RepairTicket[] = (repairsRes.data || []).map((r: any) => ({
    id: String(r.id),
    asset: r.assets?.name || "Unknown Asset",
    fault: r.issue_description || "No description",
    reportedBy: r.reported_by || "Unknown",
    // Convert dates to ISO Strings to avoid Server-to-Client warning
    openDate: r.opened_at ? new Date(r.opened_at).toISOString() : new Date().toISOString(),
    country: r.assets?.country || "N/A",
    entity: r.assets?.entity || "N/A",
    techAssigned: r.assigned_tech || "Unassigned",
    closeDate: r.closed_at ? new Date(r.closed_at).toISOString() : null,
    status: r.status,
    cost: Number(r.cost) || 0,
    notes: r.notes || "",
    tenantId: "system"
  }));

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Maintenance & Repairs</h2>
      </div>
      <Tabs defaultValue="maintenance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="maintenance">Asset Maintenance</TabsTrigger>
          <TabsTrigger value="repairs">Repair Tickets</TabsTrigger>
        </TabsList>
        <TabsContent value="maintenance">
          {/* Note: Ensure AssetMaintenanceScheduler is also updated to accept 'initialData' */}
          <AssetMaintenanceScheduler initialData={schedules} />
        </TabsContent>
        <TabsContent value="repairs">
          <RepairTicketManager initialData={repairs} />
        </TabsContent>
      </Tabs>
    </div>
  );
}