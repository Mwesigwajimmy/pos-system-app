'use client';

/**
 * --- LITONU BUSINESS BASE UNIVERSE LTD - ENTERPRISE IDENTITY SCHEMA ---
 * VERSION: v20.5 OMEGA-ULTIMATUM (THE FORENSIC HANDSHAKE WELD)
 * JURISDICTION: Global Dashboard / AI Handshake / Multi-Tenant Alignment
 * 
 * CORE ARCHITECTURAL UPGRADES:
 * 1. PHYSICAL ID RECONCILIATION: Prioritizes the 'userId' and 'businessId' 
 *    returned by the get_aura_handshake RPC. This ensures the 5918cefa... 
 *    UUIDs are physically anchored even if cookies are missing (Incognito).
 * 2. NEURAL READINESS GATE: The 'is_ready' signal is now a multi-factor boolean
 *    that verifies the profile, the branding, and the AI engine status.
 * 3. SESSION MATERIALIZATION: Forces a physical getSession call to ensure the 
 *    JWT is available for the parallel RPC probes, preventing 401 desyncs.
 * 4. GHOST IDENTITY PROTECTION: Implements strict null-checks on the Aura payload
 *    to prevent the "VAULT: LINKING" hang in fresh browser environments.
 */

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import Cookies from 'js-cookie';

export interface BusinessContextData {
  userId: string;
  businessId: string;
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

/**
 * MASTER IDENTITY FETCHER
 * Authoritatively bridges the gap between Auth and the Sovereign Vault.
 */
async function fetchBusinessContextData(): Promise<BusinessContextData | null> {
    const supabase = createClient();

    // 1. 🛡️ PHYSICAL SESSION RECOVERY
    // We use getSession to force the JWT into memory for the subsequent RPCs.
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session?.user) {
        console.warn("[LITONU_SECURITY] Identity Latent. Session not found.");
        return null;
    }

    const user = session.user;

    // 2. Identify the active node
    const activeBizId = Cookies.get('bbu1_active_business_id');

    try {
        // 🛡️ THE STABILIZED PARALLEL PROBE
        // We fetch the general context and the Aura Handshake simultaneously.
        const [auraRes, contextRes] = await Promise.all([
            supabase.rpc('get_aura_handshake', { 
                p_target_biz_id: (activeBizId && activeBizId !== 'loading') ? activeBizId : null 
            }),
            supabase.rpc('get_user_context', { 
                p_target_biz_id: (activeBizId && activeBizId !== 'loading') ? activeBizId : null 
            })
        ]);

        // Forensic Log Check
        if (auraRes.error) console.error("AURA_PROBE_FAULT:", auraRes.error.message);
        if (contextRes.error) console.error("CONTEXT_PROBE_FAULT:", contextRes.error.message);

        const aura = auraRes.data; 
        const ctx = Array.isArray(contextRes.data) ? contextRes.data[0] : contextRes.data;

        // If the vault is unreachable or backend returns nulls, keep handshake pending
        if (!aura || !ctx || !aura.userId) {
            console.warn("[LITONU_SECURITY] Handshake incomplete. IDs missing from payload.");
            return null;
        }

        /**
         * 3. THE DEEP IDENTITY WELD (APEX ALIGNMENT)
         * Resolving the 5918cefa... identity revealed in the forensic audit.
         * We prioritize 'aura.userId' and 'aura.businessId' as the 
         * physical proof of identity.
         */
        return {
            // ANCHORS (Physically Welded)
            userId: aura.userId || user.id,
            businessId: aura.businessId || activeBizId || ctx.business_id,
            businessName: aura.businessName || ctx.business_display_name || 'APEX',
            industry: ctx.industry_sector || aura.industry || 'General Enterprise',
            email: user.email || '',
            country: ctx.country || aura.country || 'UG',
            
            // GOVERNANCE
            user_role: ctx.user_role || 'admin',
            system_power: ctx.system_power || null,
            
            // CONTEXT
            business_display_name: aura.businessName || ctx.business_display_name,
            industry_sector: aura.industry || ctx.industry_sector,
            business_type: ctx.business_type || 'Retail / Wholesale',
            reporting_currency: ctx.reporting_currency || 'UGX',
            setup_complete: !!ctx.setup_complete,
            branding_logo: aura.logo || ctx.branding_logo,

            // STATUS
            subscription_status: ctx.subscription_status || 'active',
            subscription_plan: ctx.subscription_plan || 'ENTERPRISE',

            // 🛡️ THE READINESS SEAL
            // Aura only unlocks if the backend explicitly returns is_ready: true
            is_ready: aura.is_ready === true && ctx.setup_complete === true,
            brain_status: aura.status || 'FULLY_ALIGNED'
        };

    } catch (err) {
        console.error("[LITONU_CRITICAL] Neural Bridge Collapse:", err);
        return null;
    }
}

/**
 * HOOK: useBusinessContext
 * The authoritative source of truth for the entire dashboard ecosystem.
 */
export function useBusinessContext() {
    return useQuery<BusinessContextData | null, Error>({
      queryKey: ['businessContext'], 
      queryFn: fetchBusinessContextData,
      
      // Stabilization Settings for Multi-Tenant Scaling
      staleTime: 1000 * 60 * 5,     // 5-minute cache
      gcTime: 1000 * 60 * 15,        // 15-minute memory retention
      refetchOnWindowFocus: true,    
      retry: (failureCount, error: any) => {
          if (error?.status === 429) return false;
          return failureCount < 2;
      },
    });
}