'use server';

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

// 1. Validation Schema
const settingsSchema = z.object({
    storeName: z.string().min(3, "Store name must be at least 3 characters"),
    themeColor: z.string().regex(/^#([0-9A-F]{3}){1,2}$/i, "Invalid color hex code"),
    currency: z.string().length(3, "Currency must be a 3-letter code (e.g. UGX)"),
    seoTitle: z.string().max(60, "SEO Title should be under 60 characters"),
    seoDesc: z.string().max(160, "SEO Description should be under 160 characters"),
});

export type StoreSettingsFormValues = z.infer<typeof settingsSchema>;

// 2. Update Action
export async function updateStoreSettings(data: StoreSettingsFormValues) {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    // Auth Check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: "Unauthorized" };

    // Validation
    const parsed = settingsSchema.safeParse(data);
    if (!parsed.success) {
        return { success: false, message: "Invalid input data" };
    }

    // DB Upsert
    // We assume a 'store_settings' table keyed by 'tenant_id'
    const { error } = await supabase
        .from('store_settings')
        .upsert({
            tenant_id: user.id, // In real multi-tenant, this comes from context/org
            store_name: parsed.data.storeName,
            theme_color: parsed.data.themeColor,
            currency_code: parsed.data.currency,
            seo_title: parsed.data.seoTitle,
            seo_description: parsed.data.seoDesc,
            updated_at: new Date().toISOString()
        }, { onConflict: 'tenant_id' });

    if (error) {
        console.error("Settings Update Error:", error);
        return { success: false, message: "Failed to save settings." };
    }

    revalidatePath('/ecommerce/storefront');
    return { success: true, message: "Storefront settings updated successfully." };
}