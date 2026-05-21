'use client';

/**
 * --- LITONU BUSINESS BASE UNIVERSE LTD - ENTERPRISE IDENTITY SCHEMA ---
 * 
 * VERSION: v16.2 OMEGA-IDENTITY (THE MASTER ANCHOR)
 * JURISDICTION: Multi-Tenant / Multi-Role / Global ERP
 * 
 * CORE UPGRADES:
 * 1. RPC PARAMETER WELD: Physically passes both BusinessID and UserID to the 
 *    handshake RPC. This ensures the Director Identity is never 'ANON'.
 * 2. DATA KEY ALIGNMENT: Resolves the snake_case vs camelCase collision between 
 *    Postgres and the Aura Brain. Maps 'businessId' and 'userId' correctly.
 * 3. OMNISCIENT READY SIGNAL: Injects 'is_ready' and 'brain_status' into the 
 *    returned context to satisfy the v17.7 Sanctuary mount requirements.
 * 4. HYDRATION GUARD: Hardened null-checks for document.cookie to prevent 
 *    Next.js 15 pre-rendering crashes.
 */

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

export interface BusinessContextData {
  userId: string;
  businessId: string;
  businessName: string;
  industry: string;
  country?: string;
  email: string; 
  
  // --- DEEP SOVEREIGN EXTENSIONS ---
  user_role: string;
  system_power: string | null;
  business_display_name: string;
  industry_sector: string;
  business_type: string;
  reporting_currency: string;
  setup_complete: boolean;
  branding_logo: string | null;

  // --- SUBSCRIPTION KEYS ---
  subscription_status: string | null;
  subscription_plan: string | null;

  // --- AURA NEURAL STATUS ---
  is_ready: boolean;
  brain_status: string;
}

/**
 * AUTHORITATIVE IDENTITY RESOLVER
 */
async function fetchBusinessContextData(): Promise<BusinessContextData | null> {
    const supabase = createClient();

    // --- 0. AUTHENTICATION RESOLUTION ---
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (!user || authError) return null;

    // --- 1. DYNAMIC NODE DETECTION (v16.2 HARDENED) ---
    const cookieId = typeof document !== 'undefined' 
        ? document.cookie
            .split('; ')
            .find(row => row.startsWith('bbu1_active_business_id='))
            ?.split('=')[1] || null
        : null;

    // PRIORITIZE JWT: This kills the "New Window" race condition immediately
    const activeBizIdFromVault = (cookieId && cookieId !== 'loading' && cookieId !== '') 
        ? cookieId 
        : (user.user_metadata?.business_id || user.user_metadata?.active_business_id);

    // --- 2. PARALLEL NEURAL FETCH (HIGH-SPEED UPGRADE) ---
    try {
        const [auraRes, contextRes, profileRes] = await Promise.all([
            // Pass both parameters to ensure Director ID is anchored
            supabase.rpc('get_aura_handshake', { 
                p_target_biz_id: activeBizIdFromVault,
                p_user_id: user.id 
            }),
            supabase.rpc('get_user_context', { 
                p_target_biz_id: activeBizIdFromVault,
                p_user_id: user.id
            }),
            supabase.from('profiles').select('*').eq('id', user.id).single()
        ]);

        const auraData = (Array.isArray(auraRes.data) ? auraRes.data[0] : auraRes.data) || {};
        const contextData = (Array.isArray(contextRes.data) ? contextRes.data[0] : contextRes.data) || {};
        const profile = profileRes.data;

        // --- EXCEPTION HANDLING & FORENSIC FALLBACK ---
        if (contextRes.error || !contextData || Object.keys(contextData).length === 0) {
            console.warn("LITONU_SECURITY: Parallel Handshake Partial Fail, entering Fallback Mode.");
            
            if (profile) {
                const targetTenantId = activeBizIdFromVault || profile.business_id;
                const { data: tenantData } = await supabase
                    .from('tenants')
                    .select('subscription_status, subscription_plan, name, industry, currency_code')
                    .eq('id', targetTenantId)
                    .single();

                return {
                    userId: profile.id,
                    businessId: targetTenantId,
                    businessName: profile.business_name || tenantData?.name || 'Sovereign Entity',
                    industry: profile.industry || tenantData?.industry || 'General',
                    email: profile.email || user.email || '',
                    user_role: profile.role || 'admin',
                    system_power: (profile as any).system_access_role || null,
                    business_display_name: profile.business_name || tenantData?.name || 'Sovereign Entity',
                    industry_sector: profile.industry || tenantData?.industry || 'General',
                    business_type: profile.business_type || 'General',
                    reporting_currency: profile.currency || tenantData?.currency_code || 'UGX',
                    setup_complete: profile.setup_complete,
                    branding_logo: null,
                    subscription_status: tenantData?.subscription_status || null,
                    subscription_plan: tenantData?.subscription_plan || null,
                    is_ready: !!auraData.is_ready,
                    brain_status: auraData.status || 'SYNCING'
                };
            }
            return null;
        }

        // --- THE DEEP IDENTITY WELD (v16.2 PRECISION) ---
        // We map the snake_case DB fields to the camelCase AI expectation
        const finalResolvedBizId = activeBizIdFromVault || contextData.business_id || profile?.business_id || auraData.businessId;

        // Final Parallel fetch for sub-data specific to the resolved node
        const { data: subscriptionInfo } = await supabase
            .from('tenants')
            .select('subscription_status, subscription_plan')
            .eq('id', finalResolvedBizId)
            .single();

        return {
            // Identity Anchors
            userId: user.id,
            businessId: finalResolvedBizId,
            businessName: contextData.business_display_name || auraData.businessName || profile?.business_name,
            industry: contextData.industry_sector || auraData.industry || profile?.industry,
            email: profile?.email || user.email || '',
            
            // Sovereign Context
            user_role: contextData.user_role,
            system_power: contextData.system_power,
            business_display_name: contextData.business_display_name,
            industry_sector: contextData.industry_sector,
            business_type: contextData.business_type,
            reporting_currency: contextData.reporting_currency,
            setup_complete: contextData.setup_complete,
            branding_logo: contextData.branding_logo,

            // Subscription logic
            subscription_status: subscriptionInfo?.subscription_status || contextData.subscription_status || null,
            subscription_plan: subscriptionInfo?.subscription_plan || contextData.subscription_plan || null,

            // AI Readyness Signal
            is_ready: !!auraData.is_ready,
            brain_status: auraData.status || 'READY'
        };

    } catch (err) {
        console.error("LITONU_CRITICAL: Forensic Bridge Collapse", err);
        return null;
    }
}

/**
 * HOOK: useBusinessContext
 * The authoritative identity provider.
 */
export function useBusinessContext() {
    return useQuery<BusinessContextData | null, Error>({
      queryKey: ['businessContext'], 
      queryFn: fetchBusinessContextData,
      staleTime: 1000 * 60 * 15, 
      refetchOnWindowFocus: true, 
      retry: 1, 
    });
}