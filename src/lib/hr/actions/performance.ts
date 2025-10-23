'use server';

import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

// Define the schema for validating the performance cycle form data.
const PerformanceCycleSchema = z.object({
  name: z.string().min(5, { message: "Cycle name must be at least 5 characters long." }),
  start_date: z.string().date({ message: "Invalid start date." }),
  end_date: z.string().date({ message: "Invalid end date." }),
});

// Define the shape of the form state for robust error and success handling.
export interface FormState {
    success: boolean;
    message: string;
    errors?: {
        [key: string]: string[];
    } | null;
}

/**
 * Creates a new performance review cycle in the database.
 * The cycle is created with an 'UPCOMING' status by default.
 * @param prevState - The previous state of the form.
 * @param formData - The data submitted from the form.
 */
export async function createPerformanceCycle(prevState: FormState, formData: FormData): Promise<FormState> {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    // Convert FormData to a plain object for validation.
    const rawFormData = {
        name: formData.get('name'),
        start_date: formData.get('start_date'),
        end_date: formData.get('end_date'),
    };

    // Validate the form data against our schema.
    const validatedFields = PerformanceCycleSchema.safeParse(rawFormData);

    if (!validatedFields.success) {
        return {
            success: false,
            message: "Validation failed. Please check the form fields.",
            errors: validatedFields.error.flatten().fieldErrors,
        };
    }
    
    // Perform additional logical validation
    if (new Date(validatedFields.data.end_date) < new Date(validatedFields.data.start_date)) {
        return {
            success: false,
            message: "The review period's end date cannot be before the start date.",
            errors: null,
        };
    }

    // Insert the validated data into the Supabase table.
    const { error } = await supabase.from('performance_cycles').insert({
        name: validatedFields.data.name,
        start_date: validatedFields.data.start_date,
        end_date: validatedFields.data.end_date,
        status: 'UPCOMING', // All new cycles start as upcoming.
    });

    if (error) {
        console.error('Supabase Error:', error);
        return {
            success: false,
            message: "Database Error: Failed to create the performance cycle.",
            errors: null,
        };
    }

    // On success, revalidate the path to refresh the data on the performance dashboard.
    revalidatePath('/hr/performance');

    return {
        success: true,
        message: "The new performance cycle has been created successfully.",
        errors: null,
    };
}