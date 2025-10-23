'use server';

import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { FormState } from './work_orders'; // Re-use the FormState type

const CreateEquipmentSchema = z.object({
  name: z.string().min(2, { message: "Equipment name must be at least 2 characters." }),
  type: z.string().optional(),
  serial_number: z.string().optional(),
  next_maintenance_date: z.string().optional().nullable(),
});

/**
 * Creates a new piece of equipment in the database.
 */
export async function createEquipment(prevState: FormState, formData: FormData): Promise<FormState> {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    const rawFormData = {
        ...Object.fromEntries(formData.entries()),
        next_maintenance_date: formData.get('next_maintenance_date') || null,
    };
    
    const validatedFields = CreateEquipmentSchema.safeParse(rawFormData);

    if (!validatedFields.success) {
        return { success: false, message: "Validation failed.", errors: validatedFields.error.flatten().fieldErrors };
    }

    const { error } = await supabase.from('equipment').insert({
        name: validatedFields.data.name,
        type: validatedFields.data.type,
        serial_number: validatedFields.data.serial_number,
        next_maintenance_date: validatedFields.data.next_maintenance_date,
        status: 'AVAILABLE',
    });

    if (error) {
        console.error('Supabase Error:', error);
        return { success: false, message: "Database Error: Failed to create equipment.", errors: null };
    }

    revalidatePath('/field-service/equipment');

    return { success: true, message: `Equipment "${validatedFields.data.name}" has been created.`, errors: null };
}