'use server'

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers'; // <--- ADD THIS IMPORT
import { revalidatePath } from 'next/cache';

/**
 * ENTERPRISE ACTION: Post Vendor Bill
 * Logic: Creates the Bill, generates the Accounting Transaction, 
 * and posts double-entry lines to the General Ledger (Debit Expense / Credit AP).
 */
export async function submitVendorBill(formData: any) {
    // Pass cookies() as the required argument to createClient
    const cookieStore = cookies();
    const supabase = createClient(cookieStore); 

    // The frontend sends raw data; the Database RPC (PostgreSQL) handles the financial complexity.
    const { data, error } = await supabase.rpc('post_vendor_bill', {
        p_business_id: formData.businessId,
        p_vendor_id: formData.vendorId,
        p_bill_number: formData.billNumber,
        p_bill_date: formData.billDate,
        p_due_date: formData.dueDate,
        p_currency: formData.currency || 'USD',
        p_amount: parseFloat(formData.amount),
        p_expense_account_id: formData.expenseAccountId,
        p_location_id: formData.locationId
    });

    if (error) {
        console.error("System Interconnect Error (Bill Posting):", error);
        return { success: false, message: error.message };
    }

    // Refresh all accounting views to show the new liability
    revalidatePath('/accounting/bills'); 
    return { success: true, billId: data };
}

/**
 * ENTERPRISE ACTION: Record Bill Payment
 * Logic: Reduces Bank/Cash balance, reduces the Accounts Payable debt, 
 * and updates the Bill status in one atomic transaction.
 */
export async function postBillPayment(payload: {
    billId: string;
    accountId: string;
    amount: number;
    paymentDate: string;
    businessId: string;
}) {
    // Pass cookies() as the required argument to createClient
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    // Call the database engine to handle the Ledger update
    const { error } = await supabase.rpc('record_bill_payment', {
        p_bill_id: payload.billId,
        p_account_id: payload.accountId,
        p_amount: payload.amount,
        p_date: payload.paymentDate,
        p_business_id: payload.businessId
    });

    if (error) {
        console.error("System Interconnect Error (Payment Posting):", error);
        return { success: false, message: error.message };
    }

    // Revalidate paths to update the Aged Payables and Bills table instantly
    revalidatePath('/accounting/bills');
    return { success: true };
}