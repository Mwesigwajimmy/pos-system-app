'use server';

import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

// Define a schema for validating the new support ticket form data.
const CreateTicketSchema = z.object({
  subject: z.string().min(5, { message: "Subject must be at least 5 characters long." }),
  description: z.string().min(10, { message: "Description must be at least 10 characters long." }),
  customer_id: z.string().uuid({ message: "A valid customer must be selected." }),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  // assigned_to: z.string().uuid().optional(), // For future auto-assignment logic
});

export interface FormState {
    success: boolean;
    message: string;
    errors?: {
        [key: string]: string[];
    } | null;
}

/**
 * Generates a unique, sequential, human-readable ticket ID.
 * It fetches the latest ticket ID and increments it.
 * @param supabase - The Supabase client instance.
 * @returns {Promise<string>} - The new ticket ID (e.g., "SUP-1001").
 */
async function generateTicketUID(supabase: any): Promise<string> {
    // This is a simplified approach. For high-concurrency environments, a database sequence
    // or a more robust locking mechanism would be better.
    const { data, error } = await supabase
        .from('support_tickets')
        .select('ticket_uid')
        .order('created_at', { ascending: false })
        .limit(1);

    if (error || !data || data.length === 0) {
        // This is the very first ticket
        return 'SUP-1001';
    }

    const lastId = data[0].ticket_uid;
    const lastNumber = parseInt(lastId.split('-')[1]);
    const newNumber = lastNumber + 1;
    return `SUP-${newNumber}`;
}


/**
 * Creates a new support ticket in the database.
 * @param prevState - The previous state of the form.
 * @param formData - The data submitted from the form.
 */
export async function createSupportTicket(prevState: FormState, formData: FormData): Promise<FormState> {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    const rawFormData = Object.fromEntries(formData.entries());
    const validatedFields = CreateTicketSchema.safeParse(rawFormData);

    if (!validatedFields.success) {
        return {
            success: false,
            message: "Validation failed. Please check the form fields.",
            errors: validatedFields.error.flatten().fieldErrors,
        };
    }

    const newTicketUID = await generateTicketUID(supabase);

    const { error } = await supabase.from('support_tickets').insert({
        ticket_uid: newTicketUID,
        subject: validatedFields.data.subject,
        description: validatedFields.data.description,
        customer_id: validatedFields.data.customer_id,
        priority: validatedFields.data.priority,
        status: 'OPEN', // All new tickets start as OPEN
    });

    if (error) {
        console.error('Supabase Error:', error);
        return {
            success: false,
            message: "Database Error: Failed to create the support ticket.",
            errors: null,
        };
    }

    revalidatePath('/crm/support');

    return {
        success: true,
        message: `Support ticket ${newTicketUID} has been created successfully.`,
        errors: null,
    };
}