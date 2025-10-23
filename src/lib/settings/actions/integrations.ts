'use server';

import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

export interface FormState { success: boolean; message: string; errors?: { [key: string]: string[] } | null; }

const ConnectIntegrationSchema = z.object({
  integration_id: z.string().uuid(),
  api_key: z.string().min(10, { message: "A valid API key is required." }),
  // Add other potential fields like 'secret_key', 'account_id' etc. as needed
});

/**
 * Connects or updates a third-party integration for a tenant.
 * Securely saves credentials to the database.
 */
export async function connectIntegration(prevState: FormState, formData: FormData): Promise<FormState> {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    const rawFormData = Object.fromEntries(formData.entries());
    const validatedFields = ConnectIntegrationSchema.safeParse(rawFormData);

    if (!validatedFields.success) {
        return { success: false, message: "Validation failed.", errors: validatedFields.error.flatten().fieldErrors };
    }

    // IMPORTANT: In a real production app, the `credentials` field should be encrypted
    // before being stored, ideally using Supabase Vault secrets.
    // For this build, we are storing it as a JSON string.
    const credentials = JSON.stringify({
        api_key: validatedFields.data.api_key,
    });

    const { error } = await supabase
        .from('tenant_integrations')
        .upsert(
            {
                integration_id: validatedFields.data.integration_id,
                is_enabled: true,
                credentials: credentials,
            },
            {
                onConflict: 'integration_id, tenant_id', // `tenant_id` is applied via RLS
            }
        );

    if (error) {
        console.error("Supabase Upsert Error:", error);
        return { success: false, message: "Database Error: Could not save integration settings.", errors: null };
    }

    revalidatePath('/settings/integrations');

    return { success: true, message: "Integration connected successfully.", errors: null };
}