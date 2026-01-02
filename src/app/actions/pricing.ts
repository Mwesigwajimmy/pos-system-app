'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

export type RuleFormState = {
    success: boolean;
    message: string;
    nodeId?: string;
    timestamp?: string;
};

/**
 * ENTERPRISE DEPLOYMENT ENGINE
 * Atomic upsert for pricing logic with strict tenant isolation.
 */
export async function createOrUpdatePricingRule(
    prevState: RuleFormState, 
    formData: FormData
): Promise<RuleFormState> {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    const syncTimestamp = new Date().toISOString();

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Authentication session expired.");

        const { data: profile } = await supabase.from('profiles').select('business_id').eq('id', user.id).single();
        if (!profile?.business_id) throw new Error("Security Context: Business ID not found.");
        
        const businessId = profile.business_id;
        const ruleData = JSON.parse(formData.get('ruleData') as string);
        const conditions = JSON.parse(formData.get('conditions') as string);
        const actions = JSON.parse(formData.get('actions') as string);

        const targetId = (ruleData.id && ruleData.id !== "") ? ruleData.id : undefined;

        // 1. Core Rule Upsert
        const { data: rule, error: ruleError } = await supabase
            .from('pricing_rules')
            .upsert({
                id: targetId,
                tenant_id: businessId, 
                name: ruleData.name,
                description: ruleData.description || '',
                priority: Math.min(100, Math.max(0, Number(ruleData.priority) || 0)),
                is_active: ruleData.is_active,
                is_stackable: ruleData.is_stackable || false,
                updated_at: syncTimestamp
            })
            .select('id')
            .single();

        if (ruleError) throw new Error(`Engine Configuration Error: ${ruleError.message}`);
        const activeRuleId = rule.id;

        // 2. Logic Reset (Clears old nodes for clean re-deployment)
        if (targetId) {
            await supabase.from('pricing_rule_conditions').delete().eq('rule_id', activeRuleId);
            await supabase.from('pricing_rule_actions').delete().eq('rule_id', activeRuleId);
        }

        // 3. Batch Logic Deployment
        if (conditions.length > 0) {
            const { error: cError } = await supabase
                .from('pricing_rule_conditions')
                .insert(conditions.map((c: any) => ({
                    rule_id: activeRuleId,
                    business_id: businessId,
                    type: c.type,
                    target_id: (c.target_id && c.target_id.trim() !== "") ? c.target_id : "GLOBAL",
                    branch_id: c.branch_id || "GLOBAL",
                    quantity_min: 1
                })));
            if (cError) throw new Error(`Condition Deployment Error: ${cError.message}`);
        }

        if (actions.length > 0) {
            const { error: aError } = await supabase
                .from('pricing_rule_actions')
                .insert(actions.map((a: any) => ({
                    rule_id: activeRuleId,
                    business_id: businessId,
                    type: a.type,
                    value: Number(a.value) || 0,
                    currency_code: a.currency_code || 'USD'
                })));
            if (aError) throw new Error(`Action Deployment Error: ${aError.message}`);
        }

        revalidatePath('/sales/pricing-rules');
        return { 
            success: true, 
            message: `Enterprise Node ${activeRuleId.split('-')[0]} successfully committed to production.`,
            nodeId: activeRuleId,
            timestamp: syncTimestamp
        };

    } catch (error: any) {
        return { success: false, message: `Deployment Failed: ${error.message}`, timestamp: syncTimestamp };
    }
}

/**
 * PRICING RULE DELETION
 * Restored function to fix build errors.
 */
export async function deletePricingRule(id: string) {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Authentication required.");

        const { data: profile } = await supabase.from('profiles').select('business_id').eq('id', user.id).single();
        if (!profile?.business_id) throw new Error("Security check failed.");

        const { error } = await supabase
            .from('pricing_rules')
            .delete()
            .eq('id', id)
            .eq('tenant_id', profile.business_id);

        if (error) throw error;

        revalidatePath('/sales/pricing-rules');
        return { success: true };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}