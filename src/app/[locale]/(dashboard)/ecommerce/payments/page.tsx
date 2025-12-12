import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

// This import now works because we removed 'default' from the component file
import { PaymentProviderManager, PaymentProvider } from '@/components/ecommerce/PaymentProviderManager';

async function getCurrentUser(supabase: any) {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) redirect('/login');
    return user;
}

async function getPaymentProviders(supabase: any): Promise<PaymentProvider[]> {
    const { data, error } = await supabase
        .from('payment_gateways')
        .select('*')
        .order('provider_name', { ascending: true });

    if (error) {
        console.error("Error fetching payment gateways:", error);
        return [];
    }

    // Mapping DB fields to Interface fields
    return data.map((pg: any) => ({
        id: pg.id,
        name: pg.provider_name,
        // Map DB types to strict TS types if needed, or cast
        type: (pg.gateway_type === 'card' ? 'Credit Card' : 'Mobile Money') as any,
        region: pg.region_code || 'Global',
        entity: pg.entity_id || 'Main',
        active: pg.is_enabled,
        currency: pg.supported_currency,
        tenantId: pg.tenant_id
    }));
}

export default async function PaymentSettingsPage() {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    await getCurrentUser(supabase);
    
    const providers = await getPaymentProviders(supabase);

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between">
                 <div className="space-y-1">
                    <h2 className="text-3xl font-bold tracking-tight">Payment Providers</h2>
                    <p className="text-muted-foreground">
                        Configure gateways for Credit Cards, Mobile Money, and Digital Wallets.
                    </p>
                </div>
            </div>
            {/* Pass the data to the client component */}
            <PaymentProviderManager providers={providers} />
        </div>
    );
}