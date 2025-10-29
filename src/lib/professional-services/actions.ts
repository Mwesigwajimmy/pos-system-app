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

const expenseSchema = z.object({
  description: z.string().min(3, { message: 'Description must be at least 3 characters.' }),
  amount: z.coerce.number().positive({ message: 'Amount must be a positive number.' }),
  date: z.string().min(1, { message: 'Please enter a valid date.' }),
  categoryId: z.string().uuid({ message: 'A valid category must be selected.' }),
  isBillable: z.enum(['on', 'off']).optional(),
  customerId: z.string().uuid().optional().nullable(),
  receiptUrl: z.string().url().optional().nullable(),
});

export async function createExpenseAction(prevState: FormState, formData: FormData): Promise<FormState> {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const validatedFields = expenseSchema.safeParse({
    description: formData.get('description'), amount: formData.get('amount'), date: formData.get('date'), categoryId: formData.get('category_id'),
    isBillable: formData.get('is_billable'), customerId: formData.get('customer_id') || null, receiptUrl: formData.get('receipt_url') || null,
  });
  if (!validatedFields.success) { return { success: false, message: 'Validation failed.', errors: validatedFields.error.flatten().fieldErrors }; }
  if (validatedFields.data.isBillable === 'on' && !validatedFields.data.customerId) { return { success: false, message: 'A customer must be selected for billable expenses.', errors: { customerId: ['Customer is required for billable expenses.'] } }; }
  const { error } = await supabase.from('expenses').insert({
    description: validatedFields.data.description, amount: validatedFields.data.amount, date: validatedFields.data.date, category_id: validatedFields.data.categoryId,
    customer_id: validatedFields.data.isBillable === 'on' ? validatedFields.data.customerId : null, receipt_url: validatedFields.data.receiptUrl,
  });
  if (error) { return { success: false, message: `Database Error: ${error.message}` }; }
  revalidatePath('/expenses');
  return { success: true, message: 'Expense successfully created.' };
}

const CreateTaskSchema = z.object({
  title: z.string().min(3, { message: 'Title must be at least 3 characters long.' }),
  dueDate: z.string().optional(),
});

export async function createTaskAction(prevState: FormState, formData: FormData): Promise<FormState> {
  const validatedFields = CreateTaskSchema.safeParse({ title: formData.get('title'), dueDate: formData.get('due_date') });
  if (!validatedFields.success) { return { success: false, message: 'Validation failed.', errors: validatedFields.error.flatten().fieldErrors }; }
  const supabase = createClient(cookies());
  const { error } = await supabase.from('compliance_tasks').insert({ title: validatedFields.data.title, due_date: validatedFields.data.dueDate || null, is_completed: false });
  if (error) { return { success: false, message: `Database Error: ${error.message}` }; }
  revalidatePath('/compliance');
  return { success: true, message: 'Successfully added new task.' };
}

export async function toggleTaskAction(formData: FormData) {
  const supabase = createClient(cookies());
  const id = formData.get('taskId') as string;
  const isCompleted = formData.get('isCompleted') === 'true';
  if (!id) return;
  const { error } = await supabase.from('compliance_tasks').update({ is_completed: isCompleted }).eq('id', id);
  if (error) { console.error('Toggle Task Error:', error); }
  revalidatePath('/compliance');
}

const JournalLineSchema = z.object({
    accountId: z.string().uuid(), debit: z.coerce.number().min(0), credit: z.coerce.number().min(0),
}).refine(data => data.debit > 0 || data.credit > 0, { message: "Each line must have a debit or credit." });

const JournalEntrySchema = z.object({
    date: z.string().min(1, { message: "Date is required." }),
    description: z.string().min(3, { message: "Description is required." }),
    lines: z.array(JournalLineSchema).min(2, { message: "A journal entry must have at least two lines." })
}).refine(data => {
    const totalDebits = data.lines.reduce((sum, line) => sum + line.debit, 0);
    const totalCredits = data.lines.reduce((sum, line) => sum + line.credit, 0);
    return Math.abs(totalDebits - totalCredits) < 0.001;
}, { message: "Total debits must equal total credits." });

