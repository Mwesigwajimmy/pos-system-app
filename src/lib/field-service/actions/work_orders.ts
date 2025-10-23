'use server';

import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

export interface FormState { success: boolean; message: string; errors?: { [key: string]: string[] } | null; }

const CreateWorkOrderSchema = z.object({
  summary: z.string().min(5, { message: "Summary must be at least 5 characters." }),
  customer_id: z.string().uuid({ message: "A valid customer must be selected." }),
  scheduled_date: z.string().date(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
});

async function generateWorkOrderUID(supabase: any): Promise<string> {
    const { data, error } = await supabase.from('work_orders').select('work_order_uid').order('created_at', { ascending: false }).limit(1);
    if (error || !data || data.length === 0) return 'WO-1001';
    const lastId = data[0].work_order_uid;
    const newNumber = parseInt(lastId.split('-')[1]) + 1;
    return `WO-${newNumber}`;
}

export async function createWorkOrder(prevState: FormState, formData: FormData): Promise<FormState> {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    const rawFormData = Object.fromEntries(formData.entries());
    const validatedFields = CreateWorkOrderSchema.safeParse(rawFormData);

    if (!validatedFields.success) {
        return { success: false, message: "Validation failed.", errors: validatedFields.error.flatten().fieldErrors };
    }

    const newWorkOrderUID = await generateWorkOrderUID(supabase);

    const { error } = await supabase.from('work_orders').insert({
        work_order_uid: newWorkOrderUID,
        summary: validatedFields.data.summary,
        customer_id: validatedFields.data.customer_id,
        scheduled_date: validatedFields.data.scheduled_date,
        priority: validatedFields.data.priority,
        status: 'SCHEDULED',
    });

    if (error) {
        console.error('Supabase Error:', error);
        return { success: false, message: "Database Error: Failed to create work order.", errors: null };
    }

    revalidatePath('/field-service/schedule');
    revalidatePath('/field-service/work-orders');

    return { success: true, message: `Work Order ${newWorkOrderUID} created.`, errors: null };
}