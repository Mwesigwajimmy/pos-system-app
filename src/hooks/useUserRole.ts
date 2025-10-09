// src/hooks/useUserRole.ts
'use client';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

async function fetchUserRole() {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('get_user_role');
    if (error) {
        console.error("Error fetching user role:", error);
        return null;
    }
    return data;
}

export function useUserRole() {
    const { data: role, isLoading, isError } = useQuery({
        queryKey: ['userRole'],
        queryFn: fetchUserRole,
        staleTime: 5 * 60 * 1000, // Cache the role for 5 minutes
    });

    return { role, isLoading, isError };
}