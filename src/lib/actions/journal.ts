'use server'

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

/**
 * ENTERPRISE ACTION: Create Manual Journal Entry
 * Logic: Validates balance and posts to the double-entry ledger via RPC.
 */
export async function submitJournalEntry(payload: {
    businessId: string;
    date: string;
    description: string;
    reference: string;
    lines: any[];
}) {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase.rpc('create_journal_entry', {
        p_business_id: payload.businessId,
        p_date: payload.date,
        p_description: payload.description,
        p_reference: payload.reference,
        p_lines: payload.lines,
        p_user_id: user?.id
    });

    if (error) {
        console.error("Journal Engine Failure:", error.message);
        return { success: false, message: error.message };
    }

    revalidatePath('/accounting/journal');
    return { success: true, transactionId: data };
}