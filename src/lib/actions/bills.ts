'use server'

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

/**
 * 1. ENTERPRISE ACTION: Post Vendor Bill
 * Logic: Creates the Bill and initiates the General Ledger math via RPC.
 * Handshake: Debit Expense / Credit Accounts Payable.
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
 * Logic: Reduces Bank/Cash balance and AP debt atomically via RPC.
 * Handshake: Debit Accounts Payable / Credit Bank Account.
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
 */
export async function bulkApproveBills(payload: {
    billIds: string[];
    businessId: string;
}) {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.rpc('authorize_bill_posting_batch', {
        p_bill_ids: payload.billIds,
        p_business_id: payload.businessId,
        p_posted_by: user?.id
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
 */
export async function getAccountingAuditLogs(businessId: string, limit = 50) {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) {
        console.error("Compliance Sync Error (Audit Trail):", error);
        return [];
    }

    return data;
}

/**
 * 5. ENTERPRISE ACTION: Register New Vendor (UUID Pattern)
 * Deeply adds a new partner to the 'vendors' table.
 */
export async function registerVendor(formData: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    contact_person?: string;
    businessId: string;
}) {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    const { data, error } = await supabase
        .from('vendors')
        .insert([{
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            address: formData.address,
            contact_person: formData.contact_person,
            business_id: formData.businessId,
            status: 'active'
        }])
        .select()
        .single();

    if (error) {
        console.error("Vendor Registry Failure:", error);
        return { success: false, message: error.message };
    }

    revalidatePath('/procurement/suppliers');
    return { success: true, vendor: data };
}