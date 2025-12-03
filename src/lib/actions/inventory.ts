'use server';

import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

// Action 1: Update Reorder Settings
export async function updateReorderSettings(
  productId: string, 
  reorderPoint: number, 
  reorderQuantity: number, 
  vendorId: string
) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  try {
    const { error } = await supabase
      .from('products')
      .update({
        reorder_point: reorderPoint,
        reorder_quantity: reorderQuantity,
        preferred_vendor_id: vendorId === "none" ? null : vendorId,
        updated_at: new Date().toISOString()
      })
      .eq('id', productId);

    if (error) throw error;

    revalidatePath(`/inventory/products/${productId}`);
    return { success: true, message: "Settings saved successfully" };

  } catch (err: any) {
    return { success: false, message: err.message || "An unexpected error occurred" };
  }
}

// Action 2: Update Tracking Method (Fixes your current issue)
export async function updateTrackingMethod(productId: string, method: 'SERIAL' | 'LOT' | 'NONE') {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  try {
    const { error } = await supabase
      .from('products')
      .update({ 
        inventory_tracking_method: method,
        updated_at: new Date().toISOString() 
      })
      .eq('id', productId);

    if (error) throw error;

    revalidatePath(`/inventory/products/${productId}`);
    return { success: true, message: `Tracking method updated to ${method}` };
  } catch (err: any) {
    return { success: false, message: err.message || "Failed to update tracking method" };
  }
}