'use server';

import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

/**
 * 🛡️ ENTERPRISE VALIDATION SCHEMA
 * Captures the full forensic DNA of the lead including commissions
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
    const cookieStore = await cookies(); 
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

    const { error } = await supabase
        .from('crm_contacts')
        .insert({
            full_name: validatedFields.data.title, 
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
            tenant_id: validatedFields.data.business_id, // Syncing tenant_id for board visibility
            status: 'lead' 
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
    const cookieStore = await cookies();
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
 * 🏗️ CONVERT TO WORK ORDER (Enterprise Bridge)
 * Welds CRM Leads to Field Service Fulfillment using UUIDs
 */
export async function convertDealToWorkOrder(dealId: string): Promise<{ success: boolean; message: string }> {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    // 1. Fetch the Forensic Lead DNA
    const { data: lead, error: fetchError } = await supabase
        .from('crm_contacts')
        .select('id, title, full_name, business_id, tenant_id')
        .eq('id', dealId)
        .maybeSingle();

    if (fetchError || !lead) return { success: false, message: "Could not find forensic record." };
    
    // 2. Insert into Work Orders using the UUID Bridge column
    // This bypasses the legacy customer_id (BIGINT) conflict
    const { error: insertError } = await supabase.from('work_orders').insert({
        work_order_uid: `WO-CRM-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
        summary: `Fulfillment: ${lead.title || lead.full_name}`,
        crm_contact_id: lead.id, // 🛡️ THE UUID BRIDGE
        business_id: lead.business_id,
        tenant_id: lead.tenant_id || lead.business_id,
        status: 'SCHEDULED',
        priority: 'MEDIUM',
        scheduled_date: new Date().toISOString(),
    });

    if (insertError) {
        console.error("Fulfillment Weld Error:", insertError);
        return { success: false, message: "Forensic Weld Failed: " + insertError.message };
    }

    // 3. Promote Lead to Active Subscription status
    await supabase.from('crm_contacts')
        .update({ subscription_status: 'ACTIVE', status: 'customer' })
        .eq('id', dealId);

    revalidatePath('/crm/leads');
    revalidatePath('/field-service/work-orders');

    return { success: true, message: `Lead successfully synchronized for Field Fulfillment.` };
}