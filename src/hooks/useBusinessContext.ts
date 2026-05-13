'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

/**
 * LITONU BUSINESS BASE UNIVERSE LTD - ENTERPRISE IDENTITY SCHEMA
 * 
 * UPGRADE: Deeply integrated context resolution.
 * This interface bridges the Aura AI Handshake with the Sovereign UI Context.
 */
export interface BusinessContextData {
  userId: string;
  businessId: string;
  businessName: string;
  industry: string;
  country?: string;
  email: string; // ADDED: Required for billing handshake
  
  // --- DEEP SOVEREIGN EXTENSIONS ---
  // Mandatory for multi-tenant role filtering and branding resolution
  user_role: string;
  system_power: string | null;
  business_display_name: string;
  industry_sector: string;
  business_type: string;
  reporting_currency: string;
  setup_complete: boolean;
  branding_logo: string | null;

  // --- NEW: SUBSCRIPTION KEYS ---
  // Required for the Subscription Security Gate
  subscription_status: string | null;
  subscription_plan: string | null;
}

/**
 * AUTHORITATIVE IDENTITY RESOLVER
 */
async function fetchBusinessContextData(): Promise<BusinessContextData | null> {
    const supabase = createClient();

    // --- 0. AUTHENTICATION RESOLUTION ---
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // --- MISSING LOGIC: DYNAMIC NODE DETECTION ---
    // We retrieve the active node from the forensic cookie set by the Sidebar/Callback.
    // This ensures the hook stays synced during an 'Identity Swap' or Multi-Tenant switch.
    const activeBizId = typeof document !== 'undefined' 
        ? document.cookie
            .split('; ')
            .find(row => row.startsWith('bbu1_active_business_id='))
            ?.split('=')[1] || null
        : null;
    
    // --- 1. AURA NEURAL LINK (Handshake Unification) ---
    // DEEP FIX: We pass the 'activeBizId' from the cookie to ensure Aura context matches the node.
    const { data: auraData, error: auraError } = await supabase.rpc('get_aura_handshake', {
        p_target_biz_id: activeBizId 
    }); 

    // --- 2. SOVEREIGN CONTEXT ENGINE ---
    // Fetches the industrial context specifically for the active or default business node.
    const { data: contextData, error: contextError } = await supabase.rpc('get_user_context', {
        p_target_biz_id: activeBizId
    });

    // --- 3. EXCEPTION HANDLING & FORENSIC FALLBACK ---
    if (auraError || contextError || !contextData) {
        console.error("LITONU_SECURITY: Handshake Desync Detected", { auraError, contextError });
        
        // PHYSICAL TABLE AUDIT: If the "Brain" (RPC) is confused, we read from the "Heart" (Profiles)
        const { data: profile } = await supabase
            .from('profiles')
            .select('id, email, business_id, business_name, industry, role, system_access_role, setup_complete')
            .eq('id', user.id)
            .single();
            
        if (profile) {
            // NEW: Fetch subscription data from tenants table for the fallback
            // We target the activeBizId first to ensure fallback stays node-aware
            const targetTenantId = activeBizId || profile.business_id;
            const { data: tenantData } = await supabase
                .from('tenants')
                .select('subscription_status, subscription_plan')
                .eq('id', targetTenantId)
                .single();

            return {
                userId: profile.id,
                businessId: targetTenantId,
                businessName: profile.business_name || 'NIM UGANDA LTD', // Industrial Fallback
                industry: profile.industry || 'Distribution',
                email: profile.email || user.email || '', // Priority: Profile -> Auth
                user_role: profile.role || 'admin',
                system_power: (profile as any).system_access_role || null,
                business_display_name: profile.business_name || 'NIM UGANDA LTD',
                business_type: 'Distribution',
                reporting_currency: 'UGX',
                setup_complete: profile.setup_complete,
                branding_logo: null,
                subscription_status: tenantData?.subscription_status || null,
                subscription_plan: tenantData?.subscription_plan || null
            };
        }

        return null;
    }

    // --- 4. THE DEEP IDENTITY WELD ---
    // Merges both authoritative data sources into one singular Master Truth.
    const aura = (Array.isArray(auraData) ? auraData[0] : auraData) || {};
    const context = (Array.isArray(contextData) ? contextData[0] : contextData) || {};

    // --- MISSING LOGIC: SUBSCRIPTION ISOLATION ---
    // We must ensure the billing data belongs to the ACTIVE business node.
    const targetIdForBilling = activeBizId || context.business_id || aura.business_id;
    
    const { data: billingInfo } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', user.id)
        .single();

    const { data: subscriptionInfo } = await supabase
        .from('tenants')
        .select('subscription_status, subscription_plan')
        .eq('id', targetIdForBilling)
        .single();

    return {
        // Resolve Identity Anchors
        userId: aura.userId || aura.user_id || context.user_id || user.id,
        businessId: targetIdForBilling,
        businessName: context.business_display_name || aura.businessName || aura.business_name,
        industry: context.industry_sector || aura.industry,
        email: billingInfo?.email || user.email || '', // Mapped for billing
        
        // Resolve Sovereign Context (Synced to Sidebar/Middleware)
        user_role: context.user_role,
        system_power: context.system_power,
        business_display_name: context.business_display_name,
        industry_sector: context.industry_sector,
        business_type: context.business_type,
        reporting_currency: context.reporting_currency,
        setup_complete: context.setup_complete,
        branding_logo: context.branding_logo,

        // THE FIX: Mapping resolved node-specific data
        subscription_status: subscriptionInfo?.subscription_status || null,
        subscription_plan: subscriptionInfo?.subscription_plan || null
    };
}

/**
 * HOOK: useBusinessContext
 * The core identity provider for LITONU BUSINESS BASE UNIVERSE LTD.
 */
export function useBusinessContext() {
    return useQuery<BusinessContextData | null, Error>({
      queryKey: ['businessContext'], // THE MAGIC KEY: Targeted by the callback for instant refresh
      queryFn: fetchBusinessContextData,
      staleTime: 1000 * 60 * 15, // 15-minute Enterprise cache
      refetchOnWindowFocus: false, // Prevents identity desync on tab switch
    });
}