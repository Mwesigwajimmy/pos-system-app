// src/lib/actions.ts
'use server';

import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { sendSystemEmail } from './email';

/**
 * ENTERPRISE CORE: FORM STATE
 * Standardized response for all Server Actions in the Aura ERP suite.
 */
export interface FormState {
    success: boolean;
    message: string;
    errors?: Record<string, string[]>;
    data?: any; 
}

/**
 * DATABASE RPC INTERFACE
 * Matches audited RPC Return Type: TABLE(account_id uuid, total_debit numeric, total_credit numeric)
 */
interface LedgerActual {
    account_id: string; 
    total_debit: number;
    total_credit: number;
}

//==============================================================================
// STRATEGIC VALIDATION SCHEMAS
// Ensures data integrity before any ledger operations.
//==============================================================================

const InviteAuditorSchema = z.object({
    email: z.string().email("Invalid email address format.").min(1, "Email is mandatory."),
});

const BudgetLineSchema = z.object({
    accountId: z.string().uuid("Invalid Ledger Account ID."),
    accountName: z.string(),
    accountType: z.string(),
    budgetedAmount: z.coerce.number({ 
        error: "Budgeted amount must be numeric." 
    }).min(0, "Allocated funds cannot be negative."),
});

const BudgetInputSchema = z.object({
    business_id: z.string().uuid("Invalid Business context."),
    name: z.string().min(3, "Designation must be at least 3 characters."),
    year: z.coerce.number().int().min(2020).max(2100),
    lines: z.array(BudgetLineSchema).min(1, "At least one account mapping is required."),
});

const JournalLineActionSchema = z.object({
    accountId: z.string().uuid("Invalid Ledger Account ID."),
    debit: z.coerce.number().min(0),
    credit: z.coerce.number().min(0),
    description: z.string().optional(),
});

const JournalEntryInputSchema = z.object({
    business_id: z.string().uuid(),
    date: z.string().refine((val) => !isNaN(new Date(val).getTime()), { message: "Invalid GAAP posting date." }),
    description: z.string().min(5, "A descriptive narrative is required for audit trails."),
    lines: z.array(JournalLineActionSchema).min(2, "Entries require at least two lines (Double-Entry)."), 
});

//==============================================================================
// ENTERPRISE ACTION: INVITE AUDITOR
// Securely invites an external firm to view financial data.
//==============================================================================

export async function inviteAuditorAction(prevState: FormState, formData: FormData): Promise<FormState> {
    const validatedFields = InviteAuditorSchema.safeParse({
        email: formData.get('email'),
    });

    if (!validatedFields.success) {
        return { success: false, message: "Validation Failed.", errors: validatedFields.error.flatten().fieldErrors };
    }

    const { email } = validatedFields.data;
    const supabase = createClient(cookies());
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, message: "Authorization restricted: Please login." };

    const { data: profile } = await supabase
        .from('profiles')
        .select('business_id')
        .eq('id', user.id)
        .single();

    if (!profile?.business_id) return { success: false, message: "Tenant context not found." };

    const token = crypto.randomUUID();
    const { error: insertError } = await supabase
        .from('auditor_invitations')
        .insert({ 
            email, 
            business_id: profile.business_id, 
            invited_by_user_id: user.id, 
            token, 
            status: 'pending' 
        });

    if (insertError) return { success: false, message: "Database Error: Failed to generate invitation record." };

    const NEXT_PUBLIC_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const invitationLink = `${NEXT_PUBLIC_BASE_URL}/auth/accept-auditor?token=${token}&email=${encodeURIComponent(email)}`;
    
    try {
        await sendSystemEmail({ 
            to: email, 
            subject: `Secure Audit Access Request`, 
            bodyHtml: `<h3>Financial Audit Invitation</h3><p>Access Link: <a href="${invitationLink}">Accept Invitation</a></p>` 
        });
        return { success: true, message: `Secure invitation dispatched to ${email}.` };
    } catch (e: any) {
        return { success: true, message: `Invitation recorded, but email failed to send.` };
    }
}

//==============================================================================
// ENTERPRISE ACTION: GENERATE STRATEGIC DRAFT
// High-Precision Forecaster utilizing real-time Ledger actuals via RPC.
//==============================================================================

export async function generateDraftBudgetAction(
    businessId: string, 
    historicalYear: number, 
    growthFactor: number
): Promise<FormState> {
    const supabase = createClient(cookies());
    
    try {
        // FIXED: Stable typing for RPC to resolve the "2 type arguments" build error
        const { data, error: actualsError } = await supabase.rpc('get_account_actuals_for_year', { 
            p_business_id: businessId, 
            p_year: historicalYear 
        });

        if (actualsError) throw new Error(`Ledger Interconnect Failure: ${actualsError.message}`);

        const actuals = data as unknown as LedgerActual[];

        // Fetching from accounting_accounts (Columns verified: id, business_id, name, type)
        const { data: accounts, error: accountsError } = await supabase
            .from('accounting_accounts')
            .select('id, name, type')
            .eq('business_id', businessId)
            .eq('is_active', true);

        if (accountsError || !accounts) throw new Error("Chart of Accounts Synchronization failed.");

        const multiplier = 1 + (growthFactor / 100);

        // APPLY GAAP-COMPLIANT FORECAST LOGIC
        const draftLines = accounts.map(acc => {
            const ledger = actuals?.find(a => a.account_id === acc.id);
            const dr = Number(ledger?.total_debit) || 0;
            const cr = Number(ledger?.total_credit) || 0;
            
            let baseMovement = 0;
            const type = acc.type.toLowerCase();
            
            // SIGN LOGIC: Revenue is CR-DR, Expenses are DR-CR
            if (type === 'revenue' || type === 'income') baseMovement = cr - dr;
            else baseMovement = dr - cr;

            const forecasted = Math.max(0, baseMovement * multiplier);

            return {
                accountId: acc.id,
                accountName: acc.name,
                accountType: acc.type,
                budgetedAmount: parseFloat(forecasted.toFixed(2))
            };
        });

        return { success: true, message: "Strategic draft projected.", data: draftLines };
    } catch (e: any) {
        return { success: false, message: e.message };
    }
}

