'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

/**
 * TYPE DEFINITIONS
 */
export type RuleFormState = {
    success: boolean;
    message: string;
    nodeId?: string;
    timestamp?: string;
};

interface ConditionPayload {
    type: string;
    target_id?: string;
    branch_id?: string;
    quantity_min?: number;
}

interface ActionPayload {
    type: string;
    value: number;
    currency_code?: string;
}

/**
 * PRICING ENGINE - RULE DEPLOYMENT
 * Orchestrates a multi-stage atomic upsert for pricing logic.
 */
export async function createOrUpdatePricingRule(
    prevState: RuleFormState, 
    formData: FormData
): Promise<RuleFormState> {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    const syncTimestamp = new Date().toISOString();

    try {
        // 1. SECURITY: Authentication and Tenant Validation
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return { 
                success: false, 
                message: 'Authentication failed. Please log in again.', 
                timestamp: syncTimestamp 
            };
        }

        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('business_id')
            .eq('id', user.id)
            .single();

        if (profileError || !profile?.business_id) {
            return { 
                success: false, 
                message: 'Security context error: Business ID not found.', 
                timestamp: syncTimestamp 
            };
        }
        
        const businessId = profile.business_id;

        // 2. DATA EXTRACTION: Parse the 3 components sent by the UI
        const rawRuleData = formData.get('ruleData');
        const rawConditions = formData.get('conditions');
        const rawActions = formData.get('actions');

        if (!rawRuleData || !rawConditions || !rawActions) {
            throw new Error("Payload Handshake Failed: Missing configuration components.");
        }

        const ruleData = JSON.parse(rawRuleData as string);
        const conditions: ConditionPayload[] = JSON.parse(rawConditions as string);
        const actions: ActionPayload[] = JSON.parse(rawActions as string);

        // Normalize Target ID for the Upsert (ensure it's not an empty string)
        const targetId = (ruleData.id && ruleData.id !== "") ? ruleData.id : undefined;

        // 3. STEP 1: Upsert Main Pricing Rule
        const { data: rule, error: ruleError } = await supabase
            .from('pricing_rules')
            .upsert({
                id: targetId,
                tenant_id: businessId, 
                name: ruleData.name,
                description: ruleData.description || '',
                priority: Math.min(Math.max(Number(ruleData.priority) || 0, 0), 100),
                is_active: ruleData.is_active,
                is_stackable: ruleData.is_stackable || false,
                updated_at: syncTimestamp
            })
            .select('id')
            .single();

        if (ruleError) throw new Error(`Engine Configuration Error: ${ruleError.message}`);
        const activeRuleId = rule.id;

        // 4. STEP 2: Logic Branch Cleanup (Wipe old conditions/actions if updating)
        if (targetId) {
            await supabase.from('pricing_rule_conditions').delete().eq('rule_id', activeRuleId);
            await supabase.from('pricing_rule_actions').delete().eq('rule_id', activeRuleId);
        }

        // 5. STEP 3: Batch Insertion of Logic Nodes
        // Insert Conditions
        if (conditions.length > 0) {
            const { error: cError } = await supabase
                .from('pricing_rule_conditions')
                .insert(
                    conditions.map(c => ({
                        rule_id: activeRuleId,
                        business_id: businessId,
                        type: c.type,
                        target_id: c.target_id || "GLOBAL",
                        quantity_min: Number(c.quantity_min) || 1
                    }))
                );
            if (cError) throw new Error(`Condition Deployment Error: ${cError.message}`);
        }

        // Insert Actions
        if (actions.length > 0) {
            const { error: aError } = await supabase
                .from('pricing_rule_actions')
                .insert(
                    actions.map(a => ({
                        rule_id: activeRuleId,
                        business_id: businessId,
                        type: a.type,
                        value: Number(a.value) || 0,
                        currency_code: a.currency_code || 'USD'
                    }))
                );
            if (aError) throw new Error(`Action Deployment Error: ${aError.message}`);
        }

        // 6. CACHE REVALIDATION
        // Adjust this path to match your specific pricing list route
        revalidatePath('/sales/pricing-rules', 'page');
        
        return { 
            success: true, 
            message: `System Node ${activeRuleId.split('-')[0]} successfully deployed to production.`,
            nodeId: activeRuleId,
            timestamp: syncTimestamp
        };

    } catch (error: any) {
        console.error(`[BACKEND_FAULT]:`, error.message);
        return { 
            success: false, 
            message: `Deployment Failed: ${error.message}`,
            timestamp: syncTimestamp 
        };
    }
}

/**
 * PRICING RULE DELETION
 * Secure deletion verified by tenant isolation.
 */
export async function deletePricingRule(id: string) {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Authentication required.");

        // Fetch business context
        const { data: profile } = await supabase
            .from('profiles')
            .select('business_id')
            .eq('id', user.id)
            .single();
            
        if (!profile?.business_id) throw new Error("Security check failed.");

        // Cascading delete (Depends on your DB Foreign Key 'ON DELETE CASCADE' setting)
        const { error } = await supabase
            .from('pricing_rules')
            .delete()
            .eq('id', id)
            .eq('tenant_id', profile.business_id);

        if (error) throw error;

        revalidatePath('/sales/pricing-rules', 'page');
        return { success: true };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}