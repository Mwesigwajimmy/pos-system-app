'use server';

import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

// Define a schema for validating the incoming data.
const UpdateVisibilitySchema = z.object({
  productId: z.string().uuid(),
  isVisible: z.boolean(),
  isOnline: z.boolean(), // To know if we are creating a new record or updating
});

/**
 * Updates the visibility of a product on the online storefront.
 * If the product is not yet synced to the online store, it creates the entry.
 * @param productId - The UUID of the product to update.
 * @param isVisible - The new visibility status.
 * @param isOnline - Whether an `online_products` record already exists.
 */
export async function updateProductVisibility(productId: string, isVisible: boolean, isOnline: boolean): Promise<{ success: boolean; message: string }> {
    const validation = UpdateVisibilitySchema.safeParse({ productId, isVisible, isOnline });
    if (!validation.success) {
        return { success: false, message: "Invalid input provided." };
    }

    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    // This operation is an "UPSERT" (Update or Insert).
    // It will UPDATE the record if it exists, or INSERT it if it doesn't.
    // This is perfect for syncing a product to the online store for the first time.
    const { data: product, error } = await supabase
        .from('online_products')
        .upsert(
            {
                product_id: productId,
                is_visible: isVisible,
                // On first creation, we can generate a slug and copy the title.
                // For simplicity, we are only handling the visibility toggle here.
            },
            {
                onConflict: 'product_id', // This is the key that determines if a record exists
            }
        );

    if (error) {
        console.error('Supabase Error:', error);
        return { success: false, message: "Database Error: Failed to update product visibility." };
    }

    revalidatePath('/ecommerce/products');

    return { success: true, message: "Product visibility has been updated." };
}