//==============================================================================
// ENTERPRISE ACTION: CREATE BUDGET
// Mapped to Audited Columns: budgets (period_start_date, period_end_date, total_amount)
// Mapped to Audited Columns: budget_lines (amount, tenant_id)
//==============================================================================

export async function createBudgetAction(prevState: FormState, formData: FormData): Promise<FormState> {
    const supabase = createClient(cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: "Authorization required." };

    const rawLines = formData.get('lines');
    const inputData = {
        business_id: formData.get('business_id'),
        name: formData.get('name'),
        year: formData.get('year'),
        lines: rawLines ? JSON.parse(rawLines as string) : [],
    };
    
    const validated = BudgetInputSchema.safeParse(inputData);
    if (!validated.success) return { success: false, message: "Validation error: Check plan designated year." };

    const { business_id, name, year, lines } = validated.data;
    const total_amount = lines.reduce((s, l) => s + l.budgetedAmount, 0);

    try {
        // 1. Post Header (Mapped to Audited period_start_date and period_end_date)
        const { data: budget, error: bErr } = await supabase
            .from('budgets')
            .insert({ 
                name, 
                business_id, 
                tenant_id: business_id,
                total_amount,
                period_start_date: `${year}-01-01`,
                period_end_date: `${year}-12-31`
            })
            .select('id')
            .single();

        if (bErr || !budget) throw new Error(`Budget Header Error: ${bErr?.message}`);

        // 2. Distribute Lines (Mapped to Audited 'amount' column)
        const lineInserts = lines.map(l => ({
            budget_id: budget.id,
            account_id: l.accountId, 
            amount: l.budgetedAmount,
            tenant_id: business_id 
        }));

        const { error: lErr } = await supabase.from('budget_lines').insert(lineInserts);
        if (lErr) {
            await supabase.from('budgets').delete().eq('id', budget.id);
            throw new Error(`Line Allocation Error: ${lErr.message}`);
        }

        return { success: true, message: `Strategic Fiscal Plan '${name}' activated.` };
    } catch (e: any) {
        return { success: false, message: e.message };
    }
}

//==============================================================================
// ENTERPRISE ACTION: CREATE JOURNAL ENTRY
// Mapped to Audited Columns: business_id, tenant_id, date, amount
//==============================================================================

export async function createJournalEntryAction(prevState: FormState, formData: FormData): Promise<FormState> {
    const supabase = createClient(cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: "Authorization required." };

    const rawLines = formData.get('lines');
    const input = {
        business_id: formData.get('business_id'),
        date: formData.get('date'),
        description: formData.get('description'),
        lines: rawLines ? JSON.parse(rawLines as string) : [],
    };

    const validated = JournalEntryInputSchema.safeParse(input);
    if (!validated.success) return { success: false, message: "Journal entry schema invalid." };

    const { business_id, date, description, lines } = validated.data;

    // Strict Double-Entry Verification
    const drTotal = lines.reduce((s, l) => s + l.debit, 0);
    const crTotal = lines.reduce((s, l) => s + l.credit, 0);
    if (Math.abs(drTotal - crTotal) > 0.01) return { success: false, message: "Out of Balance Ledger Detection." };

    try {
        // 1. Header Posting
        const { data: entry, error: eErr } = await supabase
            .from('journal_entries')
            .insert({ 
                date, 
                description, 
                business_id, 
                tenant_id: business_id,
                status: 'POSTED',
                amount: drTotal
            })
            .select('id').single();

        if (eErr || !entry) throw new Error(`Journal Header Error: ${eErr?.message}`);

        // 2. Line Distribution (Journal Lines Interconnect)
        const lineInserts = lines.map(l => ({
            journal_entry_id: entry.id,
            account_id: l.accountId,
            debit: l.debit,
            credit: l.credit,
            business_id,
            tenant_id: business_id
        }));

        const { error: lErr } = await supabase.from('journal_lines').insert(lineInserts);
        if (lErr) {
            await supabase.from('journal_entries').delete().eq('id', entry.id);
            throw new Error(`Ledger Line Posting Failed: ${lErr.message}`);
        }

        return { success: true, message: `GAAP Journal Posted and Synchronized.` };
    } catch (e: any) {
        return { success: false, message: e.message };
    }
}