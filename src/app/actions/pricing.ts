'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

export type RuleFormState = {
    success: boolean;
    message: string;
};

/**
 * Enterprise Pricing Engine - Logic Deployment Action
 */
export async function createOrUpdatePricingRule(prevState: RuleFormState, formData: FormData): Promise<RuleFormState> {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) return { success: false, message: 'Identity verification failed.' };

        const { data: profile } = await supabase
            .from('profiles')
            .select('business_id')
            .eq('id', user.id)
            .single();

        const businessId = profile?.business_id;
        if (!businessId) return { success: false, message: 'Tenant security context missing.' };

        const ruleData = JSON.parse(formData.get('ruleData') as string);
        const conditions = JSON.parse(formData.get('conditions') as string);
        const actions = JSON.parse(formData.get('actions') as string);

        const { data: rule, error: ruleError } = await supabase
            .from('pricing_rules')
            .upsert({
                id: ruleData.id || undefined,
                tenant_id: businessId, 
                name: ruleData.name,
                description: ruleData.description,
                priority: parseInt(ruleData.priority) || 0,
                is_active: ruleData.is_active,
                is_stackable: ruleData.is_stackable,
                start_date: ruleData.start_date || null,
                end_date: ruleData.end_date || null,
            })
            .select()
            .single();

        if (ruleError) throw new Error(ruleError.message);
        const activeRuleId = rule.id;

        if (ruleData.id) {
            await supabase.from('pricing_rule_conditions').delete().eq('rule_id', activeRuleId);
            await supabase.from('pricing_rule_actions').delete().eq('rule_id', activeRuleId);
        }

        if (conditions.length > 0) {
            await supabase.from('pricing_rule_conditions').insert(
                conditions.map((c: any) => ({
                    rule_id: activeRuleId,
                    business_id: businessId,
                    type: c.type,
                    target_id: c.target_id || "GLOBAL",
                    quantity_min: parseInt(c.quantity_min) || 0
                }))
            );
        }

        if (actions.length > 0) {
            await supabase.from('pricing_rule_actions').insert(
                actions.map((a: any) => ({
                    rule_id: activeRuleId,
                    business_id: businessId,
                    type: a.type,
                    value: parseFloat(a.value) || 0
                }))
            );
        }

        revalidatePath('/[locale]/(dashboard)/sales/pricing-rules', 'layout');
        return { success: true, message: 'Logic successfully deployed.' };

    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

/**
 * Atomic Rule Deletion (Multi-Tenant Secured)
 */
export async function deletePricingRule(id: string) {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    // 1. Identity Check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 2. Tenant Context Fetch
    const { data: profile } = await supabase.from('profiles').select('business_id').eq('id', user.id).single();
    if (!profile?.business_id) return;

    // 3. Secured Deletion (Matches SQL: pricing_rules table, id + tenant_id columns)
    const { error } = await supabase
        .from('pricing_rules')
        .delete()
        .eq('id', id)
        .eq('tenant_id', profile.business_id);

    if (!error) {
        revalidatePath('/[locale]/(dashboard)/sales/pricing-rules', 'layout');
    }
}