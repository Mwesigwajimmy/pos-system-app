'use server';

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export interface WarrantyContract {
  id: number;
  title: string;
  details: string | null;
  active: boolean;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

export async function fetchContracts(equipmentId: number, tenantId: string) {
  const supabase = createClient(cookies());
  const { data, error } = await supabase
    .from('warranty_contracts')
    .select('*')
    .eq('equipment_id', equipmentId)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data as WarrantyContract[];
}

export async function addContract(input: any) {
  const supabase = createClient(cookies());
  
  // Enterprise Validation: Ensure end date is after start date
  if (input.start_date && input.end_date && new Date(input.end_date) < new Date(input.start_date)) {
    throw new Error('End date cannot be before start date');
  }

  const { error } = await supabase.from('warranty_contracts').insert([input]);
  if (error) throw new Error(error.message);
  return { success: true };
}

export async function toggleContractStatus(id: number, active: boolean) {
  const supabase = createClient(cookies());
  const { error } = await supabase
    .from('warranty_contracts')
    .update({ active })
    .eq('id', id);
  if (error) throw new Error(error.message);
  return { success: true };
}

export async function deleteContract(id: number) {
  const supabase = createClient(cookies());
  const { error } = await supabase
    .from('warranty_contracts')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
  return { success: true };
}