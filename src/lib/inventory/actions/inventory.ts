'use server';

import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

// --- SHARED TYPES ---

// For simple actions not returning form state
interface ActionResult {
    success: boolean;
    message: string;
}
// For actions that handle form submissions and return detailed errors
export interface FormState {
    success: boolean;
    message: string;
    errors?: { [key: string]: string[] } | null;
}


// --- UPDATE TRACKING METHOD ---

const UpdateTrackingSchema = z.enum(['QUANTITY', 'SERIAL', 'LOT']);

export async function updateProductTrackingMethod(productId: string, method: string): Promise<ActionResult> {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    if (!productId) {
        return { success: false, message: "Product ID is missing." };
    }
    const validatedMethod = UpdateTrackingSchema.safeParse(method);
    if (!validatedMethod.success) {
        return { success: false, message: "Invalid tracking method provided." };
    }

    const { error } = await supabase
        .from('products')
        .update({ inventory_tracking_method: validatedMethod.data })
        .eq('id', productId);

    if (error) {
        console.error("Error updating tracking method:", error);
        return { success: false, message: "Database error: Could not update tracking method." };
    }

    revalidatePath(`/inventory/products/${productId}`);
    return { success: true, message: "Inventory tracking method updated successfully." };
}

// --- ADD SERIAL NUMBER ---

const AddSerialSchema = z.object({
    productId: z.string().uuid(),
    serialNumber: z.string().min(1, "Serial number cannot be empty.")
});

export async function addSerialNumber(prevState: FormState, formData: FormData): Promise<FormState> {
    // TODO: Implement the full logic for adding a serial number
    console.log("addSerialNumber called", Object.fromEntries(formData.entries()));
    revalidatePath(`/inventory/products/${formData.get('productId')}`);
    return { success: true, message: "Serial number added (logic pending)." };
}

// --- ADD LOT NUMBER ---

const AddLotSchema = z.object({
    productId: z.string().uuid(),
    lotNumber: z.string().min(1, "Lot number cannot be empty."),
    quantity: z.coerce.number().int().gt(0),
    expiryDate: z.string().optional().nullable()
});

export async function addLotNumber(prevState: FormState, formData: FormData): Promise<FormState> {
    // TODO: Implement the full logic for adding a lot number
    console.log("addLotNumber called", Object.fromEntries(formData.entries()));
    revalidatePath(`/inventory/products/${formData.get('productId')}`);
    return { success: true, message: "Lot number added (logic pending)." };
}

// --- NEW SMART ACTION: UPDATE REORDER SETTINGS ---

const ReorderSettingsSchema = z.object({
    productId: z.string().uuid(),
    reorder_point: z.coerce.number().int().min(0, "Reorder point must be 0 or greater.").optional().nullable(),
    reorder_quantity: z.coerce.number().int().min(1, "Reorder quantity must be at least 1.").optional().nullable(),
    preferred_vendor_id: z.string().uuid().optional().nullable(),
});

export async function updateProductReorderSettings(prevState: FormState, formData: FormData): Promise<FormState> {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    
    // Sanitize raw data before validation
    const rawData = {
        productId: formData.get('productId'),
        reorder_point: formData.get('reorder_point') || null,
        reorder_quantity: formData.get('reorder_quantity') || null,
        // Handle the 'none' value from the select input
        preferred_vendor_id: formData.get('preferred_vendor_id') === 'none' ? null : formData.get('preferred_vendor_id'),
    };
    
    const validated = ReorderSettingsSchema.safeParse(rawData);
    if (!validated.success) {
        return { success: false, message: "Validation failed.", errors: validated.error.flatten().fieldErrors };
    }

    const { error } = await supabase.from('products').update({
        reorder_point: validated.data.reorder_point,
        reorder_quantity: validated.data.reorder_quantity,
        preferred_vendor_id: validated.data.preferred_vendor_id,
    }).eq('id', validated.data.productId);

    if (error) {
        console.error("Reorder settings update error:", error);
        return { success: false, message: "Database Error: " + error.message };
    }
    
    revalidatePath(`/inventory/products/${validated.data.productId}`);
    return { success: true, message: "Reorder settings have been updated." };
}