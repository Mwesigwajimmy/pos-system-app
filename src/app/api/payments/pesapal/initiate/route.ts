import { NextResponse } from 'next/server';
import { getPesaPalToken, registerIPN } from '@/lib/payments/pesapal';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

/**
 * START SUBSCRIPTION PROCESS
 * This API initiates the secure payment process via PesaPal 
 * for the $1 verification deposit.
 */
export async function POST(req: Request) {
    try {
        // 1. Parse and validate the request data
        const body = await req.json();
        const { amount, planName, businessId, email } = body;

        // Validation: Ensure the business and user identity are present
        if (!businessId || !email) {
            return NextResponse.json(
                { error: "Business identity not found. Please refresh and try again." }, 
                { status: 400 }
            );
        }

        // Validation: Ensure a valid amount is being charged
        if (!amount || amount <= 0) {
            return NextResponse.json(
                { error: "Invalid payment amount detected." }, 
                { status: 400 }
            );
        }

        // 2. Obtain Access Token (Identity Handshake)
        // Authenticates your server with PesaPal's global payment system.
        const token = await getPesaPalToken();
        
        // 3. Register the IPN (Instant Payment Notification)
        // This sets up the 'Background Guard' that confirms payment even if the browser closes.
        const ipnId = await registerIPN(token);

        // 4. Generate a Unique Business Reference
        // Creates a permanent record ID for this specific transaction.
        const merchantReference = `BBU1-PAY-${Math.floor(Date.now() / 1000)}`;

        // 5. Prepare the Payment Documentation
        const orderRequest = {
            id: merchantReference,
            currency: 'USD', 
            amount: amount,
            description: `Verification Deposit: ${planName} Plan`,
            callback_url: `https://www.bbu1.com/settings/billing/callback`,
            notification_id: ipnId,
            billing_address: {
                email_address: email
            }
        };

        // 6. Submit Request to Payment Gateway
        const res = await fetch(`${process.env.PESAPAL_BASE_URL}/api/Transactions/SubmitOrderRequest`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(orderRequest)
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.message || "The payment gateway is currently unavailable. Please try again shortly.");
        }

        // 7. SECURE RECORD KEEPING
        // We store the Tracking ID in your database now so the system
        // knows exactly which business to unlock once the payment finishes.
        const supabase = createClient(cookies());
        
        const { error: dbError } = await supabase
            .from('tenants')
            .update({ 
                pesapal_order_tracking_id: data.order_tracking_id,
                subscription_plan: planName // Pre-set the intended plan
            })
            .eq('id', businessId);

        if (dbError) {
            console.error("DATABASE_SYNC_ERROR:", dbError.message);
            // We continue anyway because the payment URL is already generated
        }

        // 8. Return the Secure Redirect URL to the browser
        return NextResponse.json({ 
            redirect_url: data.redirect_url,
            order_tracking_id: data.order_tracking_id 
        });

    } catch (error: any) {
        // Log error with simple business terminology
        console.error("PAYMENT_INITIATION_ERROR:", error.message);
        
        return NextResponse.json(
            { error: "Internal System Error: Could not reach the payment provider." }, 
            { status: 500 }
        );
    }
}