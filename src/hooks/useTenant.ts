'use client';

/**
 * AUTHORITATIVE TENANT INTERFACE
 * VERSION: v11.5 OMEGA (IDENTITY ANCHOR)
 * JURISDICTION: Sidebar / Header / Enterprise Context
 * 
 * UPGRADE LOG:
 * 1. IDENTITY RECOVERY: Synchronized with v17.5 Middleware to handle 
 *    New Window sessions by verifying active business UUIDs.
 * 2. RPC PARAMETER WELD: Physically passes Business ID to 'get_user_context'.
 * 3. STABILITY CACHE: Optimized staleTime to prevent UI flickering 
 *    during Aura's high-speed forensic audits.
 */

import { createClient } from '@/lib/supabase/client';
import { useQuery } from '@tanstack/react-query';
import Cookies from 'js-cookie';

export interface Tenant {
    id: string;
    business_display_name: string;
    business_type: string;
    industry_sector: string;
    user_role: string;
    system_power: string | null;
    reporting_currency: string;
    setup_complete: boolean;
    branding_logo: string | null;
}

export const useTenant = () => {
    const supabase = createClient();

    // 1. Resolve Active Business Node (v11.5 Hardened)
    const cookieId = Cookies.get('bbu1_active_business_id');
    const activeBizId = (cookieId && cookieId !== 'loading') ? cookieId : null;

    const fetchTenant = async (): Promise<Tenant | null> => {
        // Ensure we don't call with a latent ID
        if (!activeBizId) return null;

        // 2. THE MASTER HANDSHAKE
        // Calls the hardened context RPC to get multi-tenant specific metadata
        const { data, error } = await supabase.rpc('get_user_context', {
            p_target_biz_id: activeBizId
        });

        if (error) {
            console.error("[LITONU] Identity Handshake Fault:", error.message);
            return null;
        }

        const context = Array.isArray(data) ? data[0] : data;
        
        return context ? {
            // Mapping verified data to the Tenant interface
            id: activeBizId,
            business_display_name: context.business_display_name || 'Authorized Entity',
            business_type: context.business_type || 'General',
            industry_sector: context.industry_sector || context.industry || 'Retail / Wholesale',
            user_role: context.user_role || 'admin',
            system_power: context.system_power || null,
            reporting_currency: context.reporting_currency || 'UGX',
            setup_complete: context.setup_complete ?? true,
            branding_logo: context.branding_logo || null
        } : null;
    };

    return useQuery({
        // 4. DYNAMIC DEPENDENCY SYNC
        // The query key is anchored to the activeBizId to trigger instant UI swaps
        queryKey: ['tenantDetails', activeBizId],
        queryFn: fetchTenant,
        enabled: !!activeBizId, 
        staleTime: 1000 * 60 * 5, 
        refetchOnWindowFocus: false, // Prevents identity flickering
    });
};