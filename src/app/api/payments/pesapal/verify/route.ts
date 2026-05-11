import { NextResponse } from 'next/server';
import { getPesaPalToken } from '@/lib/payments/pesapal';
import { createClient } from '@supabase/supabase-js'; // Use standard client for Service Role

/**
 * SECURE PAYMENT VERIFICATION GATEWAY
 * This API confirms the status of a transaction directly with PesaPal.
 * It uses the unique Tracking ID to identify the business, ensuring 
 * activation works even if the user's session is momentarily unstable.
 */
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const trackingId = searchParams.get('trackingId');

    // Validation: Ensure the ID exists before proceeding
    if (!trackingId) {
        return NextResponse.json({ success: false, error: "Missing Transaction Reference" }, { status: 400 });
    }

    try {
        const token = await getPesaPalToken();

        /**
         * MASTER IDENTITY WELD:
         * We use the SERVICE_ROLE_KEY to bypass RLS. This ensures that the 
         * verification process can find and update the business registry 
         * even if the browser session is refreshing after the redirect.
         */
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY! 
        );

        // 1. GATEWAY CONFIRMATION
        // We verify the transaction status directly with PesaPal's official servers.
        const res = await fetch(`${process.env.PESAPAL_BASE_URL}/api/Transactions/GetTransactionStatus?orderTrackingId=${trackingId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) {
            throw new Error("Unable to establish communication with the payment provider.");
        }

        const paymentData = await res.json();

        // 2. SUCCESS VALIDATION (Status Code 1 = Completed)
        if (paymentData.status_code === 1) {
            
            // IDENTIFICATION: Find the business node that initiated this specific tracking ID
            const { data: tenant, error: tenantError } = await supabase
                .from('tenants')
                .select('id, subscription_plan')
                .eq('pesapal_order_tracking_id', trackingId)
                .single();

            if (tenantError || !tenant) {
                // If we reach here, it means the IPN might have been so fast it cleared the ID, 
                // or the initiation didn't save the ID correctly.
                throw new Error("Business identity could not be resolved for this transaction.");
            }

            // 3. AUTHORITATIVE ACTIVATION
            // We run the master activation logic to update the ledger and trial dates.
            // We default to the plan saved in the database or detect from description.
            const fallbackPlan = paymentData.description.includes('Industrial') ? 'Industrial' : 'Small Business';
            
            const { error: rpcError } = await supabase.rpc('proc_authorize_business_access', {
                p_biz_id: tenant.id,
                p_plan_name: tenant.subscription_plan || fallbackPlan,
                p_tracking_id: trackingId,
                p_amount: paymentData.amount
            });

            if (rpcError) {
                console.error("ACTIVATION_SYNC_ERROR:", rpcError.message);
                throw new Error("Reconciliation failed. Please refresh your dashboard.");
            }

            // Return Success to the UI
            return NextResponse.json({ success: true });
        }

        // Handle cases where the payment is still processing or was cancelled
        return NextResponse.json({ 
            success: false, 
            message: "Payment verification is pending. Please wait a moment." 
        });

    } catch (error: any) {
        // Log critical failure with professional business terminology
        console.error("PAYMENT_RECONCILIATION_FAULT:", error.message);
        
        return NextResponse.json({ 
            success: false, 
            error: error.message || "An unexpected error occurred during confirmation." 
        }, { status: 500 });
    }
}