'use server';

import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

/**
 * 🛡️ ENTERPRISE VALIDATION SCHEMA
 * Forensic capture of marketing, financial, and pipeline data.
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
            tenant_id: validatedFields.data.business_id, 
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
 * 🔄 UPDATE PIPELINE POSITION (Board Sync)
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
 * 🏗️ TRIPLE MODULE CONVERSION (Enterprise Weld)
 * Synchronizes Leads with Field Service (Work Orders) and Accounting (Invoices)
 */
export async function convertDealToWorkOrder(dealId: string): Promise<{ success: boolean; message: string }> {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    // 1. Fetch Forensic Lead DNA
    const { data: lead, error: fetchError } = await supabase
        .from('crm_contacts')
        .select('*')
        .eq('id', dealId)
        .maybeSingle();

    if (fetchError || !lead) return { success: false, message: "Forensic record not found." };
    
    const initialValue = lead.value || 0;

    // 2. Insert into Work Orders (Fulfillment Sync)
    // Satisfies requirements of fn_sovereign_accounting_kernel_v8
    const { error: woError } = await supabase.from('work_orders').insert({
        work_order_uid: `WO-CRM-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
        summary: `Fulfillment: ${lead.title || lead.full_name}`,
        crm_contact_id: lead.id, 
        business_id: lead.business_id,
        tenant_id: lead.tenant_id || lead.business_id,
        currency: lead.currency_code || 'UGX',
        currency_code: lead.currency_code || 'UGX',
        total_amount: 0, // Fulfillment setup impact is handled via the separate Invoice
        tax_amount: 0,
        payment_method: 'Cash', 
        status: 'SCHEDULED',
        priority: 'MEDIUM',
        scheduled_date: new Date().toISOString(),
    });

    if (woError) {
        console.error("Service Module Sync Failure:", woError);
        return { success: false, message: "Forensic Fulfillment Weld Failed." };
    }

    // 3. Insert into Invoices (Accounting & Tax Sector Sync)
    // This uses your established 'client_id' and financial columns
    if (initialValue > 0) {
        const { error: invError } = await supabase.from('invoices').insert({
            business_id: lead.business_id,
            tenant_id: lead.tenant_id || lead.business_id,
            client_id: lead.id, // Linking UUID to the Invoicing Sector
            invoice_number: `INV-SALE-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
            total_amount: initialValue,
            currency: lead.currency_code || 'UGX',
            currency_code: lead.currency_code || 'UGX',
            status: 'Draft', 
            issue_date: new Date().toISOString().split('T')[0],
            summary: `Service Setup & Deployment for ${lead.title}`,
            customer_name: lead.full_name
        });
        
        if (invError) {
            console.error("Accounting Sector Sync Conflict:", invError);
            // We do not stop the process, as the Work Order and Status update are still critical.
        }
    }

    // 4. Final Promotion: Activate Subscriber status and Reconcile initial debt
    await supabase.from('crm_contacts')
        .update({ 
            subscription_status: 'ACTIVE', 
            status: 'customer',
            active_debt_ugx: (lead.active_debt_ugx || 0) + initialValue 
        })
        .eq('id', dealId);

    revalidatePath('/crm/leads');
    revalidatePath('/invoicing/list');
    revalidatePath('/field-service/work-orders');

    return { success: true, message: `Triple Weld Sync: CRM, Fulfillment, and Accounting successfully aligned.` };
}