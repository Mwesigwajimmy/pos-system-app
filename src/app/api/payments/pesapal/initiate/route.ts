import { NextResponse } from 'next/server';
import { getPesaPalToken, registerIPN } from '@/lib/payments/pesapal';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { amount, planName, businessId, email } = body;

        if (!businessId || !email) {
            return NextResponse.json({ error: "Missing identity context" }, { status: 400 });
        }

        // 1. Get PesaPal Auth Token
        const token = await getPesaPalToken();
        
        // 2. Register IPN (Background notification listener)
        const ipnId = await registerIPN(token);

        // 3. Create unique reference for this transaction
        const merchantReference = `BBU1-${Math.floor(Date.now() / 1000)}`;

        const orderRequest = {
            id: merchantReference,
            currency: 'USD', // Trial verification is in USD
            amount: amount,
            description: `Sovereign OS Trial: ${planName} Plan`,
            callback_url: `https://www.bbu1.com/settings/billing/callback`,
            notification_id: ipnId,
            billing_address: {
                email_address: email
            }
        };

        // 4. Submit to PesaPal
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
            throw new Error(data.message || "PesaPal Gateway refused the connection.");
        }

        // 5. SECURE STEP: Store this tracking ID in Supabase so we know who is paying
        const supabase = createClient(cookies());
        await supabase
            .from('tenants')
            .update({ pesapal_order_tracking_id: data.order_tracking_id })
            .eq('id', businessId);

        // 6. Return the redirect URL to the frontend
        return NextResponse.json({ 
            redirect_url: data.redirect_url,
            order_tracking_id: data.order_tracking_id 
        });

    } catch (error: any) {
        console.error("PESAPAL_INITIATE_CRITICAL_FAILURE:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}