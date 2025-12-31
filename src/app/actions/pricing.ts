'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export type RuleFormState = {
    success: boolean;
    message: string;
};

export async function createOrUpdatePricingRule(prevState: RuleFormState, formData: FormData): Promise<RuleFormState> {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    // 1. Get current user's tenant
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: 'Unauthorized' };

    // Fetch tenant_id (Assuming linked via profiles)
    const { data: profile } = await supabase.from('profiles').select('business_id').eq('id', user.id).single();
    const tenant_id = profile?.business_id; // OR tenant_id depending on your schema

    if (!tenant_id) return { success: false, message: 'No tenant found.' };

    // 2. Parse Data
    const rawRuleData = formData.get('ruleData') as string;
    const rawConditions = formData.get('conditions') as string;
    const rawActions = formData.get('actions') as string;

    const ruleData = JSON.parse(rawRuleData);
    const conditions = JSON.parse(rawConditions);
    const actions = JSON.parse(rawActions);

    let ruleId = ruleData.id;

    try {
        // 3. Upsert Rule
        const { data: rule, error: ruleError } = await supabase
            .from('pricing_rules')
            .upsert({
                id: ruleId || undefined,
                tenant_id: tenant_id,
                name: ruleData.name,
                priority: ruleData.priority || 0,
                is_active: ruleData.is_active,
                start_date: ruleData.start_date || null,
                end_date: ruleData.end_date || null,
            })
            .select()
            .single();

        if (ruleError) throw new Error(ruleError.message);
        ruleId = rule.id;

        // 4. Update Children (Wipe and Recreate strategy is safest for lists)
        if (ruleData.id) {
            await supabase.from('pricing_rule_conditions').delete().eq('rule_id', ruleId);
            await supabase.from('pricing_rule_actions').delete().eq('rule_id', ruleId);
        }

        if (conditions.length > 0) {
            const { error: cErr } = await supabase.from('pricing_rule_conditions').insert(
                conditions.map((c: any) => ({
                    rule_id: ruleId,
                    business_id: tenant_id, // Ensure this is set
                    type: c.type,
                    target_id: c.target_id?.toString() || null,
                    quantity_min: c.quantity_min || 0
                }))
            );
            if (cErr) throw new Error(cErr.message);
        }

        if (actions.length > 0) {
            const { error: aErr } = await supabase.from('pricing_rule_actions').insert(
                actions.map((a: any) => ({
                    rule_id: ruleId,
                    business_id: tenant_id, // Ensure this is set
                    type: a.type,
                    value: a.value
                }))
            );
            if (aErr) throw new Error(aErr.message);
        }

    } catch (error: any) {
        console.error('Save Error:', error);
        return { success: false, message: error.message };
    }

    revalidatePath('/sales/pricing-rules');
    return { success: true, message: 'Saved successfully' };
}

export async function deletePricingRule(id: string) {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    await supabase.from('pricing_rules').delete().eq('id', id);
    revalidatePath('/sales/pricing-rules');
}