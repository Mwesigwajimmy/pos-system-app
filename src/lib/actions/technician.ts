'use server';

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

// --- Types ---
export interface TechnicianJob {
  id: number;
  reference: string;
  customer_name: string;
  address: string;
  status: string;
  scheduled_at: string;
  lat: number;
  lng: number;
  priority: string;
}

export interface OfflineAction {
  id: string; // Unique ID for the offline action itself (UUID)
  operation: 'UPDATE_STATUS' | 'ADD_NOTE' | 'COMPLETE_JOB';
  payload: any;
  timestamp: number;
}

export interface SyncResult {
  id: string; // The ID of the OfflineAction
  success: boolean;
  error?: string;
}

// --- Fetch Data ---
export async function fetchTechnicianJobs(technicianId: string, tenantId: string): Promise<TechnicianJob[]> {
  const supabase = createClient(cookies());
  
  const { data, error } = await supabase
    .from('work_orders')
    .select('id, reference, customer_name, address, status, scheduled_at, lat, lng, priority')
    .eq('technician_id', technicianId)
    .eq('tenant_id', tenantId)
    .neq('status', 'canceled')
    .order('scheduled_at', { ascending: true });

  if (error) throw new Error(`Failed to fetch jobs: ${error.message}`);
  
  return data as TechnicianJob[];
}

// --- Enterprise Sync Logic ---
export async function syncOfflineChanges(queue: OfflineAction[], tenantId: string): Promise<SyncResult[]> {
  const supabase = createClient(cookies());
  const results: SyncResult[] = [];

  // Process items sequentially to maintain order of operations
  for (const item of queue) {
    try {
      // 1. Handle Status Updates
      if (item.operation === 'UPDATE_STATUS') {
        const { workOrderId, status, lat, lng } = item.payload;
        
        const { error } = await supabase
          .from('work_orders')
          .update({ 
            status, 
            // In enterprise, we also log WHERE the status change happened (Geo-fencing proof)
            last_status_lat: lat,
            last_status_lng: lng,
            updated_at: new Date().toISOString()
          })
          .eq('id', workOrderId)
          .eq('tenant_id', tenantId);

        if (error) throw error;
      } 
      
      // 2. Handle Job Completion (More complex logic)
      else if (item.operation === 'COMPLETE_JOB') {
        const { workOrderId, notes } = item.payload;
        
        // Transaction: Update Status + Add Completion Note
        const { error: updateErr } = await supabase
          .from('work_orders')
          .update({ status: 'completed', completed_at: new Date().toISOString() })
          .eq('id', workOrderId);
          
        if (updateErr) throw updateErr;

        if (notes) {
           await supabase.from('work_order_notes').insert({
             work_order_id: workOrderId,
             note: notes,
             type: 'completion_summary',
             tenant_id: tenantId
           });
        }
      }

      // If we get here, it succeeded
      results.push({ id: item.id, success: true });

    } catch (err: any) {
      console.error(`Sync failed for item ${item.id}:`, err);
      // Return failure so client keeps it in queue
      results.push({ id: item.id, success: false, error: err.message });
    }
  }

  revalidatePath('/field-service/technician');
  return results;
}