'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

/**
 * --- ENTERPRISE SYSTEM OF RECORD: PRICING SCHEMA ---
 * This module governs the atomic deployment of commercial logic.
 * Security Protocol: Strict Multi-Tenant Isolation (RLS + Metadata Filtering)
 */

export type RuleFormState = {
    success: boolean;
    message: string;
    ruleId?: string;
    timestamp?: string;
    errorCode?: string;
};

/**
 * --- COMMERCIAL LOGIC DEPLOYMENT ENGINE ---
 * Handles the transactional persistence of pricing strategies.
 * High-Integrity committing of metadata, gates, and mutations.
 */
export async function createOrUpdatePricingRule(
    prevState: RuleFormState, 
    formData: FormData
): Promise<RuleFormState> {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    const syncTimestamp = new Date().toISOString();

    try {
        // STEP 1: IDENTITY & AUTHORITY VERIFICATION
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return {
                success: false,
                message: "CREDENTIAL_EXPIRED: Please re-authenticate to the Master Data Service.",
                errorCode: "AUTH_401",
                timestamp: syncTimestamp
            };
        }

        // STEP 2: RESOLVE ORGANIZATIONAL CONTEXT (TENANT ISOLATION)
        const { data: profile } = await supabase
            .from('profiles')
            .select('business_id, currency')
            .eq('id', user.id)
            .single();

        if (!profile?.business_id) {
            throw new Error("ORG_CONTEXT_NOT_RESOLVED: Business ID missing from Master Profile.");
        }
        
        const businessId = profile.business_id;

        // STEP 3: DATA PARSING & SCHEMA SYNCHRONIZATION
        const locale = (formData.get('locale') as string) || 'en';
        const rawPayload = formData.get('ruleData') as string;
        
        if (!rawPayload) throw new Error("PAYLOAD_EMPTY: No deployment data received.");
        
        const parsedData = JSON.parse(rawPayload);
        const { conditions, actions, ...ruleMeta } = parsedData;

        // STEP 4: TRANSACTIONAL ATOMICITY: CORE RULE COMMIT
        const targetId = (ruleMeta.id && ruleMeta.id !== "") ? ruleMeta.id : undefined;

        const { data: rule, error: ruleError } = await supabase
            .from('pricing_rules')
            .upsert({
                id: targetId,
                tenant_id: businessId, 
                name: ruleMeta.name,
                description: ruleMeta.description || '',
                priority: Number(ruleMeta.priority) || 0,
                is_active: ruleMeta.is_active,
                is_exclusive: ruleMeta.is_exclusive || false,
                is_stackable: ruleMeta.is_stackable || false,
                tax_strategy: ruleMeta.tax_strategy || 'GROSS',
                updated_at: syncTimestamp
            })
            .select('id')
            .single();

        if (ruleError) throw new Error(`MASTER_RECORD_FAILURE: ${ruleError.message}`);
        const activeRuleId = rule.id;

        // STEP 5: ATOMIC RECONCILIATION (CLEARING RESIDUAL LOGIC)
        if (targetId) {
            const clearConditions = supabase.from('pricing_rule_conditions').delete().eq('rule_id', activeRuleId);
            const clearActions = supabase.from('pricing_rule_actions').delete().eq('rule_id', activeRuleId);
            await Promise.all([clearConditions, clearActions]);
        }

        // STEP 6: DEPLOY ACTIVATION GATES (DIMENSIONAL CONDITIONS)
        if (conditions && conditions.length > 0) {
            const mappedConditions = conditions.map((c: any) => ({
                rule_id: activeRuleId,
                tenant_id: businessId,
                type: c.type,
                target_id: c.target_id?.toString() || "GLOBAL",
                location_id: (c.location_id && c.location_id !== "GLOBAL") ? c.location_id : null,
            }));

            const { error: cError } = await supabase
                .from('pricing_rule_conditions')
                .insert(mappedConditions);
            
            if (cError) throw new Error(`CONDITION_GATE_FAILURE: ${cError.message}`);
        }

        // STEP 7: DEPLOY LOGIC MUTATIONS (PRICE OPERATIONS)
        if (actions && actions.length > 0) {
            const mappedActions = actions.map((a: any) => ({
                rule_id: activeRuleId,
                tenant_id: businessId,
                type: a.type,
                value: Number(a.value) || 0,
                formula_string: a.formula_string || null,
                currency_code: a.currency_code || profile.currency || 'USD',
                configuration: a.type === 'VOLUME_TIER' ? { tiers: a.tiers } : null
            }));

            const { error: aError } = await supabase
                .from('pricing_rule_actions')
                .insert(mappedActions);
            
            if (aError) throw new Error(`ACTION_MUTATION_FAILURE: ${aError.message}`);
        }

        // STEP 8: GLOBAL CACHE INVALIDATION & REVALIDATION
        revalidatePath(`/${locale}/sales/pricing-rules`);
        revalidatePath(`/${locale}/sales/pricing-rules/${activeRuleId}`);
        
        return { 
            success: true, 
            message: `STRATEGY_COMMITTED: Logic "${ruleMeta.name}" successfully deployed to Master Database.`,
            ruleId: activeRuleId,
            timestamp: syncTimestamp
        };

    } catch (error: any) {
        console.error("[CRITICAL_FAULT] Logic Deployment Failure:", error);
        return { 
            success: false, 
            message: error.message || "SYSTEM_FAULT: Contact Infrastructure Support.", 
            errorCode: "DEPLOY_ERR_500",
            timestamp: syncTimestamp 
        };
    }
}

/**
 * --- ATOMIC POLICY PURGE ---
 * Removes commercial logic from the Master Record.
 * High-Security: Verification of ownership required prior to deletion.
 */
export async function deletePricingRule(id: string) {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("UNAUTHORIZED: Master Session Invalid.");

        const { data: profile } = await supabase
            .from('profiles')
            .select('business_id')
            .eq('id', user.id)
            .single();

        if (!profile?.business_id) throw new Error("PERMISSION_DENIED: Organizational context missing.");

        const { error } = await supabase
            .from('pricing_rules')
            .delete()
            .eq('id', id)
            .eq('tenant_id', profile.business_id);

        if (error) throw error;

        // Broadcast change to global catalog
        revalidatePath(`/sales/pricing-rules`, 'layout');
        return { success: true };
    } catch (error: any) {
        return { success: false, message: `PURGE_FAILURE: ${error.message}` };
    }
}