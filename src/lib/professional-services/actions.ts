'use server';

import { z } from 'zod';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export type FormState = {
    success: boolean;
    message: string;
    errors?: { [key: string]: string[] | undefined; } | null;
};

const TimeLogSchema = z.object({
  customerId: z.string().uuid({ message: 'Please select a valid client.' }),
  hours: z.coerce.number().gt(0, { message: 'Hours must be greater than 0.' }),
  description: z.string().min(3, { message: 'Description is required.' }),
});

export async function logBillableTime(prevState: FormState, formData: FormData): Promise<FormState> {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { return { success: false, message: 'Authentication error.' }; }

    const validatedFields = TimeLogSchema.safeParse({
        customerId: formData.get('customer_id'),
        hours: formData.get('hours'),
        description: formData.get('description'),
    });

    if (!validatedFields.success) {
        return { success: false, message: 'Invalid form data.', errors: validatedFields.error.flatten().fieldErrors };
    }
    const { customerId, hours, description } = validatedFields.data;

    const { error } = await supabase.from('time_entries').insert({ customer_id: customerId, hours, description, user_id: user.id });
    if (error) { return { success: false, message: 'Database Error: Could not log time entry.' }; }
    
    revalidatePath('/professional-services');
    return { success: true, message: `Successfully logged ${hours} hours.` };
}

const ClientSchema = z.object({
    name: z.string().min(2, { message: "Client name is required." }),
    email: z.string().email({ message: "A valid email is required." }),
    phone: z.string().optional(),
});

export async function createClientAction(prevState: FormState, formData: FormData): Promise<FormState> {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    const validatedFields = ClientSchema.safeParse({
        name: formData.get('name'),
        email: formData.get('email'),
        phone: formData.get('phone'),
    });

     if (!validatedFields.success) {
        return { success: false, message: 'Invalid form data.', errors: validatedFields.error.flatten().fieldErrors };
    }
    
    const { error } = await supabase.from('customers').insert([validatedFields.data]);
    if (error) { return { success: false, message: 'Database Error: Could not create client.' }; }

    revalidatePath('/professional-services/clients');
    return { success: true, message: 'New client added successfully.' };
}

const ProjectSchema = z.object({
    name: z.string().min(3, { message: "Project name is required." }),
    customerId: z.string().uuid({ message: "Please select a client." }),
    dueDate: z.string().optional(),
});

export async function createProjectAction(prevState: FormState, formData: FormData): Promise<FormState> {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    const validatedFields = ProjectSchema.safeParse({
        name: formData.get('name'),
        customerId: formData.get('customer_id'),
        dueDate: formData.get('due_date'),
    });

    if (!validatedFields.success) {
        return { success: false, message: 'Invalid form data.', errors: validatedFields.error.flatten().fieldErrors };
    }

    const { name, customerId, dueDate } = validatedFields.data;
    const { error } = await supabase.from('projects').insert({
        name,
        customer_id: customerId,
        due_date: dueDate || null,
        status: 'BACKLOG'
    });
    
    if (error) { return { success: false, message: 'Database Error: Could not create project.' }; }

    revalidatePath('/professional-services/projects');
    return { success: true, message: 'New project has been added to the backlog.' };
}

export async function updateProjectStatusAction(projectId: string, newStatus: 'BACKLOG' | 'IN_PROGRESS' | 'IN_REVIEW' | 'COMPLETED') {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    const { error } = await supabase
        .from('projects')
        .update({ status: newStatus })
        .eq('id', projectId);

    if (error) {
        console.error("Update Status Error:", error);
        return { success: false, message: 'Failed to update project status.' };
    }
    
    revalidatePath('/professional-services/projects');
    return { success: true, message: 'Project status updated.' };
}