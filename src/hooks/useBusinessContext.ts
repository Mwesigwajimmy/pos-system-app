'use client';

/**
 * --- LITONU BUSINESS BASE UNIVERSE LTD - ENTERPRISE IDENTITY SCHEMA ---
 * VERSION: v21.0 OMEGA-ULTIMATUM (THE KEYBOARD ACTIVATION WELD)
 * JURISDICTION: Global Dashboard / AI Handshake / Multi-Tenant Alignment
 * 
 * CORE ARCHITECTURAL UPGRADES:
 * 1. CAMEL-SNAKE RECONCILIATION: Physically maps both businessId and business_id.
 *    This ensures that CopilotContext and CopilotPanel "see" the ID regardless of 
 *    the naming convention used in the bridge.
 * 2. TYPING ACTIVATION: Loosened the 'is_ready' gate. If the AI Handshake is 
 *    successful, we allow typing immediately, bypassing setup_complete delays.
 * 3. IDENTITY ANCHOR: Uses the verified 5918cefa... UUIDs from the RPC response.
 */

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import Cookies from 'js-cookie';

export interface BusinessContextData {
  // ANCHORS
  userId: string;
  auth_user_id: string; // Snake-case alias for Copilot
  businessId: string;
  business_id: string;  // Snake-case alias for Copilot
  profile_linked_biz_id: string; // Multi-tenant alias
  
  // IDENTITY
  businessName: string;
  industry: string;
  country?: string;
  email: string; 
  user_role: string;
  system_power: string | null;
  business_display_name: string;
  industry_sector: string;
  business_type: string;
  reporting_currency: string;
  setup_complete: boolean;
  branding_logo: string | null;
  subscription_status: string | null;
  subscription_plan: string | null;
  is_ready: boolean;
  brain_status: string;
}

async function fetchBusinessContextData(): Promise<BusinessContextData | null> {
    const supabase = createClient();

    // 1. Force session into memory
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return null;

    const user = session.user;
    const activeBizIdFromCookie = Cookies.get('bbu1_active_business_id');

    try {
        // 2. Parallel Handshake Probe
        const [auraRes, contextRes] = await Promise.all([
            supabase.rpc('get_aura_handshake', { 
                p_target_biz_id: (activeBizIdFromCookie && activeBizIdFromCookie !== 'loading') ? activeBizIdFromCookie : null,
                p_user_id: user.id
            }),
            supabase.rpc('get_user_context', { 
                p_target_biz_id: (activeBizIdFromCookie && activeBizIdFromCookie !== 'loading') ? activeBizIdFromCookie : null 
            })
        ]);

        const aura = auraRes.data; 
        const ctx = Array.isArray(contextRes.data) ? contextRes.data[0] : contextRes.data;

        // 🛡️ CRITICAL: If the IDs aren't here, we stay blind.
        if (!aura || !aura.userId || !aura.businessId) {
            console.warn("[LITONU_SECURITY] Handshake Pending: IDs missing from Vault.");
            return null;
        }

        /**
         * 3. THE DEEP IDENTITY WELD (APEX ALIGNMENT)
         * We map every possible variation of the Business ID to ensure 
         * the UI "Bucket" is never empty.
         */
        const finalBizId = aura.businessId;

        return {
            // PHYSICALLY WELCHED ANCHORS (Fixed naming for all components)
            userId: aura.userId,
            auth_user_id: aura.userId,
            businessId: finalBizId,
            business_id: finalBizId,
            profile_linked_biz_id: finalBizId,
            
            // IDENTITY & SECTOR
            businessName: aura.businessName || 'APEX',
            business_display_name: aura.businessName || 'APEX',
            industry: aura.industry || ctx?.industry_sector || 'Retail / Wholesale',
            industry_sector: aura.industry || ctx?.industry_sector || 'Retail / Wholesale',
            business_type: ctx?.business_type || 'Retail / Wholesale',
            
            // GEOGRAPHY & FINANCE
            email: user.email || '',
            country: aura.country || ctx?.country || 'UG',
            reporting_currency: ctx?.reporting_currency || 'UGX',
            
            // GOVERNANCE
            user_role: ctx?.user_role || 'admin',
            system_power: ctx?.system_power || null,
            setup_complete: !!ctx?.setup_complete,
            branding_logo: aura.logo || ctx?.branding_logo,
            subscription_status: ctx?.subscription_status || 'active',
            subscription_plan: ctx?.subscription_plan || 'ENTERPRISE',

            // 🛡️ THE READINESS SEAL (LOOSENED)
            // If the database says the AI is ready, we UNLOCK TYPING immediately.
            is_ready: aura.is_ready === true, 
            brain_status: aura.status || 'FULLY_ALIGNED'
        };

    } catch (err) {
        console.error("[LITONU_CRITICAL] Neural Bridge Collapse:", err);
        return null;
    }
}

export function useBusinessContext() {
    return useQuery<BusinessContextData | null, Error>({
      queryKey: ['businessContext'], 
      queryFn: fetchBusinessContextData,
      staleTime: 1000 * 30, // Reduced to 30s to allow faster "wake up"
      refetchOnWindowFocus: true,    
    });
}