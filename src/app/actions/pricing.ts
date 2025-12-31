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
        if (authError || !user) return { success: false, message: 'Identity check failed.' };

        const { data: profile } = await supabase.from('profiles').select('business_id').eq('id', user.id).single();
        const businessId = profile?.business_id;
        if (!businessId) return { success: false, message: 'Tenant context invalid.' };

        const ruleData = JSON.parse(formData.get('ruleData') as string);
        const conditions = JSON.parse(formData.get('conditions') as string);
        const actions = JSON.parse(formData.get('actions') as string);

        // --- DEEP FIX: UUID SANITIZATION ---
        // If id is "" or missing, we must pass 'undefined' for the upsert to generate a new UUID
        const targetId = ruleData.id && ruleData.id.length > 10 ? ruleData.id : undefined;

        const { data: rule, error: ruleError } = await supabase
            .from('pricing_rules')
            .upsert({
                id: targetId,
                tenant_id: businessId, 
                name: ruleData.name,
                description: ruleData.description,
                priority: Number(ruleData.priority) || 0,
                is_active: ruleData.is_active,
                is_stackable: ruleData.is_stackable,
                start_date: ruleData.start_date || null,
                end_date: ruleData.end_date || null,
            })
            .select()
            .single();

        if (ruleError) throw new Error(`Rule Sync Failed: ${ruleError.message}`);
        const activeRuleId = rule.id;

        // Cleanup existing logic if updating
        if (targetId) {
            await supabase.from('pricing_rule_conditions').delete().eq('rule_id', activeRuleId);
            await supabase.from('pricing_rule_actions').delete().eq('rule_id', activeRuleId);
        }

        // Insert Conditions
        if (conditions.length > 0) {
            const { error: cErr } = await supabase.from('pricing_rule_conditions').insert(
                conditions.map((c: any) => ({
                    rule_id: activeRuleId,
                    business_id: businessId,
                    type: c.type,
                    target_id: c.target_id || "GLOBAL",
                    quantity_min: Number(c.quantity_min) || 0
                }))
            );
            if (cErr) throw new Error(`Condition Sync Failed: ${cErr.message}`);
        }

        // Insert Actions
        if (actions.length > 0) {
            const { error: aErr } = await supabase.from('pricing_rule_actions').insert(
                actions.map((a: any) => ({
                    rule_id: activeRuleId,
                    business_id: businessId,
                    type: a.type,
                    value: Number(a.value) || 0
                }))
            );
            if (aErr) throw new Error(`Action Sync Failed: ${aErr.message}`);
        }

        revalidatePath('/[locale]/(dashboard)/sales/pricing-rules', 'layout');
        return { success: true, message: 'Rule propagated across all cluster nodes.' };

    } catch (error: any) {
        console.error("CRITICAL_ENGINE_ERROR:", error);
        return { success: false, message: error.message };
    }
}

/**
 * Atomic Rule Deletion (Multi-Tenant Secured)
 * Prevents "Unauthorized Delete" attacks by checking both ID and Tenant ID
 */
export async function deletePricingRule(id: string) {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    try {
        // 1. Identity Check
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Unauthorized");

        // 2. Tenant Context Fetch
        const { data: profile } = await supabase.from('profiles').select('business_id').eq('id', user.id).single();
        if (!profile?.business_id) throw new Error("Tenant context missing");

        // 3. Secured Deletion (Matches rule ID and checks tenant ownership)
        const { error } = await supabase
            .from('pricing_rules')
            .delete()
            .eq('id', id)
            .eq('tenant_id', profile.business_id);

        if (error) throw error;

        revalidatePath('/[locale]/(dashboard)/sales/pricing-rules', 'layout');
        return { success: true };
    } catch (error) {
        console.error("DELETE_RULE_ERROR:", error);
        return { success: false };
    }
}