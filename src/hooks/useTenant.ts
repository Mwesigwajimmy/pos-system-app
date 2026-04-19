// src/hooks/useTenant.ts

import { createClient } from '@/lib/supabase/client';
import { useQuery } from '@tanstack/react-query';
import Cookies from 'js-cookie'; // --- UPGRADE: INJECTED COOKIE ENGINE ---

interface Tenant {
    id: string;
    name: string;
    business_type: string;
    owner_id: string;
    currency?: string; // Added to match your enterprise dashboard needs
}

/**
 * Fetches the complete tenant record for the currently authenticated user.
 * UPGRADE: Now context-aware to support automatic business identity switching.
 */
export const useTenant = () => {
    const supabase = createClient();

    // --- 1. IDENTITY RESOLUTION ---
    // We pull the active business ID directly from the secure identity cookie
    const activeBizId = Cookies.get('bbu1_active_business_id');

    const fetchTenant = async (): Promise<Tenant | null> => {
        // --- 2. THE SECURE HANDOFF ---
        // We pass the target business ID to the backend. This forces the 
        // database to return the details for the node Jimmy is VISITING.
        const { data, error } = await supabase.rpc('get_my_tenant_details', {
            p_target_biz_id: activeBizId
        });

        if (error) {
            console.error("Error fetching tenant details:", error.message);
            return null;
        }

        // Standardize return for both single-row and setof-table results
        return (Array.isArray(data) ? data[0] : data) as Tenant;
    };

    return useQuery({
        // --- 3. DYNAMIC REFRESH PROTOCOL ---
        // Adding activeBizId to the queryKey is the secret. When the user 
        // switches businesses, the key changes and React Query refreshes the data automatically.
        queryKey: ['tenantDetails', activeBizId],
        queryFn: fetchTenant,
        enabled: !!activeBizId, // Only execute the protocol when a node ID is resolved
        staleTime: 1000 * 60 * 5, // Cache for 5 minutes of stability
    });
};