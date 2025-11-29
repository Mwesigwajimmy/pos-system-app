'use server';

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export interface MaintenanceCycle {
  id: number;
  equipment_id: number;
  equipment_name: string;
  equipment_serial?: string;
  next_due: string;
  interval_days: number;
  last_service: string | null;
  status: 'scheduled' | 'overdue' | 'pending' | 'completed';
}

export async function fetchMaintenanceCycles(tenantId: string) {
  const supabase = createClient(cookies());
  
  // Enterprise Query: Joining with equipment table to get names
  const { data, error } = await supabase
    .from('equipment_maintenance_cycles')
    .select(`
      *,
      equipment (
        name,
        serial_number
      )
    `)
    .eq('tenant_id', tenantId)
    .order('next_due', { ascending: true });

  if (error) throw new Error(error.message);

  // Flatten and transform data for the UI
  return data.map((row: any) => ({
    id: row.id,
    equipment_id: row.equipment_id,
    equipment_name: row.equipment?.name || 'Unknown Asset',
    equipment_serial: row.equipment?.serial_number,
    next_due: row.next_due,
    interval_days: row.interval_days,
    last_service: row.last_service,
    status: determineStatus(row.next_due, row.status)
  })) as MaintenanceCycle[];
}

// Helper to calculate real-time status
function determineStatus(nextDue: string, dbStatus: string) {
  if (new Date(nextDue) < new Date()) return 'overdue';
  return dbStatus;
}

export async function scheduleMaintenance(equipmentId: number, nextDue: string, tenantId: string) {
  const supabase = createClient(cookies());
  
  if (!nextDue) throw new Error("A valid date is required.");

  // Uses the RPC function we created in the SQL step to Atomic Update + Create Work Order
  const { error } = await supabase.rpc('schedule_equipment_maintenance', {
    equipment_id: equipmentId,
    next_due: nextDue,
    tenant_id: tenantId,
  });

  if (error) throw new Error(error.message);
  return { success: true };
}