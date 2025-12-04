'use server';

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

export async function assignVehicleAction(formData: FormData) {
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

  if (!currentUser) throw new Error("Profile not found");
  const tenantId = currentUser.tenant_id;

  // 2. Parse Data
  const vehicle = formData.get('vehicle') as string;
  const plate = formData.get('plate') as string;
  const assignedToName = formData.get('assignedTo') as string;
  const driverLicense = formData.get('driverLicense') as string;
  const licenseExpiry = formData.get('licenseExpiry') as string;
  const insuranceExpiry = formData.get('insuranceExpiry') as string;

  if (!vehicle || !plate || !assignedToName) return;

  // 3. Lookup Employee
  const nameParts = assignedToName.trim().split(' ');
  const term = nameParts[0];

  const { data: targetEmployee, error: empError } = await supabase
    .from('employees')
    .select('id')
    .eq('tenant_id', tenantId)
    .or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%`)
    .limit(1)
    .single();

  if (empError || !targetEmployee) {
    throw new Error(`Driver '${assignedToName}' not found.`);
  }

  // 4. Insert Assignment
  const { error } = await supabase.from('fleet_assignments').insert({
    tenant_id: tenantId,
    vehicle_model: vehicle,
    plate_number: plate,
    assigned_to_employee_id: targetEmployee.id,
    license_number: driverLicense,
    license_expiry: licenseExpiry || null,
    insurance_expiry: insuranceExpiry || null,
    status: 'active',
    assigned_date: new Date().toISOString()
  });

  if (error) throw new Error(error.message);

  revalidatePath('/hr/fleet');
}