'use server';

import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

// --- CREATE JOB ---

const CreateJobSchema = z.object({
  name: z.string().min(3, { message: "Job name must be at least 3 characters long." }),
  customer_id: z.string().uuid().optional().nullable(),
  estimated_budget: z.coerce.number().optional().nullable(),
  start_date: z.string().optional().nullable(),
});

export interface FormState {
    success: boolean;
    message: string;
    errors?: {
        [key: string]: string[];
    } | null;
}

async function generateProjectUID(supabase: any): Promise<string> {
    const { data, error } = await supabase
        .from('projects')
        .select('project_uid')
        .order('created_at', { ascending: false })
        .limit(1);

    if (error || !data || data.length === 0) {
        return 'PROJ-1001';
    }

    const lastId = data[0].project_uid;
    const lastNumber = parseInt(lastId.split('-')[1]);
    const newNumber = lastNumber + 1;
    return `PROJ-${newNumber}`;
}

export async function createContractorJob(prevState: FormState, formData: FormData): Promise<FormState> {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    const rawFormData = {
      ...Object.fromEntries(formData.entries()),
      start_date: formData.get('start_date') || null,
      customer_id: formData.get('customer_id') || null,
    };
    
    const validatedFields = CreateJobSchema.safeParse(rawFormData);

    if (!validatedFields.success) {
        return { success: false, message: "Validation failed.", errors: validatedFields.error.flatten().fieldErrors };
    }

    const newProjectUID = await generateProjectUID(supabase);

    const { error } = await supabase.from('projects').insert({
        project_uid: newProjectUID,
        name: validatedFields.data.name,
        customer_id: validatedFields.data.customer_id,
        estimated_budget: validatedFields.data.estimated_budget,
        start_date: validatedFields.data.start_date,
        status: 'PLANNING',
    });

    if (error) {
        console.error('Supabase Error:', error);
        return { success: false, message: "Database Error: Failed to create job.", errors: null };
    }

    revalidatePath('/contractor/jobs');
    revalidatePath('/contractor');

    return { success: true, message: `Job ${newProjectUID} has been created.`, errors: null };
}


// --- ADD JOB COST ---

const AddCostSchema = z.object({
    project_id: z.string().uuid(),
    description: z.string().min(3, { message: "Description must be at least 3 characters." }),
    amount: z.coerce.number().gt(0, { message: "Amount must be greater than zero." }),
    cost_type: z.enum(['LABOR', 'MATERIAL', 'SUBCONTRACTOR', 'EQUIPMENT', 'OTHER']),
    transaction_date: z.string().date(),
});

/**
 * Adds a new cost to a job and updates the project's total actual_cost.
 * Uses an RPC function to perform a transaction for data integrity.
 * @param prevState - The previous state of the form.
 * @param formData - The data submitted from the form.
 */
export async function addJobCost(prevState: FormState, formData: FormData): Promise<FormState> {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    const rawFormData = Object.fromEntries(formData.entries());
    const validatedFields = AddCostSchema.safeParse(rawFormData);

    if (!validatedFields.success) {
        return {
            success: false,
            message: "Validation failed. Please check the form fields.",
            errors: validatedFields.error.flatten().fieldErrors,
        };
    }
    
    // Using an RPC function allows us to perform a transaction,
    // ensuring both the cost is inserted AND the project total is updated.
    // This is crucial for financial data integrity.
    const { error } = await supabase.rpc('add_job_cost_and_update_project', {
        p_project_id: validatedFields.data.project_id,
        p_cost_type: validatedFields.data.cost_type,
        p_description: validatedFields.data.description,
        p_amount: validatedFields.data.amount,
        p_transaction_date: validatedFields.data.transaction_date
    });


    if (error) {
        console.error('Supabase RPC Error:', error);
        return {
            success: false,
            message: "Database Error: Failed to add the new cost.",
            errors: null,
        };
    }

    revalidatePath(`/contractor/jobs/${validatedFields.data.project_id}`);
    revalidatePath('/contractor'); // Revalidate dashboard as well

    return {
        success: true,
        message: "The new cost has been successfully added to the job.",
        errors: null,
    };
}