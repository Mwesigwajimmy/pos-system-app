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
}

/**
 * AUTHORITATIVE IDENTITY RESOLVER
 */
async function fetchBusinessContextData(): Promise<BusinessContextData | null> {
    const supabase = createClient();
    
    // --- 1. AURA NEURAL LINK (Handshake Unification) ---
    // DEEP FIX: We pass 'p_target_biz_id' as null to resolve the PGRST203 ambiguity.
    // This tells the API exactly which function candidate to execute.
    const { data: auraData, error: auraError } = await supabase.rpc('get_aura_handshake', {
        p_target_biz_id: null 
    }); 

    // --- 2. SOVEREIGN CONTEXT ENGINE ---
    // Fetches the 8-column industrial context for the current business node.
    const { data: contextData, error: contextError } = await supabase.rpc('get_user_context', {
        p_target_biz_id: null
    });

    // --- 3. EXCEPTION HANDLING & FORENSIC FALLBACK ---
    if (auraError || contextError || !contextData) {
        console.error("LITONU_SECURITY: Handshake Desync Detected", { auraError, contextError });
        
        // PHYSICAL TABLE AUDIT: If the "Brain" (RPC) is confused, we read from the "Heart" (Profiles)
        const { data: profile } = await supabase
            .from('profiles')
            .select('id, business_id, business_name, industry, role, system_access_role, setup_complete')
            .eq('id', (await supabase.auth.getUser()).data.user?.id)
            .single();
            
        if (profile) return {
            userId: profile.id,
            businessId: profile.business_id,
            businessName: profile.business_name || 'NIM UGANDA LTD', // Industrial Fallback
            industry: profile.industry || 'Distribution',
            user_role: profile.role || 'admin',
            system_power: (profile as any).system_access_role || null,
            business_display_name: profile.business_name || 'NIM UGANDA LTD',
            business_type: 'Distribution',
            reporting_currency: 'UGX',
            setup_complete: profile.setup_complete,
            branding_logo: null
        };

        return null;
    }

    // --- 4. THE DEEP IDENTITY WELD ---
    // Merges both authoritative data sources into one singular Master Truth.
    const aura = Array.isArray(auraData) ? auraData[0] : auraData;
    const context = Array.isArray(contextData) ? contextData[0] : contextData;

    return {
        // Resolve Identity Anchors
        userId: aura.userId || aura.user_id || context.user_id,
        businessId: aura.businessId || aura.business_id || context.business_id,
        businessName: context.business_display_name || aura.businessName || aura.business_name,
        industry: context.industry_sector || aura.industry,
        
        // Resolve Sovereign Context (Synced to Sidebar/Middleware)
        user_role: context.user_role,
        system_power: context.system_power,
        business_display_name: context.business_display_name,
        industry_sector: context.industry_sector,
        business_type: context.business_type,
        reporting_currency: context.reporting_currency,
        setup_complete: context.setup_complete,
        branding_logo: context.branding_logo
    };
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
      refetchOnWindowFocus: false, // Prevents identity desync on tab switch
    });
}