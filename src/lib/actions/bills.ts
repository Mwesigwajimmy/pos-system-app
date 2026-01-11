'use server'

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

/**
 * 1. ENTERPRISE ACTION: Post Vendor Bill
 * Logic: Creates the Bill and initiates the General Ledger math.
 */
export async function submitVendorBill(formData: any) {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore); 

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

    revalidatePath('/accounting/bills'); 
    return { success: true, billId: data };
}

/**
 * 2. ENTERPRISE ACTION: Record Bill Payment
 * Logic: Reduces Bank/Cash balance and AP debt atomically.
 */
export async function postBillPayment(payload: {
    billId: string;
    accountId: string;
    amount: number;
    paymentDate: string;
    businessId: string;
}) {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

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

    revalidatePath('/accounting/bills');
    return { success: true };
}

/**
 * 3. ENTERPRISE ERP ACTION: Authorize & Post Bill Batch
 * Logic: Atomically transitions bills to 'posted' and generates Ledger lines.
 */
export async function bulkApproveBills(payload: {
    billIds: string[];
    businessId: string;
}) {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    // Call the ERP Posting Engine RPC
    const { data, error } = await supabase.rpc('authorize_bill_posting_batch', {
        p_bill_ids: payload.billIds,
        p_business_id: payload.businessId,
        p_posted_by: (await supabase.auth.getUser()).data.user?.id
    });

    if (error) {
        console.error("ERP Posting Engine Failure:", error);
        return { success: false, message: error.message };
    }

    revalidatePath('/accounting/bills');
    return { success: true };
}

/**
 * 4. ENTERPRISE ACTION: Fetch Audit Trail
 * Logic: Retrieves immutable history for compliance reporting.
 */
export async function getAccountingAuditLogs(businessId: string, limit = 50) {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    const { data, error } = await supabase
        .from('accounting_audit_logs')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) {
        console.error("Audit Trail Fetch Error:", error);
        return [];
    }

    return data;
}