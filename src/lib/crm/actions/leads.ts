'use server';

import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

/**
 * 🛡️ ENTERPRISE VALIDATION SCHEMA
 * Captures the full forensic DNA of the lead
 */
const CreateLeadSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters."),
  nature_of_business: z.string().optional(),
  marketing_agent_id: z.string().uuid("Agent must be selected."),
  marketing_team_name: z.string().optional(),
  value: z.coerce.number().default(0),
  currency_code: z.string().default('UGX'),
  agreed_commission_percentage: z.coerce.number().default(0),
  target_package_name: z.string().default('STANDARD'),
  stage_id: z.string().uuid("Invalid pipeline stage."),
  lead_source_category: z.string().default('DIRECT'),
  business_id: z.string().uuid()
});

export interface FormState {
    success: boolean;
    message: string;
    errors?: { [key: string]: string[]; } | null;
}

/**
 * 🧠 CREATE FORENSIC RECORD
 * Saves the lead directly into crm_contacts (The Master Ledger)
 */
export async function createDeal(prevState: FormState, formData: FormData): Promise<FormState> {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    const rawFormData = Object.fromEntries(formData.entries());
    const validatedFields = CreateLeadSchema.safeParse(rawFormData);

    if (!validatedFields.success) {
        return {
            success: false,
            message: "Forensic validation failed.",
            errors: validatedFields.error.flatten().fieldErrors,
        };
    }

    const { data, error } = await supabase
        .from('crm_contacts')
        .insert({
            full_name: validatedFields.data.title, // Simplified Identity
            title: validatedFields.data.title,
            nature_of_business: validatedFields.data.nature_of_business,
            marketing_agent_id: validatedFields.data.marketing_agent_id,
            marketing_team_name: validatedFields.data.marketing_team_name,
            value: validatedFields.data.value,
            currency_code: validatedFields.data.currency_code,
            agreed_commission_percentage: validatedFields.data.agreed_commission_percentage,
            target_package_name: validatedFields.data.target_package_name,
            stage_id: validatedFields.data.stage_id,
            lead_source_category: validatedFields.data.lead_source_category,
            business_id: validatedFields.data.business_id,
            status: 'lead' // Ensure it starts as a lead
        });

    if (error) {
        console.error('Forensic Insert Error:', error);
        return { success: false, message: "Database Error: " + error.message, errors: null };
    }

    revalidatePath('/crm/leads');
    return { success: true, message: "Lead Intelligence synchronized successfully.", errors: null };
}

/**
 * 🔄 UPDATE STAGE (Kanban Sync)
 */
export async function updateDealStage(dealId: string, newStageId: string): Promise<{ success: boolean; message: string }> {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    const { error } = await supabase
        .from('crm_contacts')
        .update({ stage_id: newStageId })
        .eq('id', dealId);

    if (error) return { success: false, message: "Sync Error: " + error.message };

    revalidatePath('/crm/leads');
    return { success: true, message: "Pipeline position synchronized." };
}

/**
 * 🏗️ CONVERT TO WORK ORDER
 */
export async function convertDealToWorkOrder(dealId: string): Promise<{ success: boolean; message: string }> {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    const { data: lead, error: fetchError } = await supabase
        .from('crm_contacts')
        .select('id, title, full_name, business_id')
        .eq('id', dealId)
        .single();

    if (fetchError || !lead) return { success: false, message: "Could not find forensic record." };
    
    // Create the Work Order
    const { error: insertError } = await supabase.from('work_orders').insert({
        summary: lead.title,
        customer_id: lead.id,
        business_id: lead.business_id,
        status: 'SCHEDULED',
        priority: 'MEDIUM',
        scheduled_date: new Date().toISOString(),
    });

    if (insertError) return { success: false, message: "Conversion failed: " + insertError.message };

    revalidatePath('/crm/leads');
    revalidatePath('/field-service/work-orders');

    return { success: true, message: `Converted "${lead.title}" to Work Order successfully.` };
}