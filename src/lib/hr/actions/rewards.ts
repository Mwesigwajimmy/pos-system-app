'use server';

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

export async function addRewardAction(formData: FormData) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  
  // 1. Authenticate and Get Tenant Context
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("User not authenticated.");
  }

  const { data: employeeProfile, error: profileError } = await supabase
    .from('employees')
    .select('id, tenant_id')
    .eq('user_id', user.id)
    .single();

  if (profileError || !employeeProfile) {
    throw new Error("Employee profile not found for the current user.");
  }

  const tenantId = employeeProfile.tenant_id;

  // 2. Parse and Validate Input Data
  const employeeName = formData.get('employee') as string;
  const awardName = formData.get('award') as string;
  const awardType = formData.get('type') as string;
  const description = formData.get('description') as string;
  const rawValue = formData.get('value');
  const currency = formData.get('currency') as string || 'UGX';
  const entity = formData.get('entity') as string;
  const country = formData.get('country') as string;

  if (!employeeName || !awardName || !awardType) {
    // In a full implementation, return a validation error object to the UI
    return; 
  }

  // 3. Resolve Employee Name to ID (Multi-tenant safe)
  // We search strictly within the current tenant_id
  const nameParts = employeeName.trim().split(' ');
  const searchTerm = nameParts[0]; 

  const { data: targetEmployee, error: lookupError } = await supabase
    .from('employees')
    .select('id')
    .eq('tenant_id', tenantId)
    .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%`)
    .limit(1)
    .single();

  if (lookupError || !targetEmployee) {
    throw new Error(`Employee '${employeeName}' not found in this organization.`);
  }

  // 4. Execute Transaction
  const { error: insertError } = await supabase.from('employee_recognition').insert({
    tenant_id: tenantId,
    employee_id: targetEmployee.id,
    award_name: awardName,
    award_type: awardType,
    description: description || '',
    monetary_value: rawValue ? parseFloat(rawValue.toString()) : 0,
    currency: currency,
    awarded_date: new Date().toISOString()
  });

  if (insertError) {
    throw new Error(`Failed to save reward: ${insertError.message}`);
  }

  // 5. Refresh Data
  revalidatePath('/hr/rewards');
}