'use server';

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

// --- Types ---
export type FormState = {
  success: boolean;
  message: string;
  errors?: {
    name?: string[];
    type?: string[];
    serial_number?: string[];
  } | null;
};

const EquipmentSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  type: z.string().optional(),
  serial_number: z.string().optional(),
  next_maintenance_date: z.string().optional(),
});

// --- Actions ---

export async function createEquipment(prevState: FormState, formData: FormData): Promise<FormState> {
  const supabase = createClient(cookies());
  
  // 1. Validate Input
  const validatedFields = EquipmentSchema.safeParse({
    name: formData.get('name'),
    type: formData.get('type'),
    serial_number: formData.get('serial_number'),
    next_maintenance_date: formData.get('next_maintenance_date'),
  });

  if (!validatedFields.success) {
    return {
      success: false,
      message: 'Validation failed',
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { data } = validatedFields;

  // 2. Insert into DB
  const { error } = await supabase.from('equipment').insert([{
    name: data.name,
    type: data.type,
    serial_number: data.serial_number,
    next_maintenance_date: data.next_maintenance_date || null,
    status: 'AVAILABLE' // Default status
  }]);

  if (error) {
    return { success: false, message: 'Database Error: ' + error.message, errors: null };
  }

  // 3. Revalidate
  revalidatePath('/field-service/equipment');
  return { success: true, message: 'Equipment added successfully', errors: null };
}

export async function fetchEquipmentHistory(equipmentId: number, tenantId: string) {
  const supabase = createClient(cookies());
  
  const { data, error } = await supabase
    .from('equipment_events')
    .select('*')
    .eq('equipment_id', equipmentId)
    .eq('tenant_id', tenantId)
    .order('timestamp', { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}