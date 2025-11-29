'use server';

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

// --- Types ---
export interface Technician {
  id: string;
  name: string;
  skills: string[];
  lat: number;
  lng: number;
  last_updated: string;
  current_job_count: number;
}

export interface WorkOrderLocation {
  id: number;
  reference: string;
  lat: number;
  lng: number;
  skill_required: string;
  address: string;
  scheduled_at?: string;
  priority: string;
}

// --- 1. Smart Scheduler Actions ---

export async function fetchTechniciansWithLocation(tenantId: string): Promise<Technician[]> {
  const supabase = createClient(cookies());
  
  // ENTERPRISE QUERY:
  // 1. Fetch Active Technicians
  // 2. JOIN 'technician_live_location' to get real GPS coords
  // 3. JOIN 'work_orders' to calculate current workload load
  const { data, error } = await supabase
    .from('technicians')
    .select(`
      id, 
      full_name, 
      skills, 
      status,
      technician_live_location!inner ( lat, lng, last_updated ),
      work_orders ( status )
    `)
    .eq('tenant_id', tenantId)
    .eq('status', 'active');

  if (error) throw new Error(`Technician Fetch Error: ${error.message}`);

  // Transform Data
  return data.map((t: any) => {
    // Calculate active load based on real work order statuses
    const activeJobs = t.work_orders?.filter((w: any) => 
      ['scheduled', 'in_progress', 'en_route'].includes(w.status)
    ).length || 0;

    // Strict type mapping from the joined location table
    const location = t.technician_live_location;

    return {
      id: t.id,
      name: t.full_name,
      skills: t.skills || [],
      lat: location?.lat || 0, // In prod, 0,0 indicates "Location Unknown"
      lng: location?.lng || 0,
      last_updated: location?.last_updated,
      current_job_count: activeJobs
    };
  });
}

export async function fetchUnassignedWorkOrders(tenantId: string): Promise<WorkOrderLocation[]> {
  const supabase = createClient(cookies());
  
  const { data, error } = await supabase
    .from('work_orders')
    .select('id, reference, lat, lng, address, priority, status') 
    .eq('tenant_id', tenantId)
    .is('technician_id', null) // Only fetch unassigned
    .neq('status', 'canceled')
    .neq('status', 'completed')
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Work Order Fetch Error: ${error.message}`);

  return data.map((d: any) => ({
    id: d.id,
    reference: d.reference,
    lat: d.lat || 0,
    lng: d.lng || 0,
    address: d.address || 'No Address Provided',
    skill_required: 'General', // Ideally fetched from a 'service_type' column
    priority: d.priority || 'medium'
  }));
}

export async function assignWorkOrder(workOrderId: number, technicianId: string, tenantId: string) {
  const supabase = createClient(cookies());
  
  // Transaction: Update WO status and Assignee
  const { error } = await supabase
    .from('work_orders')
    .update({ 
      technician_id: technicianId,
      status: 'scheduled',
      scheduled_at: new Date().toISOString() // Schedules for 'Now' upon assignment
    })
    .eq('id', workOrderId)
    .eq('tenant_id', tenantId);

  if (error) throw new Error(error.message);
  
  revalidatePath('/field-service/schedule');
  return { success: true };
}

// --- 2. Route Optimization Actions ---

export async function fetchTechnicianRoute(technicianId: string, tenantId: string) {
  const supabase = createClient(cookies());
  
  // Fetches the technician's actual scheduled route from DB
  const { data, error } = await supabase
    .from('work_orders')
    .select('id, reference, address, lat, lng, scheduled_at, status')
    .eq('technician_id', technicianId)
    .eq('tenant_id', tenantId)
    .in('status', ['scheduled', 'in_progress', 'en_route'])
    .order('scheduled_at', { ascending: true }); // Default to time-based sorting

  if (error) throw new Error(error.message);
  
  return data.map((row: any) => ({
    work_order_id: row.id,
    reference: row.reference,
    address: row.address,
    lat: row.lat,
    lng: row.lng
  }));
}

// --- 3. Calendar Actions ---

export async function rescheduleWorkOrder(workOrderId: string, newDate: Date) {
  const supabase = createClient(cookies());
  
  const { error } = await supabase
    .from('work_orders')
    .update({ scheduled_at: newDate.toISOString() })
    .eq('id', workOrderId);

  if (error) return { success: false, message: error.message };
  
  revalidatePath('/field-service/schedule');
  return { success: true };
}