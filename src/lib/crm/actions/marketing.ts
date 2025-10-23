'use server';

import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

// --- UPDATED SCHEMA ---
const CreateCampaignSchema = z.object({
  name: z.string().min(3, { message: "Campaign name must be at least 3 characters long." }),
  type: z.enum(['EMAIL', 'SMS'], {
    message: 'Please select a valid campaign type.', // Corrected from errorMap
  }),
  created_by: z.string().uuid({ message: "Invalid creator ID." }),
});

export interface FormState {
    success: boolean;
    message: string;
    errors?: {
        [key: string]: string[];
    } | null;
}

/**
 * Creates a new marketing campaign in the database.
 * The campaign is created with a 'DRAFT' status by default.
 * @param prevState - The previous state of the form.
 * @param formData - The data submitted from the form.
 */
export async function createCampaign(prevState: FormState, formData: FormData): Promise<FormState> {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    const rawFormData = Object.fromEntries(formData.entries());
    const validatedFields = CreateCampaignSchema.safeParse(rawFormData);

    if (!validatedFields.success) {
        return {
            success: false,
            message: "Validation failed. Please check the form fields.",
            errors: validatedFields.error.flatten().fieldErrors,
        };
    }

    const { error } = await supabase.from('marketing_campaigns').insert({
        name: validatedFields.data.name,
        type: validatedFields.data.type,
        created_by: validatedFields.data.created_by,
        status: 'DRAFT', // All new campaigns start as a draft.
    });

    if (error) {
        console.error('Supabase Error:', error);
        return {
            success: false,
            message: "Database Error: Failed to create the new campaign.",
            errors: null,
        };
    }

    revalidatePath('/crm/marketing');

    return {
        success: true,
        message: "The new campaign has been created successfully as a draft.",
        errors: null,
    };
}