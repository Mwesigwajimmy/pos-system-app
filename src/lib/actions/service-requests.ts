'use server';

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export interface ServiceRequest {
  id: number;
  site: string;
  description: string;
  status: string;
  urgent: boolean;
  created_at: string;
}

export async function fetchRequests(customerId: string, tenantId: string) {
  const supabase = createClient(cookies());
  const { data, error } = await supabase
    .from('service_requests')
    .select('*')
    .eq('customer_id', customerId)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data as ServiceRequest[];
}

export async function createRequest(input: any) {
  const supabase = createClient(cookies());
  
  const { error } = await supabase.from('service_requests').insert([{
    customer_id: input.customer_id,
    description: input.description,
    site: input.site,
    urgent: input.urgent,
    status: 'new',
    tenant_id: input.tenant_id
  }]);

  if (error) throw new Error(error.message);
  return { success: true };
}