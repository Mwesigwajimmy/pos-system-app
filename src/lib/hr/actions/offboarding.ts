'use server';

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

export async function completeOffboardingStepAction(stepId: string) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // Verify user belongs to the same tenant as the step (security check)
  const { data: step } = await supabase
    .from('offboarding_checklist')
    .select('tenant_id')
    .eq('id', stepId)
    .single();
    
  if (!step) throw new Error("Step not found");

  const { data: currentUser } = await supabase
    .from('employees')
    .select('tenant_id')
    .eq('user_id', user.id)
    .single();

  if (currentUser?.tenant_id !== step.tenant_id) {
    throw new Error("Unauthorized access to this tenant data");
  }

  const { error } = await supabase
    .from('offboarding_checklist')
    .update({ 
      status: 'step complete', 
      completed_at: new Date().toISOString() 
    })
    .eq('id', stepId);

  if (error) throw new Error(error.message);

  revalidatePath('/hr/offboarding');
}