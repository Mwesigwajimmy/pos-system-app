'use server';

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function captureFeedback(
  workOrderId: number, 
  customerId: string, 
  rating: number, 
  comment: string, 
  tenantId: string
) {
  const supabase = createClient(cookies());
  
  if (rating < 1 || rating > 5) {
    throw new Error("Rating must be between 1 and 5");
  }

  const { error } = await supabase.from('work_order_feedback').insert([
    { 
      work_order_id: workOrderId, 
      customer_id: customerId, 
      rating, 
      comment, 
      tenant_id: tenantId 
    }
  ]);

  if (error) throw new Error(error.message);
  return { success: true };
}