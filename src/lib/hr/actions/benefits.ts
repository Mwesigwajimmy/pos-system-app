'use server';

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

export async function addBenefitAction(formData: FormData) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: currentUser } = await supabase
    .from('employees')
    .select('tenant_id')
    .eq('user_id', user.id)
    .single();

  if (!currentUser) throw new Error("Profile not found");
  const tenantId = currentUser.tenant_id;

  const benefitName = formData.get('benefit') as string;
  const coverage = formData.get('coverage') as string;
  const eligibility = formData.get('availableTo') as string;
  const entity = formData.get('entity') as string;
  const country = formData.get('country') as string;
  const type = formData.get('type') as string;

  const { error } = await supabase.from('benefits_packages').insert({
    tenant_id: tenantId,
    name: benefitName,
    description: coverage,
    eligibility_criteria: eligibility,
    applicable_department: entity,
    country_code: country,
    benefit_type: type,
    is_active: true
  });

  if (error) throw new Error(error.message);

  revalidatePath('/hr/benefits');
}