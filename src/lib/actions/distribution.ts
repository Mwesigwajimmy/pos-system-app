'use server';

import { createClient } from "@/lib/supabase/server"; 
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers"; // <--- 1. Add this import

// Helper to get User and Business Context
async function getAuthContext(supabase: any) {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("Unauthorized Access");

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('business_id')
    .eq('id', user.id)
    .single();

  if (profileError || !profile?.business_id) {
    throw new Error("User account is not linked to a Business ID");
  }

  return { user, businessId: profile.business_id };
}

export async function addDriverAssignmentAction(formData: FormData) {
  // 2. Pass cookies to createClient
  const supabase = await createClient(await cookies());
  
  try {
    const { user, businessId } = await getAuthContext(supabase);

    const entry = {
      business_id: businessId,
      driver_name: formData.get('driverName') as string,
      route_name: formData.get('route') as string,
      vehicle_reg: formData.get('vehicle') as string,
      region: formData.get('region') as string,
      country_code: formData.get('country') as string,
      currency_code: (formData.get('currency') as string) || 'USD',
      status: 'active',
      created_by: user.id
    };

    const { error } = await supabase
      .from('distribution_driver_assignments')
      .insert(entry);

    if (error) throw new Error(error.message);

    revalidatePath('/(dashboard)/distribution/assignments', 'page');
    return { success: true, message: "Driver successfully assigned." };
  } catch (error: any) {
    console.error("Assign Error:", error);
    return { success: false, message: error.message };
  }
}

export async function removeDriverAssignmentAction(assignmentId: string) {
  const supabase = await createClient(await cookies()); // Fixed

  try {
    const { error } = await supabase
      .from('distribution_driver_assignments')
      .delete()
      .eq('id', assignmentId);

    if (error) throw new Error(error.message);

    revalidatePath('/(dashboard)/distribution/assignments', 'page');
    return { success: true, message: "Assignment removed." };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

// --- COLD CHAIN ACTIONS ---

export async function logColdChainEntryAction(formData: FormData) {
  const supabase = await createClient(await cookies()); // Fixed

  try {
    const { user, businessId } = await getAuthContext(supabase);

    const minTemp = parseFloat(formData.get('minTemp') as string);
    const maxTemp = parseFloat(formData.get('maxTemp') as string);

    const status = (minTemp < 0 || maxTemp > 8) ? 'alert' : 'ok';

    const entry = {
      business_id: businessId,
      vehicle_reg: formData.get('vehicle') as string,
      driver_name: formData.get('driver') as string,
      region: formData.get('region') as string,
      country_code: formData.get('country') as string,
      min_temp: minTemp,
      max_temp: maxTemp,
      status: status,
      created_by: user.id
    };

    const { error } = await supabase
      .from('distribution_cold_chain_logs')
      .insert(entry);

    if (error) throw new Error(error.message);

    revalidatePath('/(dashboard)/distribution/cold-chain', 'page');
    return { success: true, message: "Temperature log recorded." };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

// --- MAINTENANCE ACTIONS ---

export async function addMaintenanceLogAction(formData: FormData) {
  const supabase = await createClient(await cookies()); // Fixed
  try {
    const { user, businessId } = await getAuthContext(supabase);

    const entry = {
      business_id: businessId,
      vehicle_reg: formData.get('vehicle') as string,
      issue_description: formData.get('issue') as string,
      service_performed: formData.get('service') as string,
      cost: parseFloat(formData.get('cost') as string),
      currency_code: formData.get('currency') || 'USD',
      service_provider: formData.get('provider') as string,
      serviced_at: formData.get('date') as string,
      next_due: formData.get('nextDue') as string,
      country_code: formData.get('country') as string,
      status: 'completed'
    };

    const { error } = await supabase.from('distribution_maintenance_logs').insert(entry);
    if (error) throw new Error(error.message);

    revalidatePath('/(dashboard)/distribution/maintenance', 'page');
    return { success: true, message: "Maintenance log added." };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

// --- GEOFENCING ACTIONS ---

export async function addGeofenceAction(formData: FormData) {
  const supabase = await createClient(await cookies()); // Fixed
  try {
    const { user, businessId } = await getAuthContext(supabase);

    const type = formData.get('type') as string;
    
    const entry = {
      business_id: businessId,
      name: formData.get('name') as string,
      driver_name: formData.get('driver') as string,
      country_code: formData.get('country') as string,
      boundary_type: type,
      radius_km: type === 'circle' ? parseFloat(formData.get('radius') as string) : null,
      active: true
    };

    const { error } = await supabase.from('distribution_geofences').insert(entry);
    if (error) throw new Error(error.message);

    revalidatePath('/(dashboard)/distribution/geofencing', 'page');
    return { success: true, message: "Geofence created." };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}