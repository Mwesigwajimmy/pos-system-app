import { NextResponse } from 'next/server';
import { getPesaPalToken, registerIPN } from '@/lib/payments/pesapal';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
    const { amount, planName, businessId, email } = await req.json();
    const token = await getPesaPalToken();
    const ipnId = await registerIPN(token);

    const orderRequest = {
        id: `BBU1-${Math.floor(Math.random() * 1000000)}`,
        currency: 'USD',
        amount: amount,
        description: `Security Deposit for ${planName} 14-Day Trial`,
        callback_url: `https://www.bbu1.com/settings/billing/callback`,
        notification_id: ipnId,
        billing_address: { email_address: email }
    };

    const res = await fetch(`${process.env.PESAPAL_BASE_URL}/api/Transactions/SubmitOrderRequest`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(orderRequest)
    });

    const data = await res.json();
    return NextResponse.json(data);
}