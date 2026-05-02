'use client';

import { createClient } from '@/lib/supabase/client';
import { useQuery } from '@tanstack/react-query';
import Cookies from 'js-cookie';

/**
 * AUTHORITATIVE TENANT INTERFACE
 * UPGRADE: Matches the 8-column signature of the 'get_user_context' Master Brain.
 * FIX: Switched to TypeScript standard comments to resolve compiler crash.
 */
export interface Tenant {
    id: string;
    business_display_name: string; // Primary professional name
    business_type: string;         // Multi-tenant filter key
    industry_sector: string;       // Specific industry DNA
    user_role: string;             // Context-aware role (e.g. Accountant)
    system_power: string | null;   // Sovereign tier (Architect check)
    reporting_currency: string;    // Multi-currency support
    setup_complete: boolean;       // Onboarding gate
    branding_logo: string | null;  // Visual identity
}

/**
 * HOOK: useTenant
 * The authoritative identity provider for the Sidebar and Header.
 * UPGRADE: Synchronized with the Sovereign Switcher via 'bbu1_active_business_id'.
 */
export const useTenant = () => {
    const supabase = createClient();

    // 1. Resolve Active Business Node
    const activeBizId = Cookies.get('bbu1_active_business_id');

    const fetchTenant = async (): Promise<Tenant | null> => {
        // 2. THE MASTER HANDSHAKE
        // We use 'get_user_context' because it is the deeply hardened 
        // engine that verifies memberships and prevents context hijacking.
        const { data, error } = await supabase.rpc('get_user_context', {
            p_target_biz_id: activeBizId
        });

        if (error) {
            console.error("LITONU_IDENTITY_HANDSHAKE_FAULT:", error.message);
            return null;
        }

        // 3. ATOMIC RESOLUTION
        // Returns the singular "Master Truth" for the active business node
        const context = Array.isArray(data) ? data[0] : data;
        
        return context ? {
            id: activeBizId || context.business_id,
            business_display_name: context.business_display_name,
            business_type: context.business_type,
            industry_sector: context.industry_sector,
            user_role: context.user_role,
            system_power: context.system_power,
            reporting_currency: context.reporting_currency,
            setup_complete: context.setup_complete,
            branding_logo: context.branding_logo
        } : null;
    };

    return useQuery({
        // 4. DYNAMIC DEPENDENCY SYNC
        // When 'activeBizId' changes in the cookie, this key triggers an instant UI update
        queryKey: ['tenantDetails', activeBizId],
        queryFn: fetchTenant,
        enabled: true, // Always enabled to ensure we catch the initial load
        staleTime: 1000 * 60 * 5, // 5-minute stability cache
        refetchOnWindowFocus: false, // Prevents identity flickering
    });
};