'use server';

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

// --- Types ---
export interface PartCatalogItem {
  id: number;
  name: string;
  code: string;
  stock_quantity: number;
  unit_cost: number;
}

export interface PartUsage {
  id: number;
  work_order_id: number;
  part_id: number;
  part_name: string; // Joined from catalog
  qty_used: number;
  source: string;
  notes: string;
  recorded_at: string;
}

// --- Actions ---

export async function fetchPartsUsage(workOrderId: number, tenantId: string): Promise<PartUsage[]> {
  const supabase = createClient(cookies());
  
  // Enterprise Query: Join with the catalog to get the current Part Name
  const { data, error } = await supabase
    .from('work_order_parts_usage')
    .select(`
      id,
      work_order_id,
      part_id,
      qty_used,
      source,
      notes,
      recorded_at,
      parts_catalog (
        name
      )
    `)
    .eq('work_order_id', workOrderId)
    .eq('tenant_id', tenantId)
    .order('recorded_at', { ascending: false });

  if (error) throw new Error(`Fetch Usage Error: ${error.message}`);

  // Flatten the structure for the UI
  return data.map((item: any) => ({
    ...item,
    part_name: item.parts_catalog?.name || 'Unknown Part'
  }));
}

export async function addPartUsage(input: {
  work_order_id: number;
  part_id: number;
  qty_used: number;
  source: string;
  notes: string;
  tenant_id: string;
}) {
  const supabase = createClient(cookies());
  
  // 1. Transactional Logic: 
  // We use the RPC function 'consume_part_stock' (defined in previous steps)
  // This ensures stock is decremented atomically AND usage is recorded.
  const { error } = await supabase.rpc('consume_part_stock', {
    p_work_order_id: input.work_order_id,
    p_part_id: input.part_id,
    p_qty: input.qty_used,
    p_source: input.source,
    p_notes: input.notes,
    p_tenant_id: input.tenant_id
  });

  if (error) throw new Error(`Stock Update Error: ${error.message}`);
  
  revalidatePath(`/field-service/work-orders/${input.work_order_id}`);
  return { success: true };
}

// --- REAL CATALOG FETCH ---
export async function fetchPartCatalog(tenantId: string): Promise<PartCatalogItem[]> {
    const supabase = createClient(cookies());
    
    const { data, error } = await supabase
        .from('parts_catalog')
        .select('id, name, code, stock_quantity, unit_cost')
        .eq('tenant_id', tenantId)
        .gt('stock_quantity', 0) // Only fetch parts in stock
        .order('name', { ascending: true });

    if (error) throw new Error(`Catalog Load Failed: ${error.message}`);
    
    return data as PartCatalogItem[];
}