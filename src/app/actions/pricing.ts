'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

/**
 * ENTERPRISE TELEMETRY TYPES
 */
export type RuleFormState = {
    success: boolean;
    message: string;
    nodeId?: string;
    timestamp?: string;
};

// Internal Interfaces for Strict Type Safety
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
 * PRICING ENGINE - GLOBAL LOGIC DEPLOYMENT
 * 
 * Performs a multi-stage atomic upsert of pricing logic. 
 * Designed for high-concurrency enterprise environments with strict tenant isolation.
 */
export async function createOrUpdatePricingRule(
    prevState: RuleFormState, 
    formData: FormData
): Promise<RuleFormState> {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    const syncTimestamp = new Date().toISOString();

    try {
        // 1. SECURITY: Identity & Multi-Tenant Verification
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return { success: false, message: 'CRITICAL_AUTH_FAILURE: Identity could not be verified.', timestamp: syncTimestamp };
        }

        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('business_id')
            .eq('id', user.id)
            .single();

        if (profileError || !profile?.business_id) {
            return { success: false, message: 'TENANT_ISOLATION_ERROR: Access denied to local cluster nodes.', timestamp: syncTimestamp };
        }
        
        const businessId = profile.business_id;

        // 2. DATA HYDRATION & SANITIZATION
        const rawRuleData = formData.get('ruleData');
        const rawConditions = formData.get('conditions');
        const rawActions = formData.get('actions');

        if (!rawRuleData || !rawConditions || !rawActions) {
            throw new Error("MALFORMED_PAYLOAD: Missing required engine configuration components.");
        }

        const ruleData = JSON.parse(rawRuleData as string);
        const conditions: ConditionPayload[] = JSON.parse(rawConditions as string);
        const actions: ActionPayload[] = JSON.parse(rawActions as string);

        // UUID Sanitization Protocol
        const targetId = ruleData.id && ruleData.id.length > 10 ? ruleData.id : undefined;

        console.log(`[PRICING_ENGINE] Syncing Logic Node: ${targetId || 'NEW_NODE'} for Tenant: ${businessId}`);

        // 3. ATOMIC STEP 1: Rule Configuration Upsert
        // We include tenant_id in the upsert to satisfy RLS (Row Level Security) and prevent cross-tenant writes
        const { data: rule, error: ruleError } = await supabase
            .from('pricing_rules')
            .upsert({
                id: targetId,
                tenant_id: businessId, 
                name: ruleData.name,
                description: ruleData.description,
                priority: Math.min(Math.max(Number(ruleData.priority) || 0, 0), 100), // Clamp priority 0-100
                is_active: ruleData.is_active,
                is_stackable: ruleData.is_stackable,
                start_date: ruleData.start_date || null,
                end_date: ruleData.end_date || null,
                updated_at: syncTimestamp
            })
            .select('id')
            .single();

        if (ruleError) throw new Error(`RULE_SYNC_FAILED: ${ruleError.message}`);
        const activeRuleId = rule.id;

        // 4. ATOMIC STEP 2: Logic Branch Cleanup (Only on Updates)
        // This ensures the "Logic Execution Stack" is clean before re-injecting predicates.
        if (targetId) {
            const { error: delError } = await supabase
                .from('pricing_rule_conditions')
                .delete()
                .eq('rule_id', activeRuleId)
                .eq('business_id', businessId); // Double-verify tenant for security
            
            if (delError) throw new Error(`CLEANUP_FAILED_CONDITIONS: ${delError.message}`);

            const { error: delActError } = await supabase
                .from('pricing_rule_actions')
                .delete()
                .eq('rule_id', activeRuleId)
                .eq('business_id', businessId);

            if (delActError) throw new Error(`CLEANUP_FAILED_ACTIONS: ${delActError.message}`);
        }

        // 5. ATOMIC STEP 3: Predicate Logic & Mutation Injection
        // Parallel injection for performance
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

        if (cRes.error) throw new Error(`PREDICATE_SYNC_ERROR: ${cRes.error.message}`);
        if (aRes.error) throw new Error(`MUTATION_SYNC_ERROR: ${aRes.error.message}`);

        // 6. CACHE PROPAGATION
        revalidatePath('/[locale]/(dashboard)/sales/pricing-rules', 'layout');
        
        return { 
            success: true, 
            message: `LOGIC_PROPAGATED: Node ${activeRuleId.split('-')[0]} successfully integrated into the global stack.`,
            nodeId: activeRuleId,
            timestamp: syncTimestamp
        };

    } catch (error: any) {
        // Structured Enterprise Error Logging
        console.error(`[CRITICAL_ENGINE_ERROR][${syncTimestamp}]:`, error.message);
        
        return { 
            success: false, 
            message: `ENGINE_FAULT: ${error.message || 'Unknown system synchronization error.'}`,
            timestamp: syncTimestamp 
        };
    }
}

/**
 * ATOMIC RULE DECOMMISSIONING
 * Implements a strict "Check-then-Delete" protocol to ensure multi-tenant integrity.
 */
export async function deletePricingRule(id: string) {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    const opTimestamp = new Date().toISOString();

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("AUTH_REQUIRED");

        const { data: profile } = await supabase
            .from('profiles')
            .select('business_id')
            .eq('id', user.id)
            .single();
            
        if (!profile?.business_id) throw new Error("SECURITY_CONTEXT_MISSING");

        // Secured Deletion: The 'eq' on tenant_id is the primary defense against ID-guessing attacks
        const { error, count } = await supabase
            .from('pricing_rules')
            .delete({ count: 'exact' })
            .eq('id', id)
            .eq('tenant_id', profile.business_id);

        if (error) throw error;
        if (count === 0) throw new Error("NODE_NOT_FOUND: Record may have already been decommissioned.");

        revalidatePath('/[locale]/(dashboard)/sales/pricing-rules', 'layout');
        
        return { success: true, timestamp: opTimestamp };
    } catch (error: any) {
        console.error(`[DECOMMISSION_ERROR][${opTimestamp}]:`, error.message);
        return { success: false, message: error.message };
    }
}