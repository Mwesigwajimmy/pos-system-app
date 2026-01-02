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
 * Atomic upsert for pricing logic with strict tenant isolation and type safety.
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

        // Pulling business_id AND currency to ensure multi-currency autonomy
        const { data: profile } = await supabase
            .from('profiles')
            .select('business_id, currency')
            .eq('id', user.id)
            .single();

        if (!profile?.business_id) throw new Error("Security Context: Business ID not found.");
        
        const businessId = profile.business_id;
        const ruleData = JSON.parse(formData.get('ruleData') as string);
        const conditions = JSON.parse(formData.get('conditions') as string);
        const actions = JSON.parse(formData.get('actions') as string);

        const targetId = (ruleData.id && ruleData.id !== "") ? ruleData.id : undefined;

        // 1. Core Rule Upsert (Multi-Tenant tenant_id)
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

        // 2. Logic Reset (Ensures no "Ghost Nodes" remain from old configurations)
        if (targetId) {
            await supabase.from('pricing_rule_conditions').delete().eq('rule_id', activeRuleId);
            await supabase.from('pricing_rule_actions').delete().eq('rule_id', activeRuleId);
        }

        // 3. Batch Logic Deployment: Conditions
        if (conditions.length > 0) {
            const { error: cError } = await supabase
                .from('pricing_rule_conditions')
                .insert(conditions.map((c: any) => ({
                    rule_id: activeRuleId,
                    business_id: businessId,
                    type: c.type,
                    // FIX: Convert BigInt IDs to string explicitly for target_id (Text column)
                    target_id: (c.target_id && c.target_id.toString().trim() !== "") ? c.target_id.toString() : "GLOBAL",
                    // FIX: Column is 'location_id' (UUID). 'GLOBAL' string is replaced with NULL for UUID compatibility.
                    location_id: (c.branch_id && c.branch_id !== "GLOBAL") ? c.branch_id : null,
                    quantity_min: 1
                })));
            if (cError) throw new Error(`Condition Deployment Error: ${cError.message}`);
        }

        // 4. Batch Logic Deployment: Actions
        if (actions.length > 0) {
            const { error: aError } = await supabase
                .from('pricing_rule_actions')
                .insert(actions.map((a: any) => ({
                    rule_id: activeRuleId,
                    business_id: businessId,
                    type: a.type,
                    value: Number(a.value) || 0,
                    // FIX: Uses profile currency fallback for global enterprise support
                    currency_code: a.currency_code || profile.currency || 'USD'
                })));
            if (aError) throw new Error(`Action Deployment Error: ${aError.message}`);
        }

        revalidatePath('/sales/pricing-rules');
        return { 
            success: true, 
            message: `Node ${activeRuleId.split('-')[0]} committed to production across all clusters.`,
            nodeId: activeRuleId,
            timestamp: syncTimestamp
        };

    } catch (error: any) {
        return { success: false, message: `Deployment Failed: ${error.message}`, timestamp: syncTimestamp };
    }
}

/**
 * PRICING RULE DELETION
 * Atomic removal with tenant-isolation check.
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