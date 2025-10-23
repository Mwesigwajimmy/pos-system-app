import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ConnectIntegrationModal } from '@/components/settings/ConnectIntegrationModal';
import { CheckCircle } from 'lucide-react';

// Export type for use in the modal
export interface Integration {
    id: string;
    name: string;
    category: string;
    logo_url: string | null;
    is_connected: boolean;
}

async function getIntegrations(supabase: any): Promise<Integration[]> {
    // 1. Fetch all available integrations
    const { data: allIntegrations, error: allError } = await supabase.from('integrations').select('*');
    if (allError) { console.error("Error fetching all integrations", allError); return []; }
    
    // 2. Fetch the integrations this specific tenant has connected
    const { data: tenantIntegrations, error: tenantError } = await supabase.from('tenant_integrations').select('integration_id, is_enabled');
    if (tenantError) { console.error("Error fetching tenant integrations", tenantError); }

    const connectedIds = new Set(tenantIntegrations?.filter(ti => ti.is_enabled).map(ti => ti.integration_id));

    // 3. Join them together to create a final list
    return allIntegrations.map(integration => ({
        ...integration,
        is_connected: connectedIds.has(integration.id),
    }));
}


export default async function IntegrationsPage() {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    const integrations = await getIntegrations(supabase);

    const categorized = integrations.reduce((acc, int) => {
        (acc[int.category] = acc[int.category] || []).push(int);
        return acc;
    }, {} as Record<string, Integration[]>);

    return (
        <div className="flex-1 space-y-8 p-4 md:p-8 pt-6">
            <div className="space-y-1">
                <h2 className="text-3xl font-bold tracking-tight">API Integrations & Marketplace</h2>
                <p className="text-muted-foreground">Connect your business to the world.</p>
            </div>
            
            {Object.entries(categorized).map(([category, items]) => (
                <div key={category}>
                    <h3 className="text-2xl font-semibold tracking-tight mb-4">{category}</h3>
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                        {items.map(integration => (
                            <Card key={integration.id} className="flex flex-col">
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <CardTitle>{integration.name}</CardTitle>
                                        {integration.is_connected && <CheckCircle className="h-5 w-5 text-green-500" />}
                                    </div>
                                </CardHeader>
                                <CardContent className="flex-grow flex flex-col justify-end">
                                    <ConnectIntegrationModal integration={integration} />
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}