// src/hooks/useUserRole.ts
'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import Cookies from 'js-cookie'; // --- UPGRADE: INJECTED COOKIE ENGINE ---

/**
 * SOVEREIGN ROLE FETCH PROTOCOL
 * UPGRADE: Now accepts activeBizId to fetch context-specific roles.
 */
async function fetchUserRole(activeBizId?: string) {
    const supabase = createClient();
    
    // We pass the target business ID to the RPC.
    // This ensures that if Jimmy is in CAKE, the DB returns 'accountant'
    // instead of his primary 'architect' role from NAK.
    const { data, error } = await supabase.rpc('get_user_role', {
        p_target_biz_id: activeBizId
    });

    if (error) {
        console.error("Error fetching user role:", error);
        return null;
    }
    return data;
}

/**
 * HOOK: useUserRole
 * Surgically linked to the 'bbu1_active_business_id' cookie for multi-tenant switching.
 */
export function useUserRole() {
    // RESOLVE IDENTITY: Get the business node Jimmy is currently visiting
    const activeBizId = Cookies.get('bbu1_active_business_id');

    const { data: role, isLoading, isError } = useQuery({
        // CRITICAL UPGRADE: Adding activeBizId to the queryKey.
        // This forces React Query to re-fetch the role the moment a switch occurs.
        queryKey: ['userRole', activeBizId],
        queryFn: () => fetchUserRole(activeBizId),
        enabled: !!activeBizId, // Safety: Only fetch when a business context is resolved
        staleTime: 5 * 60 * 1000, // Cache the role for 5 minutes of stability
    });

    return { role, isLoading, isError };
}