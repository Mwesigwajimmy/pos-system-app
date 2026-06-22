'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function recordClientPayment(formData: FormData) {
    const supabase = createClient();
    
    const data = {
        contact_id: formData.get('contact_id') as string,
        business_id: formData.get('business_id') as string,
        amount: parseFloat(formData.get('amount') as string),
        currency_code: formData.get('currency_code') as string,
        payment_method: formData.get('payment_method') as string,
        reference_no: formData.get('reference_no') as string,
        notes: formData.get('notes') as string,
        processed_by: (await supabase.auth.getUser()).data.user?.id
    };

    const { error } = await supabase.from('crm_payments').insert(data);

    if (error) return { success: false, message: error.message };
    
    revalidatePath('/crm/clients');
    return { success: true, message: "Payment synchronized and debt reconciled." };
}