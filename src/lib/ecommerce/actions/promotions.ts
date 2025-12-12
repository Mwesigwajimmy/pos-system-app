'use server';

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

// 1. Validation Schema
const promotionSchema = z.object({
    code: z.string().min(3, "Code must be at least 3 characters").toUpperCase(),
    label: z.string().min(3, "Label is required"),
    type: z.enum(["Discount", "Shipping", "BOGO", "Gift"]),
    value: z.string().min(1, "Value is required"), // Keeping as string to handle '%' logic
    region: z.string().default('Global'),
    validFrom: z.string(),
    validTo: z.string(),
    currency: z.string().optional(),
});

export type PromotionFormValues = z.infer<typeof promotionSchema>;

// 2. Create Action
export async function createPromotion(data: PromotionFormValues) {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    // Auth Check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: "Unauthorized" };

    // Validation
    const parsed = promotionSchema.safeParse(data);
    if (!parsed.success) {
        return { success: false, message: "Invalid input data" };
    }

    // DB Insert
    const { error } = await supabase.from('promotions').insert({
        code: parsed.data.code,
        label: parsed.data.label,
        promo_type: parsed.data.type,
        discount_value: parsed.data.value,
        region_code: parsed.data.region,
        valid_from: parsed.data.validFrom,
        valid_to: parsed.data.validTo,
        currency_code: parsed.data.currency,
        is_active: true,
        tenant_id: user.id // Or fetch from organization context
    });

    if (error) {
        console.error("Create Promo Error:", error);
        return { success: false, message: "Failed to create promotion. Code might exist." };
    }

    revalidatePath('/ecommerce/marketing');
    return { success: true, message: "Promotion created successfully." };
}

// 3. Delete Action
export async function deletePromotion(id: string) {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    
    const { error } = await supabase.from('promotions').delete().eq('id', id);

    if (error) return { success: false, message: "Failed to delete promotion." };

    revalidatePath('/ecommerce/marketing');
    return { success: true, message: "Promotion deleted." };
}