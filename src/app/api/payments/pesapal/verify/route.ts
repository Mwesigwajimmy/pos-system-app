import { NextResponse } from 'next/server';
import { getPesaPalToken } from '@/lib/payments/pesapal';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

/**
 * PAYMENT VERIFICATION GATEWAY
 * This API confirms that the $1 deposit was successfully received
 * and automatically activates the business account trial.
 */
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const trackingId = searchParams.get('trackingId');

    // Safety: If no ID is provided, stop immediately.
    if (!trackingId) {
        return NextResponse.json({ success: false, error: "Missing Transaction ID" }, { status: 400 });
    }

    try {
        const token = await getPesaPalToken();
        const supabase = createClient(cookies());

        // 1. OFFICIAL PAYMENT CHECK
        // We ask PesaPal directly for the status of this specific payment.
        const res = await fetch(`${process.env.PESAPAL_BASE_URL}/api/Transactions/GetTransactionStatus?orderTrackingId=${trackingId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) {
            throw new Error("Unable to reach the payment provider for confirmation.");
        }

        const paymentData = await res.json();

        // 2. PROCESS SUCCESSFUL PAYMENT (Status Code 1 = Completed)
        if (paymentData.status_code === 1) {
            
            // Identify the active user and their business account
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('business_id')
                .single();

            if (profileError || !profile?.business_id) {
                throw new Error("Could not verify the business identity for this account.");
            }

            // 3. AUTOMATIC ACCOUNT ACTIVATION
            // We call the master database function to update the ledger and trial dates.
            // We determine the plan based on the transaction description.
            const intendedPlan = paymentData.description.includes('Industrial') ? 'Industrial' : 'Small Business';

            const { error: rpcError } = await supabase.rpc('proc_authorize_business_access', {
                p_biz_id: profile.business_id,
                p_plan_name: intendedPlan,
                p_tracking_id: trackingId,
                p_amount: paymentData.amount
            });

            if (rpcError) {
                console.error("LEDGER_SYNC_ERROR:", rpcError.message);
                throw new Error("Payment was received, but account activation failed. Please contact support.");
            }

            // Return Success to the UI Callback Page
            return NextResponse.json({ success: true });
        }

        // If the payment is still pending or failed at the gateway
        return NextResponse.json({ 
            success: false, 
            message: "Payment is still being processed by your bank or mobile provider." 
        });

    } catch (error: any) {
        // Log error with simple business terminology
        console.error("PAYMENT_CONFIRMATION_FAILURE:", error.message);
        
        return NextResponse.json({ 
            success: false, 
            error: error.message || "A system error occurred during verification." 
        }, { status: 500 });
    }
}