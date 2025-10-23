'use server';

import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

// Define a schema for validating the leave request form data
const LeaveRequestSchema = z.object({
  employee_id: z.string().uuid({ message: "Invalid employee ID." }),
  leave_type_id: z.string().uuid({ message: "Please select a valid leave type." }),
  start_date: z.string().date({ message: "Invalid start date." }),
  end_date: z.string().date({ message: "Invalid end date." }),
  reason: z.string().optional(),
});

// Define the shape of the form state for better error handling
export interface FormState {
    success: boolean;
    message: string;
    errors?: {
        [key: string]: string[];
    } | null;
}

/**
 * Creates a new leave request in the database.
 * This is a server action that can be called directly from client components.
 * @param prevState - The previous state of the form (used for progressive enhancement).
 * @param formData - The data submitted from the form.
 */
export async function createLeaveRequest(prevState: FormState, formData: FormData): Promise<FormState> {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    // Convert FormData to a plain object
    const rawFormData = Object.fromEntries(formData.entries());

    // Validate the form data against the schema
    const validatedFields = LeaveRequestSchema.safeParse(rawFormData);

    if (!validatedFields.success) {
        return {
            success: false,
            message: "Validation failed. Please check your input.",
            errors: validatedFields.error.flatten().fieldErrors,
        };
    }

    // Check if the end date is before the start date
    if (new Date(validatedFields.data.end_date) < new Date(validatedFields.data.start_date)) {
         return {
            success: false,
            message: "The end date cannot be before the start date.",
            errors: null,
        };
    }

    // Insert the data into the database
    const { error } = await supabase.from('leave_requests').insert({
        employee_id: validatedFields.data.employee_id,
        leave_type_id: validatedFields.data.leave_type_id,
        start_date: validatedFields.data.start_date,
        end_date: validatedFields.data.end_date,
        reason: validatedFields.data.reason,
        status: 'PENDING', // Always starts as pending
    });

    if (error) {
        console.error('Supabase Error:', error);
        return {
            success: false,
            message: "Database Error: Failed to create leave request.",
            errors: null,
        };
    }

    // Revalidate the path to refresh the data on the page
    revalidatePath('/hr/leave');

    return {
        success: true,
        message: "Your leave request has been submitted successfully.",
        errors: null,
    };
}


/**
 * Updates the status of a leave request (e.g., approve or reject).
 * This action should only be accessible to managers.
 * @param requestId - The ID of the leave request to update.
 * @param status - The new status ('APPROVED' or 'REJECTED').
 * @param managerId - The ID of the manager performing the action.
 */
export async function updateLeaveRequestStatus(requestId: string, status: 'APPROVED' | 'REJECTED', managerId: string) {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    
    // In a real application, you would first verify that `managerId` actually has
    // the permission to approve requests for the employee who submitted it.
    
    // TODO: Add manager permission check logic here.

    const { data, error } = await supabase
        .from('leave_requests')
        .update({
            status: status,
            approved_by: managerId,
        })
        .eq('id', requestId)
        .select();

    if (error) {
        console.error('Supabase Error:', error);
        return { success: false, error: "Failed to update request status." };
    }
    
    // If the request was approved, we should also update the leave balance.
    // This is a critical step for a robust system.
    if (status === 'APPROVED' && data) {
        // This is a simplified example. A real implementation would need to handle
        // different leave years, partial days, and weekends more robustly.
        const request = data[0];
        const duration = (new Date(request.end_date).getTime() - new Date(request.start_date).getTime()) / (1000 * 3600 * 24) + 1;
        
        // Use an RPC call to safely increment the used_days
        const { error: balanceError } = await supabase.rpc('update_leave_balance', {
            p_employee_id: request.employee_id,
            p_leave_type_id: request.leave_type_id,
            p_days_to_add: duration,
            p_year: new Date(request.start_date).getFullYear()
        });
        
        if(balanceError) {
             console.error('Supabase Balance Error:', balanceError);
            // You might want to revert the approval if this fails.
        }
    }

    revalidatePath('/hr/leave');
    return { success: true };
}