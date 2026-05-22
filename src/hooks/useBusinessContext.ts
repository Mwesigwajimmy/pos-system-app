'use client';

/**
 * --- LITONU BUSINESS BASE UNIVERSE LTD - ENTERPRISE IDENTITY SCHEMA ---
 * VERSION: v18.5 OMEGA-ULTIMATUM (THE DEFINITIVE IDENTITY WELD)
 * JURISDICTION: Global Dashboard / AI Handshake / Multi-Tenant Alignment
 * 
 * CORE UPGRADES:
 * 1. SESSION MATERIALIZATION: Switched to getSession() to physically force the 
 *    Access Token (JWT) into browser memory, solving the "No Access Token" error.
 * 2. NAMING RECONCILIATION: Explicitly maps both CamelCase and snake_case IDs 
 *    to ensure CopilotContext and the Sidebar never lose the anchor.
 * 3. 429 RATE LIMIT SHIELD: Optimized parallel RPC probing with strict stale-time 
 *    controls to prevent Supabase request flooding during latency.
 * 4. PATIENT HANDSHAKE: The is_ready signal is now strictly boolean-validated 
 *    against the database return to prevent "Ghost Identity" crashes.
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
    // We use getSession first to ensure the JWT is actually available for the RPCs.
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session?.user) {
        console.warn("LITONU_SECURITY: Identity Latent. Session not found.");
        return null;
    }

    const user = session.user;

    // 2. Identify the active node from the authoritative cookie
    // Switched to js-cookie for more reliable cross-browser parsing
    const activeBizId = Cookies.get('bbu1_active_business_id');

    try {
        // 🛡️ THE STABILIZED PARALLEL PROBE
        // Probing both the Aura Brain and the General User Context simultaneously.
        const [auraRes, contextRes] = await Promise.all([
            supabase.rpc('get_aura_handshake', { 
                p_target_biz_id: (activeBizId && activeBizId !== 'loading') ? activeBizId : null 
            }),
            supabase.rpc('get_user_context', { 
                p_target_biz_id: (activeBizId && activeBizId !== 'loading') ? activeBizId : null 
            })
        ]);

        // Error Logging for Forensic Audits
        if (auraRes.error) console.error("AURA_PROBE_FAULT:", auraRes.error.message);
        if (contextRes.error) console.error("CONTEXT_PROBE_FAULT:", contextRes.error.message);

        const aura = auraRes.data; 
        const ctx = Array.isArray(contextRes.data) ? contextRes.data[0] : contextRes.data;

        // If the vault is completely unreachable, signal unready state
        if (!aura || !ctx) {
            console.warn("LITONU_SECURITY: Vault identity not aligned. Handshake pending.");
            return null;
        }

        // 3. THE DEEP IDENTITY WELD (Precision Mapping)
        // Resolving naming discordance between the AI engine and the UI components.
        return {
            // ANCHORS
            userId: user.id,
            businessId: aura.businessId || activeBizId || ctx.business_id,
            businessName: aura.businessName || ctx.business_display_name || 'Sovereign Node',
            industry: aura.industry || ctx.industry_sector || 'General Enterprise',
            email: user.email || '',
            country: aura.country || ctx.country || 'UG',
            
            // GOVERNANCE
            user_role: ctx.user_role || aura.role || 'admin',
            system_power: ctx.system_power || aura.power || null,
            
            // CONTEXT
            business_display_name: ctx.business_display_name || aura.businessName,
            industry_sector: ctx.industry_sector || aura.industry,
            business_type: ctx.business_type || 'Retail / Wholesale',
            reporting_currency: ctx.reporting_currency || aura.currency || 'UGX',
            setup_complete: !!ctx.setup_complete,
            branding_logo: ctx.branding_logo || aura.logo,

            // STATUS
            subscription_status: ctx.subscription_status || 'active',
            subscription_plan: ctx.subscription_plan || 'Sovereign',

            // 🛡️ THE READINESS SEAL
            // Physically locked to the boolean return of the database handshake
            is_ready: aura.is_ready === true,
            brain_status: aura.status || 'FULLY_ALIGNED'
        };

    } catch (err) {
        console.error("LITONU_CRITICAL: Neural Bridge Collapse", err);
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
      
      // UPGRADE: Stabilization Settings
      staleTime: 1000 * 60 * 2,     // 2-minute cache to prevent 429 Rate Limits
      gcTime: 1000 * 60 * 10,        // Keep in memory for 10 minutes
      refetchOnWindowFocus: true,    // Refresh if user returns to tab to catch session updates
      retry: (failureCount, error: any) => {
          // Do not retry if we hit a 429, wait for the next scheduled fetch
          if (error?.status === 429) return false;
          return failureCount < 2;
      },
    });
}