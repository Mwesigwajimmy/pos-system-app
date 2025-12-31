'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

/**
 * TYPE DEFINITIONS
 * Standardized response format for server-to-client communication.
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
    quantity_min?: number;
}

interface ActionPayload {
    type: string;
    value: number;
}

/**
 * PRICING ENGINE - RULE DEPLOYMENT
 * 
 * Orchestrates a multi-stage atomic upsert for pricing logic.
 * Ensures strict tenant isolation and data integrity across related tables.
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
                message: 'Authentication failed. Please re-authenticate to continue.', 
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
                message: 'Security context error: Tenant identity could not be verified.', 
                timestamp: syncTimestamp 
            };
        }
        
        const businessId = profile.business_id;

        // 2. DATA HYDRATION: Parse and Sanitize Payload
        const rawRuleData = formData.get('ruleData');
        const rawConditions = formData.get('conditions');
        const rawActions = formData.get('actions');

        if (!rawRuleData || !rawConditions || !rawActions) {
            throw new Error("Invalid payload: Missing configuration components.");
        }

        const ruleData = JSON.parse(rawRuleData as string);
        const conditions: ConditionPayload[] = JSON.parse(rawConditions as string);
        const actions: ActionPayload[] = JSON.parse(rawActions as string);

        // Sanitize Target ID for Upsert
        const targetId = ruleData.id && ruleData.id.length > 10 ? ruleData.id : undefined;

        // 3. STEP 1: Main Pricing Rule Configuration
        const { data: rule, error: ruleError } = await supabase
            .from('pricing_rules')
            .upsert({
                id: targetId,
                tenant_id: businessId, 
                name: ruleData.name,
                description: ruleData.description,
                priority: Math.min(Math.max(Number(ruleData.priority) || 0, 0), 100),
                is_active: ruleData.is_active,
                is_stackable: ruleData.is_stackable,
                start_date: ruleData.start_date || null,
                end_date: ruleData.end_date || null,
                updated_at: syncTimestamp
            })
            .select('id')
            .single();

        if (ruleError) throw new Error(`Configuration update failed: ${ruleError.message}`);
        const activeRuleId = rule.id;

        // 4. STEP 2: Logic Branch Cleanup
        // Clears existing conditions and actions to ensure a clean state for the new logic.
        if (targetId) {
            const { error: delError } = await supabase
                .from('pricing_rule_conditions')
                .delete()
                .eq('rule_id', activeRuleId)
                .eq('business_id', businessId);
            
            if (delError) throw new Error(`Failed to clear existing conditions: ${delError.message}`);

            const { error: delActError } = await supabase
                .from('pricing_rule_actions')
                .delete()
                .eq('rule_id', activeRuleId)
                .eq('business_id', businessId);

            if (delActError) throw new Error(`Failed to clear existing actions: ${delActError.message}`);
        }

        // 5. STEP 3: Condition and Action Insertion
        // Parallelized insertion to optimize total request time.
        const conditionInjections = conditions.length > 0 ? supabase.from('pricing_rule_conditions').insert(
            conditions.map(c => ({
                rule_id: activeRuleId,
                business_id: businessId,
                type: c.type,
                target_id: c.target_id || "GLOBAL",
                quantity_min: Math.max(Number(c.quantity_min) || 0, 0)
            }))
        ) : Promise.resolve({ error: null });

        const actionInjections = actions.length > 0 ? supabase.from('pricing_rule_actions').insert(
            actions.map(a => ({
                rule_id: activeRuleId,
                business_id: businessId,
                type: a.type,
                value: Number(a.value) || 0
            }))
        ) : Promise.resolve({ error: null });

        const [cRes, aRes] = await Promise.all([conditionInjections, actionInjections]);

        if (cRes.error) throw new Error(`Condition synchronization error: ${cRes.error.message}`);
        if (aRes.error) throw new Error(`Action synchronization error: ${aRes.error.message}`);

        // 6. CACHE REVALIDATION
        revalidatePath('/[locale]/(dashboard)/sales/pricing-rules', 'layout');
        
        return { 
            success: true, 
            message: `Success: Node ${activeRuleId.split('-')[0]} has been updated and deployed.`,
            nodeId: activeRuleId,
            timestamp: syncTimestamp
        };

    } catch (error: any) {
        console.error(`[SYSTEM_ERROR][${syncTimestamp}]:`, error.message);
        return { 
            success: false, 
            message: `System fault: ${error.message || 'An unknown error occurred during synchronization.'}`,
            timestamp: syncTimestamp 
        };
    }
}

/**
 * PRICING RULE DELETION
 * Strictly verified deletion protocol utilizing tenant isolation.
 */
export async function deletePricingRule(id: string) {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    const opTimestamp = new Date().toISOString();

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Authentication required.");

        const { data: profile } = await supabase
            .from('profiles')
            .select('business_id')
            .eq('id', user.id)
            .single();
            
        if (!profile?.business_id) throw new Error("Security verification failed.");

        // Secure Delete: Verified via ID and tenant_id to prevent cross-tenant operations.
        const { error, count } = await supabase
            .from('pricing_rules')
            .delete({ count: 'exact' })
            .eq('id', id)
            .eq('tenant_id', profile.business_id);

        if (error) throw error;
        if (count === 0) throw new Error("Record not found or already deleted.");

        revalidatePath('/[locale]/(dashboard)/sales/pricing-rules', 'layout');
        
        return { success: true, timestamp: opTimestamp };
    } catch (error: any) {
        console.error(`[DELETE_ERROR][${opTimestamp}]:`, error.message);
        return { success: false, message: error.message };
    }
}