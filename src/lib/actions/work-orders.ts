'use server';

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

// --- Types ---
export type WorkOrderStatus = 'pending' | 'scheduled' | 'en_route' | 'in_progress' | 'paused' | 'completed' | 'canceled' | 'failed';

export interface WorkOrder {
  id: number;
  work_order_uid: string;
  reference: string;
  summary: string;
  status: WorkOrderStatus;
  scheduled_at: string | null;
  technician_name: string | null;
  customer_name: string | null;
  sla_minutes: number | null;
  priority: string;
}

export type FormState = {
  success: boolean;
  message: string;
  errors?: {
    summary?: string[];
    customer_id?: string[];
    scheduled_date?: string[];
  } | null;
};

// --- Schema ---
const CreateWOSchema = z.object({
  summary: z.string().min(5, "Summary must be at least 5 characters"),
  customer_id: z.string().uuid("Invalid customer ID"),
  scheduled_date: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
});

// --- Enterprise Security Helper ---
// This ensures we never trust the client for tenant_id
async function getAuthenticatedUserTenant(supabase: any) {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    throw new Error("Unauthorized: Please sign in.");
  }

  // Fetch the tenant_id from the public profile table to ensure data isolation
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('id', user.id)
    .single();

  if (profileError || !profile?.tenant_id) {
    throw new Error("Access Denied: No tenant association found for this user.");
  }

  return { user, tenantId: profile.tenant_id };
}

// --- Actions ---

export async function fetchWorkOrders(): Promise<WorkOrder[]> {
  const supabase = createClient(cookies());
  
  // 1. Securely resolve tenant
  const { tenantId } = await getAuthenticatedUserTenant(supabase);
  
  // 2. Execute Query scoped to that tenant
  const { data, error } = await supabase
    .from('work_orders')
    .select(`
      id, 
      work_order_uid, 
      reference,
      summary, 
      status, 
      scheduled_at, 
      sla_minutes,
      priority,
      technician:technicians(full_name),
      customer:customers(name)
    `)
    .eq('tenant_id', tenantId) // STRICT FILTER
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw new Error(error.message);

  return data.map((wo: any) => ({
    ...wo,
    technician_name: wo.technician?.full_name || 'Unassigned',
    customer_name: wo.customer?.name || 'Unknown',
  }));
}

export async function updateWorkOrderLifecycle(
  id: number,
  status: WorkOrderStatus,
  actor: string,
  comment?: string
) {
  const supabase = createClient(cookies());
  
  // 1. Validate Tenant Access
  const { tenantId } = await getAuthenticatedUserTenant(supabase);

  // 2. Perform Update via RPC (Audit Log + State Machine)
  // We pass tenant_id to the RPC to ensure the user owns the record
  const { error } = await supabase.rpc('update_work_order_status', {
    p_wo_id: id,
    p_status: status,
    p_actor: actor,
    p_comment: comment,
    p_tenant_id: tenantId // Pass to DB function for double-check
  });

  if (error) throw new Error(error.message);
  
  revalidatePath('/field-service/work-orders');
  return { success: true };
}

export async function createWorkOrder(prevState: FormState, formData: FormData): Promise<FormState> {
  const supabase = createClient(cookies());
  
  // 1. Validate Input Data
  const validatedFields = CreateWOSchema.safeParse({
    summary: formData.get('summary'),
    customer_id: formData.get('customer_id'),
    scheduled_date: formData.get('scheduled_date'),
    priority: formData.get('priority'),
  });

  if (!validatedFields.success) {
    return {
      success: false,
      message: 'Validation failed',
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  // 2. Securely Resolve Context
  let tenantId: string;
  try {
    const context = await getAuthenticatedUserTenant(supabase);
    tenantId = context.tenantId;
  } catch (e: any) {
    return { success: false, message: e.message, errors: null };
  }

  const { data } = validatedFields;

  // 3. Insert into Database
  // We explicitly set the tenant_id derived from the session, NOT the form data
  const { error } = await supabase.from('work_orders').insert({
    summary: data.summary,
    customer_id: data.customer_id,
    priority: data.priority,
    scheduled_at: data.scheduled_date || null,
    status: 'pending',
    tenant_id: tenantId, // SECURE: Server-derived
    reference: `WO-${Date.now().toString().slice(-6)}` // Fallback if DB trigger fails
  });

  if (error) {
    console.error("DB Insert Error:", error);
    return { success: false, message: 'System Error: Could not create work order.', errors: null };
  }

  revalidatePath('/field-service/work-orders');
  return { success: true, message: 'Work Order created successfully', errors: null };
}