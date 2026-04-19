'use client';

import { createClient } from '@/lib/supabase/client';
import { useQuery } from '@tanstack/react-query';
import Cookies from 'js-cookie'; // --- UPGRADE: INJECTED COOKIE ENGINE ---

/**
 * Hook: useTenantModules
 * Fetches the list of module slugs (e.g., ['crm', 'hcm', 'contractor'])
 * that are enabled for the current user's ACTIVE business node.
 * 
 * UPGRADE: Now context-aware to support automatic business identity switching.
 */
export const useTenantModules = () => {
    const supabase = createClient();

    // --- 1. IDENTITY RESOLUTION ---
    // We pull the active business ID directly from the secure identity cookie
    const activeBizId = Cookies.get('bbu1_active_business_id');

    const fetchTenantModules = async () => {
        // --- 2. THE SECURE HANDOFF ---
        // We pass the target business ID to the backend. This ensures Jimmy 
        // sees the modules authorized for the node he is VISITING.
        const { data, error } = await supabase.rpc('get_tenant_module_slugs', {
            p_target_biz_id: activeBizId
        });

        if (error) {
            console.error("Error fetching tenant modules:", error);
            return []; // Return empty array on error to prevent UI crash
        }
        return data;
    };

    return useQuery({
        // --- 3. DYNAMIC REFRESH PROTOCOL ---
        // Adding activeBizId to the queryKey ensures that when Jimmy switches 
        // from NAK to CAKE, the sidebar modules refresh immediately.
        queryKey: ['tenantModules', activeBizId],
        queryFn: fetchTenantModules,
        enabled: !!activeBizId, // Only execute when a business context is resolved
        staleTime: 1000 * 60 * 10, // Cache for 10 minutes for high performance
    });
};