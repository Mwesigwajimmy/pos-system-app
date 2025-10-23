'use server';

import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const RescheduleSchema = z.object({
  workOrderId: z.string().uuid(),
  newDate: z.date(),
});

/**
 * Updates the scheduled_date of a work order.
 * Called from the Dispatch Calendar after a drag-and-drop action.
 * @param workOrderId - The UUID of the work order to update.
 * @param newDate - The new scheduled date and time.
 */
export async function rescheduleWorkOrder(workOrderId: string, newDate: Date): Promise<{ success: boolean; message: string }> {
    const validation = RescheduleSchema.safeParse({ workOrderId, newDate });
    if (!validation.success) {
        return { success: false, message: "Invalid input provided." };
    }

    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    const { error } = await supabase
        .from('work_orders')
        .update({ scheduled_date: newDate.toISOString() })
        .eq('id', workOrderId);

    if (error) {
        console.error('Supabase Error:', error);
        return { success: false, message: "Database Error: Failed to reschedule work order." };
    }

    revalidatePath('/field-service/schedule');

    return { success: true, message: "Work order rescheduled successfully." };
}