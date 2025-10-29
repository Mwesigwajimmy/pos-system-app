// src/lib/actions.ts
'use server';

import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { sendSystemEmail } from './email'; // FIX: Import the new centralized email sender

// --- Type Definitions for FormState ---
export interface FormState {
    success: boolean;
    message: string;
    errors?: Record<string, string[]>;
    data?: any; 
}

// --- Zod Schemas ---
const InviteAuditorSchema = z.object({
    email: z.string().email("Invalid email address.").min(1, "Email is required."),
});

// Schemas for Budget Creation
const BudgetLineSchema = z.object({
    accountId: z.string().uuid("Invalid Account ID format."),
    accountName: z.string(), // Not strictly necessary for DB but useful for client logic
    accountType: z.string(),  // Not strictly necessary for DB but useful for client logic
    // FIX: Replaced 'invalid_type_error' with the correct key 'error' for z.coerce options
    budgetedAmount: z.coerce.number({ error: "Amount must be a number." }).min(0.01, "Amount must be greater than zero."),
});

const BudgetInputSchema = z.object({
    name: z.string().min(3, "Budget name is required."),
    year: z.coerce.number().int().min(2020, "Invalid year.").max(2099, "Invalid year."),
    lines: z.array(BudgetLineSchema).min(1, "At least one budget line is required."),
});


// Schemas for Journal Entry (ADDED for createJournalEntryAction)
const JournalLineActionSchema = z.object({
    accountId: z.string().uuid("Invalid Account ID format."),
    debit: z.coerce.number({ error: "Debit must be a number." }).min(0, "Debit must be positive or zero."),
    credit: z.coerce.number({ error: "Credit must be a number." }).min(0, "Credit must be positive or zero."),
});

const JournalEntryInputSchema = z.object({
    date: z.string().refine((val) => !isNaN(new Date(val).getTime()), { message: "Invalid date format." }),
    description: z.string().min(3, "Description is required."),
    lines: z.array(JournalLineActionSchema).min(2, "At least two journal lines are required."), 
});


// --- Constants ---
const NEXT_PUBLIC_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

// --- EXISTING ACTION: inviteAuditorAction (Kept as is) ---
/**
 * Sends a secure, multi-tenant invitation email to an external auditor
 */
