'use server';

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

export async function addBenefitAction(formData: FormData) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: employeeProfile } = await supabase
    .from('employees')
    .select('tenant_id')
    .eq('user_id', user.id)
    .single();

  if (!employeeProfile) throw new Error("Profile not found");
  const tenantId = employeeProfile.tenant_id;

  const { error } = await supabase.from('benefits_packages').insert({
    tenant_id: tenantId,
    name: formData.get('benefit') as string,
    description: formData.get('coverage') as string,
    eligibility_criteria: formData.get('availableTo') as string,
    applicable_department: formData.get('entity') as string,
    country_code: formData.get('country') as string,
    benefit_type: formData.get('type') as string,
    is_active: true
  });

  if (error) throw new Error(`Database error: ${error.message}`);

  revalidatePath('/hr/benefits');
}