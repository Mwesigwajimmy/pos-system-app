'use server';

import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

// --- CREATE DEAL ---

const CreateDealSchema = z.object({
  title: z.string().min(3, { message: "Deal title must be at least 3 characters." }),
  value: z.coerce.number().optional().nullable(), // Coerce turns empty string into 0
  stage_id: z.string().uuid({ message: "A valid stage must be selected." }),
  owner_id: z.string().uuid({ message: "Invalid owner ID." }),
  contact_name: z.string().optional().nullable(),
  // customer_id: z.string().uuid().optional(), // For linking to existing customers
});

export interface FormState {
    success: boolean;
    message: string;
    errors?: {
        [key: string]: string[];
    } | null;
}

export async function createDeal(prevState: FormState, formData: FormData): Promise<FormState> {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    const rawFormData = Object.fromEntries(formData.entries());
    const validatedFields = CreateDealSchema.safeParse(rawFormData);

    if (!validatedFields.success) {
        return {
            success: false,
            message: "Validation failed. Please check the form fields.",
            errors: validatedFields.error.flatten().fieldErrors,
        };
    }
    
    const { error } = await supabase.from('deals').insert({
        title: validatedFields.data.title,
        value: validatedFields.data.value,
        stage_id: validatedFields.data.stage_id,
        owner_id: validatedFields.data.owner_id,
        contact_name: validatedFields.data.contact_name,
        // For now, hardcode currency. In future, this could come from tenant settings.
        currency_code: 'USD',
    });

    if (error) {
        console.error('Supabase Error:', error);
        return {
            success: false,
            message: "Database Error: Failed to create the new deal.",
            errors: null,
        };
    }

    revalidatePath('/crm/leads');

    return {
        success: true,
        message: "The new deal has been successfully created.",
        errors: null,
    };
}


// --- UPDATE DEAL STAGE ---

const UpdateDealStageSchema = z.object({
    dealId: z.string().uuid(),
    newStageId: z.string().uuid(),
});

/**
 * Updates the stage of a single deal.
 * Called from the Sales Pipeline Kanban board after a drag-and-drop action.
 * @param dealId - The UUID of the deal to update.
 * @param newStageId - The UUID of the new stage for the deal.
 */
export async function updateDealStage(dealId: string, newStageId: string): Promise<{ success: boolean; message: string }> {
    const validation = UpdateDealStageSchema.safeParse({ dealId, newStageId });
    if (!validation.success) {
        return { success: false, message: "Invalid input provided." };
    }

    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    const { error } = await supabase
        .from('deals')
        .update({ stage_id: newStageId })
        .eq('id', dealId);

    if (error) {
        console.error('Supabase Error:', error);
        return { success: false, message: "Database Error: Failed to update deal stage." };
    }

    revalidatePath('/crm/leads');

    return { success: true, message: "Deal stage updated." };
}