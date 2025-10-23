'use server';

import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

// Define a schema for validating the new estimate form data.
const CreateEstimateSchema = z.object({
  title: z.string().min(3, { message: "Estimate title must be at least 3 characters long." }),
  customer_id: z.string().uuid({ message: "A valid customer must be selected." }),
});

export interface FormState {
    success: boolean;
    message: string;
    errors?: {
        [key: string]: string[];
    } | null;
}

/**
 * Generates a unique, sequential, human-readable estimate ID.
 * @param supabase - The Supabase client instance.
 * @returns {Promise<string>} - The new estimate ID (e.g., "EST-1001").
 */
async function generateEstimateUID(supabase: any): Promise<string> {
    const { data, error } = await supabase
        .from('estimates')
        .select('estimate_uid')
        .order('created_at', { ascending: false })
        .limit(1);

    if (error || !data || data.length === 0) {
        return 'EST-1001';
    }

    const lastId = data[0].estimate_uid;
    const lastNumber = parseInt(lastId.split('-')[1]);
    const newNumber = lastNumber + 1;
    return `EST-${newNumber}`;
}


/**
 * Creates a new contractor estimate in the database.
 * @param prevState - The previous state of the form.
 * @param formData - The data submitted from the form.
 */
export async function createEstimate(prevState: FormState, formData: FormData): Promise<FormState> {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    const rawFormData = Object.fromEntries(formData.entries());
    const validatedFields = CreateEstimateSchema.safeParse(rawFormData);

    if (!validatedFields.success) {
        return {
            success: false,
            message: "Validation failed. Please check the form fields.",
            errors: validatedFields.error.flatten().fieldErrors,
        };
    }

    const newEstimateUID = await generateEstimateUID(supabase);

    const { error } = await supabase.from('estimates').insert({
        estimate_uid: newEstimateUID,
        title: validatedFields.data.title,
        customer_id: validatedFields.data.customer_id,
        status: 'DRAFT', // All new estimates start as a draft.
        total_amount: 0, // Total is 0 until line items are added.
    });

    if (error) {
        console.error('Supabase Error:', error);
        return {
            success: false,
            message: "Database Error: Failed to create the new estimate.",
            errors: null,
        };
    }

    revalidatePath('/contractor/estimates');

    return {
        success: true,
        message: `Estimate ${newEstimateUID} has been created as a draft.`,
        errors: null,
    };
}