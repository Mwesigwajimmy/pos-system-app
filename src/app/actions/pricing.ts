'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

export type RuleFormState = {
    success: boolean;
    message: string;
    ruleId?: string;
    timestamp?: string;
};

/**
 * PRICING RULE PERSISTENCE ENGINE
 * Handles atomic upsert of pricing logic with strict multi-tenant isolation.
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
        if (!user) throw new Error("Your session has expired. Please log in again.");

        // Resolve business context
        const { data: profile } = await supabase
            .from('profiles')
            .select('business_id, currency')
            .eq('id', user.id)
            .single();

        if (!profile?.business_id) throw new Error("Business profile not resolved.");
        
        const businessId = profile.business_id;
        const ruleData = JSON.parse(formData.get('ruleData') as string);
        const conditions = JSON.parse(formData.get('conditions') as string);
        const actions = JSON.parse(formData.get('actions') as string);

        const targetId = (ruleData.id && ruleData.id !== "") ? ruleData.id : undefined;

        // 1. Core Rule Persistence
        const { data: rule, error: ruleError } = await supabase
            .from('pricing_rules')
            .upsert({
                id: targetId,
                tenant_id: businessId, 
                name: ruleData.name,
                description: ruleData.description || '',
                priority: Number(ruleData.priority) || 0,
                is_active: ruleData.is_active,
                is_exclusive: ruleData.is_exclusive || false,
                tax_strategy: ruleData.tax_strategy || 'GROSS',
                updated_at: syncTimestamp
            })
            .select('id')
            .single();

        if (ruleError) throw new Error(`Database Error: ${ruleError.message}`);
        const activeRuleId = rule.id;

        // 2. Clear Existing Logic (Atomic Reset)
        if (targetId) {
            await supabase.from('pricing_rule_conditions').delete().eq('rule_id', activeRuleId);
            await supabase.from('pricing_rule_actions').delete().eq('rule_id', activeRuleId);
        }

        // 3. Deploy Activation Gates (Conditions)
        if (conditions.length > 0) {
            const { error: cError } = await supabase
                .from('pricing_rule_conditions')
                .insert(conditions.map((c: any) => ({
                    rule_id: activeRuleId,
                    business_id: businessId,
                    type: c.type,
                    target_id: c.target_id?.toString() || "GLOBAL",
                    // Map 'GLOBAL' to null for UUID column compatibility
                    location_id: (c.location_id && c.location_id !== "GLOBAL") ? c.location_id : null,
                })));
            if (cError) throw new Error(`Failed to save activation gates: ${cError.message}`);
        }

        // 4. Deploy Logic Mutations (Actions)
        if (actions.length > 0) {
            const { error: aError } = await supabase
                .from('pricing_rule_actions')
                .insert(actions.map((a: any) => ({
                    rule_id: activeRuleId,
                    business_id: businessId,
                    type: a.type,
                    value: Number(a.value) || 0,
                    formula_string: a.formula_string || null,
                    currency_code: a.currency_code || profile.currency || 'USD',
                    // Handling tiers if present
                    configuration: a.tiers ? { tiers: a.tiers } : null
                })));
            if (aError) throw new Error(`Failed to save logic outcomes: ${aError.message}`);
        }

        revalidatePath('/sales/pricing-rules');
        
        return { 
            success: true, 
            message: `Pricing rule "${ruleData.name}" has been successfully deployed.`,
            ruleId: activeRuleId,
            timestamp: syncTimestamp
        };

    } catch (error: any) {
        console.error("Pricing Deployment Failure:", error);
        return { 
            success: false, 
            message: error.message || "An unexpected error occurred during deployment.", 
            timestamp: syncTimestamp 
        };
    }
}

/**
 * ATOMIC RULE DELETION
 */
export async function deletePricingRule(id: string) {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Authentication required.");

        const { data: profile } = await supabase.from('profiles').select('business_id').eq('id', user.id).single();
        if (!profile?.business_id) throw new Error("Unauthorized access.");

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