'use server';

import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

// --- CREATE JOB OPENING ---

const JobOpeningSchema = z.object({
  title: z.string().min(3, { message: "Job title must be at least 3 characters long." }),
  description: z.string().optional(),
  department: z.string().optional(),
  location: z.string().optional(),
  created_by: z.string().uuid({ message: "Invalid creator ID." }),
});

export interface FormState {
    success: boolean;
    message: string;
    errors?: {
        [key: string]: string[];
    } | null;
}

export async function createJobOpening(prevState: FormState, formData: FormData): Promise<FormState> {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    const rawFormData = {
        title: formData.get('title'),
        description: formData.get('description'),
        department: formData.get('department'),
        location: formData.get('location'),
        created_by: formData.get('created_by'),
    };

    const validatedFields = JobOpeningSchema.safeParse(rawFormData);

    if (!validatedFields.success) {
        return {
            success: false,
            message: "Validation failed. Please check the form fields.",
            errors: validatedFields.error.flatten().fieldErrors,
        };
    }

    const { data: job, error } = await supabase.from('job_openings').insert({
        title: validatedFields.data.title,
        description: validatedFields.data.description,
        department: validatedFields.data.department,
        location: validatedFields.data.location,
        created_by: validatedFields.data.created_by,
        status: 'DRAFT',
    }).select('id').single();

    if (error || !job) {
        console.error('Supabase Error:', error);
        return {
            success: false,
            message: "Database Error: Failed to create the job opening.",
            errors: null,
        };
    }

    revalidatePath('/hr/recruitment');
    // Also revalidate the specific job page path, although it doesn't exist yet for the user
    revalidatePath(`/hr/recruitment/${job.id}`);

    return {
        success: true,
        message: "Job opening has been successfully created as a draft.",
        errors: null,
    };
}


// --- UPDATE APPLICANT STAGE ---

// Define the valid stages to prevent arbitrary updates.
const VALID_STAGES = ['APPLIED', 'SCREENING', 'INTERVIEW', 'OFFER', 'HIRED', 'REJECTED'];

/**
 * Updates the stage of a single applicant.
 * Called from the Kanban board after a drag-and-drop action.
 * @param applicantId - The UUID of the applicant to update.
 * @param newStage - The new stage for the applicant.
 */
export async function updateApplicantStage(applicantId: string, newStage: string): Promise<{ success: boolean; message: string }> {
    if (!VALID_STAGES.includes(newStage)) {
        return { success: false, message: "Invalid stage provided." };
    }

    if (!applicantId) {
        return { success: false, message: "Applicant ID is missing." };
    }

    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    // Update the applicant's stage in the database.
    const { data, error } = await supabase
        .from('applicants')
        .update({ stage: newStage })
        .eq('id', applicantId)
        .select('id, job_opening_id') // Select the job_opening_id to revalidate the correct path.
        .single();

    if (error || !data) {
        console.error('Supabase Error:', error);
        return { success: false, message: "Database Error: Failed to update applicant stage." };
    }

    // Revalidate the dynamic path for the specific job opening to reflect the change.
    revalidatePath(`/hr/recruitment/${data.job_opening_id}`);

    return { success: true, message: "Applicant stage updated." };
}