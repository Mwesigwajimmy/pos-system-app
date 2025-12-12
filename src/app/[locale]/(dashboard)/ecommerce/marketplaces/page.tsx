import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

// Ensure the filename in /components/ecommerce/ matches this import exactly!
import { MarketplaceIntegrationCenter, MarketplaceIntegration } from '@/components/ecommerce/MarketplaceIntegrationCenter';

async function getCurrentUser(supabase: any) {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
        redirect('/login');
    }
    return user;
}

async function getMarketplaceIntegrations(supabase: any): Promise<MarketplaceIntegration[]> {
    // Determine if table exists or use mock data if DB isn't ready
    try {
        const { data, error } = await supabase
            .from('marketplace_configs')
            .select(`
                id,
                provider_name,
                is_active,
                region_code,
                synced_product_count,
                last_sync_at,
                entity_name,
                tenant_id
            `)
            .order('provider_name', { ascending: true });

        if (error) {
            console.warn("Table 'marketplace_configs' not found or error. Returning empty array.");
            return [];
        }

        return data.map((item: any) => ({
            id: item.id,
            name: item.provider_name || 'Unknown Provider',
            connected: item.is_active,
            region: item.region_code || 'Global',
            productsSynced: item.synced_product_count || 0,
            lastSync: item.last_sync_at 
                ? new Date(item.last_sync_at).toLocaleString('en-GB', {
                    dateStyle: 'short',
                    timeStyle: 'short'
                  })
                : null,
            entity: item.entity_name || 'Main Organization',
            tenantId: item.tenant_id
        }));
    } catch (e) {
        return [];
    }
}

export default async function MarketplacePage() {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    await getCurrentUser(supabase);
    const integrations = await getMarketplaceIntegrations(supabase);

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between">
                 <div className="space-y-1">
                    <h2 className="text-3xl font-bold tracking-tight">Marketplace Integration</h2>
                    <p className="text-muted-foreground">
                        Centralized control for external sales channels and inventory synchronization.
                    </p>
                </div>
            </div>

            <MarketplaceIntegrationCenter integrations={integrations} />
        </div>
    );
}