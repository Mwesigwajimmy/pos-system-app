'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server'; // Adjust to your Supabase client path
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

// --- Validation Schema for Creating Tasks ---
const CreateTaskSchema = z.object({
  title: z.string().min(3, { message: 'Title must be at least 3 characters long.' }),
  dueDate: z.string().optional(), // Comes from <input type="date">
});


// --- State Definition for the Create Form ---
export interface CreateFormState {
  success: boolean;
  message: string;
  errors?: {
    title?: string[];
    dueDate?: string[];
  };
}

// --- Server Action to CREATE a new compliance task ---
export async function createTaskAction(
  prevState: CreateFormState,
  formData: FormData,
): Promise<CreateFormState> {
  const validatedFields = CreateTaskSchema.safeParse({
    title: formData.get('title'),
    dueDate: formData.get('due_date'),
  });

  if (!validatedFields.success) {
    return {
      success: false,
      message: 'Validation failed. Please check your input.',
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }
  
  const supabase = createClient(cookies());
  const { error } = await supabase.from('compliance_tasks').insert({
    title: validatedFields.data.title,
    due_date: validatedFields.data.dueDate || null,
    is_completed: false,
  });

  if (error) {
    return { success: false, message: `Database Error: ${error.message}` };
  }

  revalidatePath('/finance/tax-management'); // Revalidate the page to show the new task
  return { success: true, message: 'Successfully added new task.' };
}


// --- Server Action to TOGGLE a task's completion status ---
export async function toggleTaskAction(formData: FormData) {
  const supabase = createClient(cookies());
  const id = formData.get('taskId') as string;
  const isCompleted = formData.get('isCompleted') === 'true';

  if (!id) return;

  const { error } = await supabase
    .from('compliance_tasks')
    .update({ is_completed: isCompleted })
    .eq('id', id);

  if (error) {
    console.error('Toggle Task Error:', error);
    // In a real app, you might return an error state
  }
  
  revalidatePath('/finance/tax-management'); // Revalidate the page to update the task's position
}