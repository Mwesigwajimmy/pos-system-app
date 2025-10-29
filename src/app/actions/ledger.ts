// src/app/actions/ledger.ts
'use server'; // Marks this file as containing Server Actions

import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

// --- Type Definitions (Must match what the modal component sends) ---
interface JournalLineInput {
    accountId: string;
    debit: number;
    credit: number;
}

interface JournalEntryInput {
    date: string;
    description: string;
    lines: JournalLineInput[];
}

interface JournalEntryResult {
    success?: boolean;
    error?: string;
}

// --- The Server Action ---
// This function will be called from the client component (CreateJournalEntryModal)
export async function createJournalEntry(entry: JournalEntryInput): Promise<JournalEntryResult> {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    try {
        // We assume a single Supabase RPC/Function ('create_journal_entry') handles the insertion.
        const { error } = await supabase.rpc('create_journal_entry', {
            p_date: entry.date,
            p_description: entry.description,
            p_lines: entry.lines, // Assuming Supabase can handle this JSON array structure
        });

        if (error) {
            console.error("Supabase Error:", error.message);
            // Return error object as expected by the client component's result check
            return { error: `Database error: ${error.message}` };
        }

        return { success: true };

    } catch (e: any) {
        console.error("Server Action Error:", e.message);
        return { error: `An unexpected error occurred: ${e.message}` };
    }
}