// src/app/api/payments/pesapal/initiate/route.ts
import { NextResponse } from 'next/server';
import { getPesaPalToken, registerIPN } from '@/lib/payments/pesapal';
import { createClient } from '@supabase/supabase-js'; // MASTER WELD: Use direct JS client

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { amount, planName, businessId, email } = body;

        if (!businessId || !email) {
            return NextResponse.json({ error: "Identity Failure" }, { status: 400 });
        }

        const token = await getPesaPalToken();
        const ipnId = await registerIPN(token);
        const merchantReference = `BBU1-PAY-${Math.floor(Date.now() / 1000)}`;

        const orderRequest = {
            id: merchantReference,
            currency: 'USD', 
            amount: amount,
            description: `Verification Deposit: ${planName}`,
            callback_url: `https://www.bbu1.com/en/settings/billing/callback`, // Locale added for handshake
            notification_id: ipnId,
            billing_address: { email_address: email }
        };

        const res = await fetch(`${process.env.PESAPAL_BASE_URL}/api/Transactions/SubmitOrderRequest`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(orderRequest)
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Gateway Unavailable");

        // MASTER SECURE RECORD KEEPING
        // We use the Service Role key here to ensure the Tracking ID is saved 
        // regardless of the user's current session permissions.
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
        
        await supabase
            .from('tenants')
            .update({ 
                pesapal_order_tracking_id: data.order_tracking_id,
                subscription_plan: planName 
            })
            .eq('id', businessId);

        return NextResponse.json({ 
            redirect_url: data.redirect_url,
            order_tracking_id: data.order_tracking_id 
        });

    } catch (error: any) {
        console.error("PAYMENT_INITIATION_ERROR:", error.message);
        return NextResponse.json({ error: "Handshake Failed" }, { status: 500 });
    }
}