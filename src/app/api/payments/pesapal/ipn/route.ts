import { NextResponse } from 'next/server';
import { getPesaPalToken } from '@/lib/payments/pesapal';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

/**
 * AUTOMATIC PAYMENT CONFIRMATION (IPN)
 * This background service listens for direct signals from PesaPal.
 * It ensures a user's business dashboard is unlocked automatically 
 * even if they close their browser during payment.
 */
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    
    // Data points sent by PesaPal
    const trackingId = searchParams.get('OrderTrackingId');
    const notificationType = searchParams.get('OrderNotificationType');

    // Security Guard: Only process actual payment status changes
    if (notificationType !== 'IPNCHANGE' || !trackingId) {
        return NextResponse.json({ status: 200 });
    }

    try {
        const token = await getPesaPalToken();
        const supabase = createClient(cookies());

        // 1. OFFICIAL VERIFICATION
        // We contact PesaPal directly to confirm the transaction is genuine.
        const res = await fetch(`${process.env.PESAPAL_BASE_URL}/api/Transactions/GetTransactionStatus?orderTrackingId=${trackingId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const paymentData = await res.json();

        // 2. SUCCESS PROTOCOL (Status Code 1 = Completed)
        if (paymentData.status_code === 1) {
            
            // Identify which business unit this payment belongs to
            const { data: tenant, error: tenantError } = await supabase
                .from('tenants')
                .select('id, subscription_plan')
                .eq('pesapal_order_tracking_id', trackingId)
                .single();

            if (tenant && !tenantError) {
                // AUTOMATIC ACTIVATION
                // This calls your Master SQL logic to:
                // - Set status to 'trial'
                // - Add 14 days to the calendar
                // - Log the receipt in the ledger
                await supabase.rpc('proc_authorize_business_access', {
                    p_biz_id: tenant.id,
                    p_plan_name: tenant.subscription_plan || 'Small Business',
                    p_tracking_id: trackingId,
                    p_amount: paymentData.amount
                });

                console.log(`SYSTEM_CONFIRMATION: Business ${tenant.id} unlocked via Background Sync.`);
            }
        } else if (paymentData.status_code === 2) {
            // Log failed attempts for administrative review
            console.warn(`PAYMENT_REJECTED: Transaction ${trackingId} failed at gateway.`);
        }

    } catch (error: any) {
        console.error("IPN_RECONCILIATION_CRITICAL_ERROR:", error.message);
        // We return 200 so PesaPal doesn't keep hitting the server if we have a local error
    }

    // 3. MANDATORY HANDSHAKE
    // We must return a 200 OK status so PesaPal knows we received the message.
    return NextResponse.json({ status: 200 });
}