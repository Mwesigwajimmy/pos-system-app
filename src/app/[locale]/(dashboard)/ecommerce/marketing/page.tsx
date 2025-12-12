import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

// Import Client Component
import { PromotionsManager, Promotion } from '@/components/ecommerce/PromotionsManager';

// ----------------------------------------------------------------------
// 1. AUTH UTILITY
// ----------------------------------------------------------------------
async function getCurrentUser(supabase: any) {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
        redirect('/login');
    }
    return user;
}

// ----------------------------------------------------------------------
// 2. DATA FETCHING
// ----------------------------------------------------------------------
async function getPromotions(supabase: any): Promise<Promotion[]> {
    const { data, error } = await supabase
        .from('promotions')
        .select(`
            id,
            code,
            label,
            promo_type,
            discount_value,
            currency_code,
            region_code,
            is_active,
            valid_from,
            valid_to,
            tenant_id
        `)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Promotions fetch error:", error);
        return [];
    }

    // Mapping DB snake_case -> UI camelCase
    return data.map((p: any) => ({
        id: p.id,
        code: p.code,
        label: p.label,
        type: p.promo_type,
        value: p.discount_value,
        currency: p.currency_code,
        region: p.region_code,
        active: p.is_active,
        validFrom: p.valid_from,
        validTo: p.valid_to,
        tenantId: p.tenant_id
    }));
}

// ----------------------------------------------------------------------
// 3. MAIN PAGE
// ----------------------------------------------------------------------
export default async function MarketingPage() {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    await getCurrentUser(supabase);
    
    const promotions = await getPromotions(supabase);

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between">
                 <div className="space-y-1">
                    <h2 className="text-3xl font-bold tracking-tight">Marketing & Promotions</h2>
                    <p className="text-muted-foreground">
                        Drive sales with coupons, discounts, and regional campaigns.
                    </p>
                </div>
            </div>

            <PromotionsManager initialPromotions={promotions} />
        </div>
    );
}