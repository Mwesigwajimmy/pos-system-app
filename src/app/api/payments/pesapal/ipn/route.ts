import { NextResponse } from 'next/server';
import { getPesaPalToken } from '@/lib/payments/pesapal';
import { createClient } from '@supabase/supabase-js'; // Use the standard JS client for Service Role

/**
 * AUTOMATED BUSINESS ACTIVATION (IPN)
 * This is the core background engine of Sovereign OS.
 * It listens for PesaPal signals and automatically unlocks business dashboards.
 */
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    
    const trackingId = searchParams.get('OrderTrackingId');
    const notificationType = searchParams.get('OrderNotificationType');

    // Logic Gate: Only process actual status changes
    if (notificationType !== 'IPNCHANGE' || !trackingId) {
        return NextResponse.json({ status: 200 });
    }

    try {
        const token = await getPesaPalToken();

        /**
         * MASTER IDENTITY WELD:
         * We use the SERVICE_ROLE_KEY here because this is a background process.
         * It bypasses RLS to ensure the business is unlocked even if the user is offline.
         */
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY! // Ensure this variable is in Vercel
        );

        // 1. GATEWAY VERIFICATION
        // Confirm with PesaPal that the payment is successful
        const res = await fetch(`${process.env.PESAPAL_BASE_URL}/api/Transactions/GetTransactionStatus?orderTrackingId=${trackingId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const paymentData = await res.json();

        // 2. ACTIVATION PROTOCOL (Status Code 1 = Completed)
        if (Number(paymentData.status_code) === 1) {
            
            // Search the registry for the business linked to this payment
            const { data: tenant, error: tenantError } = await supabase
                .from('tenants')
                .select('id, subscription_plan')
                .eq('pesapal_order_tracking_id', trackingId)
                .single();

            if (tenant && !tenantError) {
                // AUTHORITATIVE UNLOCK
                // Updates the ledger, sets the 14-day trial, and activates the node
                await supabase.rpc('proc_authorize_business_access', {
                    p_biz_id: tenant.id,
                    p_plan_name: tenant.subscription_plan || 'Small Business',
                    p_tracking_id: trackingId,
                    p_amount: paymentData.amount
                });

                console.log(`SYSTEM_SUCCESS: Business Unit ${tenant.id} has been automatically activated.`);
            }
        }

    } catch (error: any) {
        console.error("CRITICAL_AUTOMATION_FAULT:", error.message);
    }

    // 3. MANDATORY ACKNOWLEDGMENT
    // We return 200 so PesaPal knows the message was delivered.
    return NextResponse.json({ status: 200 });
}