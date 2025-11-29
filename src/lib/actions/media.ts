'use server';

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function fetchPhotos(workOrderId: number, tenantId: string) {
  const supabase = createClient(cookies());
  const { data, error } = await supabase
    .from('work_order_photos')
    .select('*')
    .eq('work_order_id', workOrderId)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

export async function deletePhoto(photoId: number) {
  const supabase = createClient(cookies());
  const { error } = await supabase.from('work_order_photos').delete().eq('id', photoId);
  if (error) throw new Error(error.message);
  return { success: true };
}

export async function saveSignature(workOrderId: number, actor: string, publicUrl: string, tenantId: string) {
  const supabase = createClient(cookies());
  const { error } = await supabase.from('work_order_signatures').insert([{ 
    work_order_id: workOrderId, 
    actor, 
    signature_url: publicUrl, 
    tenant_id: tenantId 
  }]);
  
  if (error) throw new Error(error.message);
  
  // Automatically progress WO status if technician signs
  if (actor === 'technician') {
      await supabase
        .from('work_orders')
        .update({ status: 'COMPLETED', completed_at: new Date().toISOString() })
        .eq('id', workOrderId);
  }
  
  return { success: true };
}