export async function inviteAuditorAction(prevState: FormState, formData: FormData): Promise<FormState> {
    const validatedFields = InviteAuditorSchema.safeParse({
        email: formData.get('email'),
    });
    // ... (rest of inviteAuditorAction logic)
    if (!validatedFields.success) {
        return { success: false, message: "Validation Failed.", errors: validatedFields.error.flatten().fieldErrors, };
    }
    const { email } = validatedFields.data;
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { return { success: false, message: "User is not authenticated." }; }
    const { data: userProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('business_id').eq('id', user.id).single();
    if (profileError || !userProfile?.business_id) {
        console.error("Profile fetch error:", profileError);
        return { success: false, message: "Could not identify your business context." };
    }
    const businessId = userProfile.business_id;
    const token = crypto.randomUUID();
    const { error: insertError } = await supabase
        .from('auditor_invitations')
        .insert({ email: email, business_id: businessId, invited_by_user_id: user.id, token: token, status: 'pending' });
    if (insertError) {
        if (insertError.code === '23505') { return { success: false, message: "An invitation has already been sent to this email for your business." }; }
        console.error("Invitation insert error:", insertError);
        return { success: false, message: "Database failed to create invitation record." };
    }
    const invitationLink = `${NEXT_PUBLIC_BASE_URL}/auth/accept-auditor?token=${token}&email=${encodeURIComponent(email)}`;
    try {
        await sendSystemEmail({ to: email, subject: `You have been invited to audit ${businessId} on Aura`, bodyHtml: `<p>...<a href="${invitationLink}">Accept Invitation</a></p>` });
    } catch (emailError: any) {
        return { success: true, message: `Invitation record created, but email failed to send: ${emailError.message}` };
    }
    return { success: true, message: `Invitation successfully sent to ${email}!` };
}


// --- EXISTING ACTION: createBudgetAction (Implemented with DB logic) ---
/**
 * Creates a new Budget header and its associated Budget lines in a single transaction.
 */
export async function createBudgetAction(prevState: FormState, formData: FormData): Promise<FormState> {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    // 1. Get User and Business Context
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { return { success: false, message: "User is not authenticated." }; }
    
    const { data: userProfile } = await supabase.from('user_profiles').select('business_id').eq('id', user.id).single();
    const businessId = userProfile?.business_id;
    if (!businessId) { return { success: false, message: "Could not identify your business context." }; }

    // 2. Validate Input
    const linesJson = formData.get('lines');
    
    // Combine data from FormData and the hidden 'lines' field
    const inputData = {
        name: formData.get('name'),
        year: formData.get('year'),
        lines: linesJson ? JSON.parse(linesJson as string) : [],
    };
    
    const validatedFields = BudgetInputSchema.safeParse(inputData);

    if (!validatedFields.success) {
        // Find the first error message to return
        const errorDetails = validatedFields.error.flatten().fieldErrors;
        const firstErrorMessage = Object.values(errorDetails).flat()[0] || "An unknown validation error occurred.";
        return { success: false, message: firstErrorMessage, errors: errorDetails };
    }
    
    const { name, year, lines } = validatedFields.data;

    // 3. Database Insertion (Budget Header & Lines)
    try {
        // Start by inserting the main Budget header
        const { data: budgetData, error: budgetError } = await supabase
            .from('budgets')
            .insert({ 
                name: name,
                fiscal_year: year,
                business_id: businessId,
                created_by_user_id: user.id
            })
            .select('id')
            .single();

        if (budgetError || !budgetData) {
            console.error("Budget insert error:", budgetError);
            return { success: false, message: "Failed to create the budget header in the database." };
        }
        
        const budgetId = budgetData.id;

        // Prepare budget lines for insertion
        const lineInserts = lines.map(line => ({
            budget_id: budgetId,
            account_id: line.accountId,
            budgeted_amount: line.budgetedAmount,
        }));

        // Insert all budget lines
        const { error: linesError } = await supabase
            .from('budget_lines')
            .insert(lineInserts);

        if (linesError) {
            console.error("Budget lines insert error:", linesError);
            // Optionally, implement logic to delete the header if lines fail (not shown here)
            return { success: false, message: "Failed to save the detailed budget lines." };
        }

        return { success: true, message: `Budget '${name}' for ${year} successfully created and activated!` };

    } catch (e: any) {
        console.error("Unexpected error in createBudgetAction:", e);
        return { success: false, message: `An unexpected error occurred: ${e.message}` };
    }
}


// --- NEW ACTION: createJournalEntryAction (ADDED to fix the compile error) ---
/**
 * Creates a new Journal Entry and its associated lines.
 */
export async function createJournalEntryAction(prevState: FormState, formData: FormData): Promise<FormState> {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    // 1. Get User and Business Context
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { return { success: false, message: "User is not authenticated." }; }

    const { data: userProfile } = await supabase.from('user_profiles').select('business_id').eq('id', user.id).single();
    const businessId = userProfile?.business_id;
    if (!businessId) { return { success: false, message: "Could not identify your business context." }; }

    // 2. Validate Input
    const linesJson = formData.get('lines'); 
    
    // Combine data from FormData and the hidden 'lines' field
    const inputData = {
        date: formData.get('date'),
        description: formData.get('description'),
        lines: linesJson ? JSON.parse(linesJson as string) : [],
    };
    
    const validatedFields = JournalEntryInputSchema.safeParse(inputData);

    if (!validatedFields.success) {
        const errorDetails = validatedFields.error.flatten().fieldErrors;
        const firstErrorMessage = Object.values(errorDetails).flat()[0] || "An unknown validation error occurred.";
        return { success: false, message: firstErrorMessage, errors: errorDetails };
    }
    
    const { date, description, lines } = validatedFields.data;
    
    // Server-side Balance Check
    const totalDebits = lines.reduce((sum, line) => sum + line.debit, 0);
    const totalCredits = lines.reduce((sum, line) => sum + line.credit, 0);
    const isBalanced = Math.abs(totalDebits - totalCredits) < 0.001; 

    if (!isBalanced || totalDebits === 0) {
        if (!isBalanced) return { success: false, message: `Journal entry is out of balance. Difference: ${totalDebits - totalCredits}` };
        if (totalDebits === 0) return { success: false, message: "Journal entry total cannot be zero." };
    }

    // 3. Database Insertion (Journal Entry Header & Lines)
    try {
        // Start by inserting the main Journal Entry header
        const { data: journalData, error: journalError } = await supabase
            .from('journal_entries') // Assuming this table exists
            .insert({ 
                entry_date: date,
                description: description,
                business_id: businessId,
                created_by_user_id: user.id,
                total_amount: totalDebits,
            })
            .select('id')
            .single();

        if (journalError || !journalData) {
            console.error("Journal Entry insert error:", journalError);
            return { success: false, message: "Failed to create the journal entry header in the database." };
        }
        
        const journalEntryId = journalData.id;

        // Prepare journal lines for insertion
        const lineInserts = lines.map(line => ({
            journal_entry_id: journalEntryId,
            account_id: line.accountId,
            debit: line.debit,
            credit: line.credit,
            business_id: businessId, 
        })).filter(line => line.debit > 0 || line.credit > 0); 

        // Insert all journal lines
        const { error: linesError } = await supabase
            .from('journal_lines') // Assuming this table exists
            .insert(lineInserts);

        if (linesError) {
            console.error("Journal lines insert error:", linesError);
            // Cleanup the header if lines fail
            await supabase.from('journal_entries').delete().eq('id', journalEntryId); 
            return { success: false, message: "Failed to save the detailed journal lines. Entry aborted." };
        }

        return { success: true, message: `Journal Entry for ${date} successfully recorded!` };

    } catch (e: any) {
        console.error("Unexpected error in createJournalEntryAction:", e);
        return { success: false, message: `An unexpected error occurred: ${e.message}` };
    }
}


// --- NEW STUB ACTION 2: generateDraftBudgetAction (Simulated Logic) ---
/**
 * Simulates generating a draft budget based on historical data.
 */
export async function generateDraftBudgetAction(historicalYear: number, growthFactor: number): Promise<FormState> {
    // This action typically calls a complex Supabase function (RPC) or an external AI service.
    
    // Placeholder logic for now
    const mockData = [
        { accountId: 'uuid-1', accountName: 'Sales Revenue', accountType: 'Revenue', budgetedAmount: 100000 * (1 + growthFactor / 100) },
        { accountId: 'uuid-2', accountName: 'Rent Expense', accountType: 'Expense', budgetedAmount: 12000 * (1 + growthFactor / 100) },
        { accountId: 'uuid-3', accountName: 'Salaries Expense', accountType: 'Expense', budgetedAmount: 40000 * (1 + growthFactor / 100) },
    ];
    
    return { 
        success: true, 
        message: "Draft budget successfully generated.", 
        data: mockData // Returned data must match the BudgetLineSchema shape
    };
}