'use server';

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

export async function assignVehicleAction(formData: FormData) {
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

  // Extract Data
  const vehicleModel = formData.get('vehicle') as string;
  const plateNumber = formData.get('plate') as string;
  const assignedToName = formData.get('assignedTo') as string;
  const licenseNumber = formData.get('driverLicense') as string;
  const licenseExpiry = formData.get('licenseExpiry') as string;
  const insuranceExpiry = formData.get('insuranceExpiry') as string;
  
  if (!vehicleModel || !plateNumber || !assignedToName) {
    throw new Error("Missing required fields");
  }

  // Resolve Employee
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
    throw new Error(`Employee '${assignedToName}' not found.`);
  }

  // Insert Assignment
  const { error } = await supabase.from('fleet_assignments').insert({
    tenant_id: tenantId,
    vehicle_model: vehicleModel,
    plate_number: plateNumber,
    assigned_to_employee_id: targetEmployee.id,
    license_number: licenseNumber,
    license_expiry: licenseExpiry || null,
    insurance_expiry: insuranceExpiry || null,
    status: 'active',
    assigned_date: new Date().toISOString(),
    notes: formData.get('notes') as string || ''
  });

  if (error) throw new Error(error.message);

  revalidatePath('/hr/fleet');
}