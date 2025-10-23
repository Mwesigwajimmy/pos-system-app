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
        currency_code: 'USD', // Hardcoded for now, can be a tenant setting later
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

// --- NEW SMART ACTION: CONVERT DEAL TO WORK ORDER ---

/**
 * Converts a CRM deal into a Field Service Work Order, linking the two modules.
 * @param dealId The UUID of the deal to convert.
 */
export async function convertDealToWorkOrder(dealId: string): Promise<{ success: boolean; message: string }> {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    // 1. Fetch the deal to get its details
    const { data: deal, error: fetchError } = await supabase
        .from('deals')
        .select('id, title, customer_id')
        .eq('id', dealId)
        .single();

    if (fetchError || !deal) {
        console.error("Deal conversion failed: Could not find original deal.", fetchError);
        return { success: false, message: "Could not find the original deal." };
    }
    if (!deal.customer_id) {
        return { success: false, message: "Deal must be associated with a customer before converting." };
    }
    
    // 2. Generate a new, unique Work Order UID
    // In a high-concurrency environment, a database sequence or a more robust UID generator would be better.
    const { data: lastWO, error: uidError } = await supabase
        .from('work_orders')
        .select('work_order_uid')
        .order('created_at', { ascending: false })
        .limit(1);

    if (uidError) {
        console.error("Deal conversion failed: Could not generate new WO UID.", uidError);
        return { success: false, message: "Database Error: " + uidError.message };
    }
    const newUID = lastWO && lastWO.length > 0 ? `WO-${parseInt(lastWO[0].work_order_uid.split('-')[1]) + 1}` : 'WO-1001';

    // 3. Insert the new Work Order, linking it to the source deal
    const { error: insertError } = await supabase.from('work_orders').insert({
        work_order_uid: newUID,
        summary: deal.title,
        customer_id: deal.customer_id,
        source_deal_id: deal.id,
        status: 'SCHEDULED', // Default to 'SCHEDULED' so it appears on the dispatch board
        priority: 'MEDIUM',
        scheduled_date: new Date().toISOString(), // Default to today, dispatcher can move it
    });

    if (insertError) {
        console.error("Deal conversion failed: Could not insert new work order.", insertError);
        return { success: false, message: "Database Error: " + insertError.message };
    }

    // 4. Revalidate all relevant paths to update the UI across different modules
    revalidatePath('/crm/leads');
    revalidatePath('/field-service/schedule');
    revalidatePath('/field-service/work-orders');

    return { success: true, message: `Successfully converted to Work Order ${newUID}.` };
}