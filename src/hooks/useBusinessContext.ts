'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

/**
 * ENTERPRISE IDENTITY SCHEMA - BBU1 GLOBAL
 * UPGRADE: Now includes both Aura AI DNA and the Sovereign Context variables.
 */
export interface BusinessContextData {
  userId: string;
  businessId: string;
  businessName: string;
  industry: string;
  country?: string;
  
  // --- DEEP SOVEREIGN EXTENSIONS ---
  // These are required for role filtering and multi-tenant branding
  user_role: string;
  system_power: string | null;
  business_display_name: string;
  industry_sector: string;
  business_type: string;
  reporting_currency: string;
  setup_complete: boolean;
  branding_logo: string | null;
}

async function fetchBusinessContextData(): Promise<BusinessContextData | null> {
    const supabase = createClient();
    
    // --- 1. AURA NEURAL LINK (Original Logic Preserved) ---
    // We maintain this to ensure Aura AI has its specific data points
    const { data: auraData, error: auraError } = await supabase.rpc('get_aura_handshake'); 

    // --- 2. SOVEREIGN CONTEXT ENGINE (Deep Upgrade Added) ---
    // We simultaneously fetch the context required for the Sidebar and Middleware
    const { data: contextData, error: contextError } = await supabase.rpc('get_user_context');

    if (auraError || contextError) {
        console.error("LITONU_SECURITY: Handshake Desync Detected", { auraError, contextError });
        
        // --- AUTHORITATIVE FALLBACK (No-Assumption Safety) ---
        const { data: profile } = await supabase
            .from('profiles')
            .select('id, business_id, business_name, industry, role, system_access_role, setup_complete')
            .single();
            
        if (profile) return {
            userId: profile.id,
            businessId: profile.business_id,
            businessName: profile.business_name || 'Sovereign Node',
            industry: profile.industry || 'Enterprise',
            user_role: profile.role || 'admin',
            system_power: (profile as any).system_access_role || null,
            business_display_name: profile.business_name || 'Sovereign Node',
            business_type: 'Retail / Wholesale',
            reporting_currency: 'UGX',
            setup_complete: profile.setup_complete,
            branding_logo: null
        };

        return null;
    }

    // --- 3. THE DEEP IDENTITY WELD ---
    // We merge both RPC results into one singular "Master Truth" object.
    const aura = Array.isArray(auraData) ? auraData[0] : auraData;
    const context = Array.isArray(contextData) ? contextData[0] : contextData;

    return {
        // Properties from original Aura Link
        userId: aura.user_id || aura.userId,
        businessId: aura.business_id || aura.businessId,
        businessName: aura.business_name || aura.businessName || context.business_display_name,
        industry: aura.industry || context.industry_sector,
        
        // Properties from upgraded Sovereign Context
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

export function useBusinessContext() {
    return useQuery<BusinessContextData | null, Error>({
      queryKey: ['businessContext'],
      queryFn: fetchBusinessContextData,
      staleTime: 1000 * 60 * 15, // Enterprise Standard: 15min cache
      refetchOnWindowFocus: false, // Prevents identity flicker during switching
    });
}