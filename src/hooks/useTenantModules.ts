import { createClient } from '@/lib/supabase/client';
import { useQuery } from '@tanstack/react-query';

// This hook fetches the list of module slugs (e.g., ['crm', 'hcm', 'contractor'])
// that are enabled for the current user's tenant.
export const useTenantModules = () => {
    const supabase = createClient();

    const fetchTenantModules = async () => {
        // This RPC function is more secure and efficient as it uses the JWT
        const { data, error } = await supabase.rpc('get_tenant_module_slugs');
        if (error) {
            console.error("Error fetching tenant modules:", error);
            return []; // Return empty array on error
        }
        return data;
    };

    return useQuery({
        queryKey: ['tenantModules'],
        queryFn: fetchTenantModules,
    });
};