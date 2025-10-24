'use server';

import { z } from 'zod';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

// Define the shape of our form data for validation
const TimeLogSchema = z.object({
  customerId: z.string().uuid({ message: 'Please select a valid client.' }),
  hours: z.coerce.number().gt(0, { message: 'Hours must be greater than 0.' }),
  description: z.string().min(3, { message: 'Description is required.' }),
});

export type FormState = {
    success: boolean;
    message: string;
    errors?: {
        customerId?: string[];
        hours?: string[];
        description?: string[];
    } | null;
};

export async function logBillableTime(prevState: FormState, formData: FormData): Promise<FormState> {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, message: 'Authentication error.' };
    }

    const validatedFields = TimeLogSchema.safeParse({
        customerId: formData.get('customer_id'),
        hours: formData.get('hours'),
        description: formData.get('description'),
    });

    if (!validatedFields.success) {
        return {
            success: false,
            message: 'Invalid form data.',
            errors: validatedFields.error.flatten().fieldErrors,
        };
    }

    const { customerId, hours, description } = validatedFields.data;

    const { error } = await supabase.from('time_entries').insert({
        customer_id: customerId,
        hours: hours,
        description: description,
        user_id: user.id,
        is_billed: false
    });

    if (error) {
        console.error('Supabase Error:', error);
        return { success: false, message: 'Database Error: Could not log time entry.' };
    }
    
    // This is crucial: It tells Next.js to refresh the dashboard page so the KPI updates instantly.
    revalidatePath('/professional-services');

    return { success: true, message: `Successfully logged ${hours} hours.` };
}