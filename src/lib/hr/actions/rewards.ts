'use server';

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

export async function addRewardAction(formData: FormData) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  
  // 1. Auth & Tenant Context
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: currentUser } = await supabase
    .from('employees')
    .select('tenant_id')
    .eq('user_id', user.id)
    .single();

  if (!currentUser) throw new Error("User not linked to an employee profile");
  const tenantId = currentUser.tenant_id;

  // 2. Parse Form Data
  const employeeName = formData.get('employee') as string;
  const award = formData.get('award') as string;
  const type = formData.get('type') as string;
  const description = formData.get('description') as string;
  const value = formData.get('value');

  if (!employeeName || !award) return;

  // 3. Lookup Employee ID by Name (Splitting First/Last)
  // We search for a match in either First Name or Last Name to find the target.
  const nameParts = employeeName.trim().split(' ');
  const term = nameParts[0]; // Use first part for search to be safe

  const { data: targetEmployee, error: empError } = await supabase
    .from('employees')
    .select('id')
    .eq('tenant_id', tenantId)
    .or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%`)
    .limit(1)
    .single();

  if (empError || !targetEmployee) {
    throw new Error(`Employee '${employeeName}' not found.`);
  }

  // 4. Insert Record
  const { error } = await supabase.from('employee_recognition').insert({
    tenant_id: tenantId,
    employee_id: targetEmployee.id,
    award_name: award,
    award_type: type,
    description: description,
    monetary_value: value ? Number(value) : 0,
    currency: 'UGX', 
    awarded_date: new Date().toISOString()
  });

  if (error) throw new Error(error.message);

  revalidatePath('/hr/rewards');
}