import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

// Import Client Component & Type
import { StorefrontSettings } from '@/components/ecommerce/StorefrontSettings';
import { StoreSettingsFormValues } from '@/lib/ecommerce/actions/settings';

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
// 2. DATA FETCHING SERVICE
// ----------------------------------------------------------------------
async function getStoreSettings(supabase: any, userId: string): Promise<StoreSettingsFormValues> {
    const { data, error } = await supabase
        .from('store_settings')
        .select('*')
        .eq('tenant_id', userId)
        .single();

    if (error || !data) {
        // Return defaults if no settings exist yet
        return {
            storeName: "My Online Store",
            themeColor: "#000000",
            currency: "USD",
            seoTitle: "Welcome to My Store",
            seoDesc: "Best products at the best prices."
        };
    }

    // Map DB snake_case -> UI camelCase
    return {
        storeName: data.store_name,
        themeColor: data.theme_color,
        currency: data.currency_code,
        seoTitle: data.seo_title,
        seoDesc: data.seo_description
    };
}

// ----------------------------------------------------------------------
// 3. MAIN PAGE COMPONENT
// ----------------------------------------------------------------------
export default async function StorefrontSettingsPage() {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    // 1. Auth Check
    const user = await getCurrentUser(supabase);
    
    // 2. Fetch Data
    const settings = await getStoreSettings(supabase, user.id);

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 max-w-4xl mx-auto">
            <div className="flex items-center justify-between">
                 <div className="space-y-1">
                    <h2 className="text-3xl font-bold tracking-tight">Storefront Configuration</h2>
                    <p className="text-muted-foreground">
                        Manage your public store's identity, styling, and search engine optimization.
                    </p>
                </div>
            </div>

            <StorefrontSettings initialData={settings} />
        </div>
    );
}