export async function createJournalEntryAction(prevState: FormState, formData: FormData): Promise<FormState> {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: 'Authentication Error' };
    const { data: tenant } = await supabase.from('tenants').select('id').eq('owner_id', user.id).single();
    if (!tenant) return { success: false, message: 'Tenant not found.' };
    try {
        const lines = JSON.parse(formData.get('lines') as string);
        const validatedFields = JournalEntrySchema.safeParse({ date: formData.get('date'), description: formData.get('description'), lines });
        if (!validatedFields.success) { return { success: false, message: 'Invalid form data.', errors: validatedFields.error.flatten().fieldErrors }; }
        const { date, description, lines: entryLines } = validatedFields.data;
        const { data: newEntry, error: entryError } = await supabase.from('journal_entries').insert({ tenant_id: tenant.id, date, description }).select('id').single();
        if (entryError) throw entryError;
        const linesToInsert = entryLines.map(line => ({ journal_entry_id: newEntry.id, account_id: line.accountId, debit: line.debit, credit: line.credit }));
        const { error: linesError } = await supabase.from('journal_entry_lines').insert(linesToInsert);
        if (linesError) throw linesError;
        revalidatePath('/ledger');
        return { success: true, message: 'Journal entry created successfully.' };
    } catch (error: any) {
        return { success: false, message: 'Database Error: ' + error.message };
    }
}

const InviteAuditorSchema = z.object({
    email: z.string().email({ message: "A valid email is required." }),
    expiresAt: z.string().min(1, { message: "An expiry date is required." }),
    permissions: z.array(z.string()).min(1, { message: "At least one permission must be granted." }),
    welcomeMessage: z.string().optional(),
});

export async function inviteAuditorAction(prevState: FormState, formData: FormData): Promise<FormState> {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    try {
        const permissions = formData.getAll('permissions') as string[];
        const validatedFields = InviteAuditorSchema.safeParse({
            email: formData.get('email'), expiresAt: formData.get('expires_at'),
            permissions: permissions, welcomeMessage: formData.get('welcome_message'),
        });
        if (!validatedFields.success) { return { success: false, message: "Invalid form data.", errors: validatedFields.error.flatten().fieldErrors }; }
        const { email, expiresAt, permissions: grantedPermissions, welcomeMessage } = validatedFields.data;
        const { error } = await supabase.from('auditor_invitations').insert({ 
            email, status: 'pending', expires_at: expiresAt,
            permissions: grantedPermissions, welcome_message: welcomeMessage
        });
        if (error) {
            if (error.code === '23505') { return { success: false, message: `An active or pending invitation for ${email} already exists.` }; }
            throw error;
        }
        revalidatePath('/accountant');
        return { success: true, message: `Auditor invitation successfully sent to ${email}.` };
    } catch (error: any) {
        return { success: false, message: `Database Error: ${error.message}` };
    }
}

const BudgetLineSchema = z.object({
  accountId: z.string().uuid(),
  budgetedAmount: z.coerce.number().min(0),
});

const BudgetSchema = z.object({
    name: z.string().min(3, { message: "Budget name is required." }),
    year: z.coerce.number().min(2020, { message: "Please enter a valid year." }),
    lines: z.array(BudgetLineSchema).min(1, { message: "Budget must contain at least one line item." })
});

export async function createBudgetAction(prevState: FormState, formData: FormData): Promise<FormState> {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: 'Authentication Error' };
    const { data: tenant } = await supabase.from('tenants').select('id').eq('owner_id', user.id).single();
    if (!tenant) return { success: false, message: 'Tenant not found.' };
    try {
        const lines = JSON.parse(formData.get('lines') as string);
        const validatedFields = BudgetSchema.safeParse({ name: formData.get('name'), year: formData.get('year'), lines });
        if (!validatedFields.success) { return { success: false, message: 'Invalid form data.', errors: validatedFields.error.flatten().fieldErrors }; }
        const { name, year, lines: budgetLines } = validatedFields.data;
        const { data: newBudget, error: budgetError } = await supabase.from('budgets').insert({ tenant_id: tenant.id, name, year }).select('id').single();
        if (budgetError) throw budgetError;
        const linesToInsert = budgetLines.map(line => ({ budget_id: newBudget.id, account_id: line.accountId, budgeted_amount: line.budgetedAmount }));
        const { error: linesError } = await supabase.from('budget_lines').insert(linesToInsert);
        if (linesError) throw linesError;
        revalidatePath('/management/budgets');
        return { success: true, message: `Budget '${name}' created successfully.` };
    } catch (error: any) {
        return { success: false, message: 'Database Error: ' + error.message };
    }
}

export async function generateDraftBudgetAction(year: number, growthFactor: number): Promise<{ success: boolean; data?: any[]; message?: string; }> {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;
    const { data, error } = await supabase.from('general_ledger_view').select('account_id, account_name, account_type, total').gte('date', startDate).lte('date', endDate);
    if (error) {
        console.error("Draft budget generation error:", error);
        return { success: false, message: 'Could not fetch historical data.' };
    }
    const draftLines = data.map(item => ({
        accountId: item.account_id,
        accountName: item.account_name,
        accountType: item.account_type,
        budgetedAmount: item.account_type === 'Revenue' ? Math.round(item.total * (1 + growthFactor / 100)) : Math.round(item.total * (1 - growthFactor / 100))
    }));
    return { success: true, data: draftLines };
}