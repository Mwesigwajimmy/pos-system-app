'use server';

import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

export interface RuleFormState { success: boolean; message: string; ruleId?: string; errors?: any; }

const FormSchema = z.object({ /* Complex validation will be on the client with RHF */ });

export async function createOrUpdatePricingRule(prevState: RuleFormState, formData: FormData): Promise<RuleFormState> {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    
    // Extract and parse the complex JSON data from the form
    const ruleData = JSON.parse(formData.get('ruleData') as string);
    const conditions = JSON.parse(formData.get('conditions') as string);
    const actions = JSON.parse(formData.get('actions') as string);

    // TODO: Add Zod validation for the parsed objects here for extra security

    const { data: ruleId, error } = await supabase.rpc('create_or_update_pricing_rule', {
        p_rule_id: ruleData.id || null,
        p_name: ruleData.name,
        p_priority: ruleData.priority,
        p_is_active: ruleData.is_active,
        p_start_date: ruleData.start_date,
        p_end_date: ruleData.end_date,
        p_conditions: conditions,
        p_actions: actions,
    });

    if (error) {
        console.error("RPC Error:", error);
        return { success: false, message: "Database Error: Could not save pricing rule." };
    }

    revalidatePath('/sales/pricing-rules');
    revalidatePath(`/sales/pricing-rules/${ruleId}`);
    
    if (!ruleData.id) { // If it was a new rule
        redirect(`/sales/pricing-rules/${ruleId}`);
    }
    
    return { success: true, message: "Pricing rule saved successfully.", ruleId: ruleId };
}