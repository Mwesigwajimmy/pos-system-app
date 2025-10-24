// src/hooks/useTenant.ts

import { createClient } from '@/lib/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface Tenant {
    id: string;
    name: string;
    business_type: string;
    owner_id: string;
}

/**
 * Fetches the complete tenant record for the currently authenticated user.
 */
export const useTenant = () => {
    const supabase = createClient();

    const fetchTenant = async (): Promise<Tenant | null> => {
        const { data, error } = await supabase.rpc('get_my_tenant_details');
        if (error) {
            console.error("Error fetching tenant details:", error.message);
            return null;
        }
        return data as Tenant;
    };

    return useQuery({
        queryKey: ['tenantDetails'],
        queryFn: fetchTenant,
    });
};