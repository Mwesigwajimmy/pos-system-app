'use server';

import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

export interface FormState { success: boolean; message: string; errors?: { [key: string]: string[] } | null; }

// --- Update Tracking Method ---
const UpdateTrackingSchema = z.object({
  productId: z.string().uuid(),
  method: z.enum(['QUANTITY', 'SERIAL', 'LOT']),
});

export async function updateProductTrackingMethod(productId: string, method: 'QUANTITY' | 'SERIAL' | 'LOT') {
    const validation = UpdateTrackingSchema.safeParse({ productId, method });
    if (!validation.success) return { success: false, message: "Invalid input." };
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    const { error } = await supabase.from('products').update({ inventory_tracking_method: method }).eq('id', productId);
    if (error) return { success: false, message: "Database Error: " + error.message };
    revalidatePath(`/inventory/products/${productId}`);
    return { success: true, message: "Inventory tracking method updated." };
}

// --- Add Serial Number ---
const AddSerialSchema = z.object({
  productId: z.string().uuid(),
  serialNumber: z.string().min(1, "Serial number cannot be empty."),
});

export async function addSerialNumber(prevState: FormState, formData: FormData): Promise<FormState> {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    const rawData = Object.fromEntries(formData.entries());
    const validated = AddSerialSchema.safeParse(rawData);
    if (!validated.success) return { success: false, message: "Validation failed.", errors: validated.error.flatten().fieldErrors };
    const { error } = await supabase.from('serial_numbers').insert({ product_id: validated.data.productId, serial_number: validated.data.serialNumber });
    if (error) {
        if (error.code === '23505') return { success: false, message: "This serial number already exists for this product." };
        return { success: false, message: "Database Error: " + error.message };
    }
    revalidatePath(`/inventory/products/${validated.data.productId}`);
    return { success: true, message: "Serial number added." };
}

// --- Add Lot Number ---
const AddLotSchema = z.object({
  productId: z.string().uuid(),
  lotNumber: z.string().min(1, "Lot number cannot be empty."),
  quantity: z.coerce.number().int().gt(0, "Quantity must be a positive number."),
  expiryDate: z.string().optional().nullable(),
});

export async function addLotNumber(prevState: FormState, formData: FormData): Promise<FormState> {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    const rawData = { ...Object.fromEntries(formData.entries()), expiryDate: formData.get('expiryDate') || null };
    const validated = AddLotSchema.safeParse(rawData);
    if (!validated.success) return { success: false, message: "Validation failed.", errors: validated.error.flatten().fieldErrors };
    const { error } = await supabase.from('lot_numbers').insert({
        product_id: validated.data.productId,
        lot_number: validated.data.lotNumber,
        quantity_in_stock: validated.data.quantity,
        expiry_date: validated.data.expiryDate,
    });
    if (error) {
        if (error.code === '23505') return { success: false, message: "This lot number already exists for this product." };
        return { success: false, message: "Database Error: " + error.message };
    }
    revalidatePath(`/inventory/products/${validated.data.productId}`);
    return { success: true, message: "Lot added successfully." };
}