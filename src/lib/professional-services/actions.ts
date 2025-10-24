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
    const validatedFields = TimeLogSchema.safeParse({ customerId: formData.get('customer_id'), hours: formData.get('hours'), description: formData.get('description') });
    if (!validatedFields.success) { return { success: false, message: 'Invalid form data.', errors: validatedFields.error.flatten().fieldErrors }; }
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
    const validatedFields = ClientSchema.safeParse({ name: formData.get('name'), email: formData.get('email'), phone: formData.get('phone') });
    if (!validatedFields.success) { return { success: false, message: 'Invalid form data.', errors: validatedFields.error.flatten().fieldErrors }; }
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
    const validatedFields = ProjectSchema.safeParse({ name: formData.get('name'), customerId: formData.get('customer_id'), dueDate: formData.get('due_date') });
    if (!validatedFields.success) { return { success: false, message: 'Invalid form data.', errors: validatedFields.error.flatten().fieldErrors }; }
    const { name, customerId, dueDate } = validatedFields.data;
    const { error } = await supabase.from('projects').insert({ name, customer_id: customerId, due_date: dueDate || null, status: 'BACKLOG' });
    if (error) { return { success: false, message: 'Database Error: Could not create project.' }; }
    revalidatePath('/professional-services/projects');
    return { success: true, message: 'New project has been added to the backlog.' };
}

export async function updateProjectStatusAction(projectId: string, newStatus: 'BACKLOG' | 'IN_PROGRESS' | 'IN_REVIEW' | 'COMPLETED') {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    const { error } = await supabase.from('projects').update({ status: newStatus }).eq('id', projectId);
    if (error) { console.error("Update Status Error:", error); return { success: false, message: 'Failed to update project status.' }; }
    revalidatePath('/professional-services/projects');
    return { success: true, message: 'Project status updated.' };
}

export async function generateInvoiceFromTimeEntries(customerId: string): Promise<{ success: boolean; message: string; }> {
    if (!customerId) { return { success: false, message: 'Client ID is required.' }; }
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    const { data: timeEntries, error: fetchError } = await supabase.from('time_entries').select('id, hours, rate, description').eq('customer_id', customerId).eq('is_billed', false);
    if (fetchError || !timeEntries || timeEntries.length === 0) { return { success: false, message: 'No unbilled time entries found for this client.' }; }
    let totalAmount = 0;
    const lineItems = timeEntries.map(entry => {
        const lineTotal = (entry.hours || 0) * (entry.rate || 0);
        totalAmount += lineTotal;
        return { description: entry.description, quantity: entry.hours, unit_price: entry.rate, total: lineTotal };
    });
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);
    const { data: newInvoice, error: invoiceError } = await supabase.from('invoices').insert({ customer_id: customerId, total: totalAmount, due_date: dueDate.toISOString(), status: 'DUE', line_items: lineItems }).select('id').single();
    if (invoiceError || !newInvoice) { return { success: false, message: 'Database Error: Could not create invoice.' }; }
    const entryIds = timeEntries.map(entry => entry.id);
    const { error: updateError } = await supabase.from('time_entries').update({ is_billed: true, invoice_id: newInvoice.id }).in('id', entryIds);
    if (updateError) { return { success: false, message: 'Database Error: Could not update time entries.' }; }
    revalidatePath('/professional-services/billing');
    return { success: true, message: `Invoice created successfully for ${totalAmount.toFixed(2)}.` };
}

const FolderSchema = z.object({ name: z.string().min(1, "Folder name is required.") });

export async function createFolderAction(parentId: string | null, prevState: FormState, formData: FormData): Promise<FormState> {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: 'Authentication Error' };
    const validatedFields = FolderSchema.safeParse({ name: formData.get('name') });
    if (!validatedFields.success) return { success: false, message: 'Invalid data', errors: validatedFields.error.flatten().fieldErrors };
    const { data: tenant } = await supabase.from('tenants').select('id').eq('owner_id', user.id).single();
    if (!tenant) return { success: false, message: 'Tenant not found.' };
    const { error } = await supabase.from('documents').insert({ name: validatedFields.data.name, type: 'FOLDER', parent_id: parentId, tenant_id: tenant.id });
    if (error) { return { success: false, message: 'Database Error: Could not create folder.' }; }
    revalidatePath('/professional-services/documents', 'layout');
    return { success: true, message: 'Folder created.' };
}

export async function uploadDocumentAction(parentId: string | null, prevState: FormState, formData: FormData): Promise<FormState> {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    const file = formData.get('file') as File;
    const customerId = formData.get('customer_id') as string || null;
    if (!file || file.size === 0) return { success: false, message: 'File is required.' };
    const { data: user_data } = await supabase.auth.getUser();
    if (!user_data.user) return { success: false, message: 'Authentication Error' };
    const { data: tenant } = await supabase.from('tenants').select('id').eq('owner_id', user_data.user.id).single();
    if (!tenant) return { success: false, message: 'Tenant not found.' };
    const filePath = `${tenant.id}/${parentId || 'root'}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from('documents').upload(filePath, file);
    if (uploadError) return { success: false, message: 'Storage Error: ' + uploadError.message };
    const { error: dbError } = await supabase.from('documents').insert({ name: file.name, type: 'FILE', storage_path: filePath, file_type: file.type, size: file.size, parent_id: parentId, customer_id: customerId, tenant_id: tenant.id });
    if (dbError) { return { success: false, message: 'Database Error: Could not save file metadata.' }; }
    revalidatePath('/professional-services/documents', 'layout');
    return { success: true, message: 'File uploaded successfully.' };
}