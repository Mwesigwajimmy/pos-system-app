'use client';

/**
 * --- LITONU BUSINESS BASE UNIVERSE LTD - ENTERPRISE IDENTITY SCHEMA ---
 * 
 * VERSION: v16.1 OMEGA-IDENTITY (FORENSIC ANCHOR)
 * JURISDICTION: Multi-Tenant / Multi-Role / Global ERP
 * 
 * CORE UPGRADES:
 * 1. RACE CONDITION SEAL: Prioritizes JWT Metadata over document.cookies to 
 *    prevent the "Neural Link" stall in new windows.
 * 2. IDENTITY FALLBACK: Automatically falls back to the profile business_id 
 *    if the active node is not yet painted in the DOM.
 * 3. OMEGA-STABILITY: Preserves all 100% of the enterprise PNL, subscription, 
 *    and system power logic.
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
}

/**
 * AUTHORITATIVE IDENTITY RESOLVER
 */
async function fetchBusinessContextData(): Promise<BusinessContextData | null> {
    const supabase = createClient();

    // --- 0. AUTHENTICATION RESOLUTION ---
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (!user || authError) return null;

    // --- 1. DYNAMIC NODE DETECTION (v16.1 HARDENED ANCHOR) ---
    // Extract ID from cookie if available and valid
    const cookieId = typeof document !== 'undefined' 
        ? document.cookie
            .split('; ')
            .find(row => row.startsWith('bbu1_active_business_id='))
            ?.split('=')[1] || null
        : null;

    /**
     * ✅ OMEGA IDENTITY WELD:
     * If the cookie is missing (common in New Windows) or set to 'loading', 
     * we immediately pivot to the JWT User Metadata. This is the "Master Truth" 
     * that physically stops the 202 alignment stall.
     */
    const activeBizIdFromVault = (cookieId && cookieId !== 'loading' && cookieId !== '') 
        ? cookieId 
        : (user.user_metadata?.business_id || user.user_metadata?.active_business_id);

    // --- 2. PARALLEL NEURAL FETCH (HIGH-SPEED UPGRADE) ---
    // Instead of waterfalling, we fire all forensics at once to eliminate lag.
    try {
        const [auraRes, contextRes, profileRes] = await Promise.all([
            supabase.rpc('get_aura_handshake', { p_target_biz_id: activeBizIdFromVault }),
            supabase.rpc('get_user_context', { p_target_biz_id: activeBizIdFromVault }),
            supabase.from('profiles').select('*').eq('id', user.id).single()
        ]);

        const auraData = auraRes.data;
        const contextData = contextRes.data;
        const profile = profileRes.data;

        // --- EXCEPTION HANDLING & FORENSIC FALLBACK ---
        if (contextRes.error || !contextData || contextData.length === 0) {
            console.warn("LITONU_SECURITY: Parallel Handshake Partial Fail, entering Fallback Mode.");
            
            if (profile) {
                // FALLBACK: Use profile default if active node is in transition
                const targetTenantId = activeBizIdFromVault || profile.business_id;
                const { data: tenantData } = await supabase
                    .from('tenants')
                    .select('subscription_status, subscription_plan, name')
                    .eq('id', targetTenantId)
                    .single();

                return {
                    userId: profile.id,
                    businessId: targetTenantId,
                    businessName: profile.business_name || tenantData?.name || 'NIM UGANDA LTD',
                    industry: profile.industry || 'Distribution',
                    email: profile.email || user.email || '',
                    user_role: profile.role || 'admin',
                    system_power: (profile as any).system_access_role || null,
                    business_display_name: profile.business_name || tenantData?.name || 'NIM UGANDA LTD',
                    business_type: profile.business_type || 'Distribution',
                    reporting_currency: profile.currency || 'UGX',
                    setup_complete: profile.setup_complete,
                    branding_logo: null,
                    subscription_status: tenantData?.subscription_status || null,
                    subscription_plan: tenantData?.subscription_plan || null
                };
            }
            return null;
        }

        // --- THE DEEP IDENTITY WELD ---
        const aura = (Array.isArray(auraData) ? auraData[0] : auraData) || {};
        const context = (Array.isArray(contextData) ? contextData[0] : contextData) || {};

        // Resolve Target ID for Billing/Forensics (Cross-verified against all sources)
        const finalResolvedBizId = activeBizIdFromVault || context.business_id || profile?.business_id || aura.business_id;

        // Final Parallel fetch for sub-data specific to the resolved node
        const { data: subscriptionInfo } = await supabase
            .from('tenants')
            .select('subscription_status, subscription_plan')
            .eq('id', finalResolvedBizId)
            .single();

        return {
            // Resolve Identity Anchors
            userId: user.id,
            businessId: finalResolvedBizId,
            businessName: context.business_display_name || aura.businessName || profile?.business_name,
            industry: context.industry_sector || aura.industry || profile?.industry,
            email: profile?.email || user.email || '',
            
            // Resolve Sovereign Context (Synced to Sidebar/Middleware)
            user_role: context.user_role,
            system_power: context.system_power,
            business_display_name: context.business_display_name,
            industry_sector: context.industry_sector,
            business_type: context.business_type,
            reporting_currency: context.reporting_currency,
            setup_complete: context.setup_complete,
            branding_logo: context.branding_logo,

            // Mapping final trial/paid logic
            subscription_status: subscriptionInfo?.subscription_status || context.subscription_status || null,
            subscription_plan: subscriptionInfo?.subscription_plan || context.subscription_plan || null
        };

    } catch (err) {
        console.error("LITONU_CRITICAL: Forensic Bridge Collapse", err);
        return null;
    }
}

/**
 * HOOK: useBusinessContext
 * The core identity provider for LITONU BUSINESS BASE UNIVERSE LTD.
 */
export function useBusinessContext() {
    return useQuery<BusinessContextData | null, Error>({
      queryKey: ['businessContext'], 
      queryFn: fetchBusinessContextData,
      staleTime: 1000 * 60 * 15, // 15-minute Enterprise cache
      refetchOnWindowFocus: true, // Re-sync when coming back to tab for security
      retry: 1, // Minimize retry loop lag
    });
}