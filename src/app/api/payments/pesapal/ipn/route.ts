import { NextResponse } from 'next/server';
import { getPesaPalToken } from '@/lib/payments/pesapal';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    
    // PesaPal sends these 3 parameters to your IPN
    const trackingId = searchParams.get('OrderTrackingId');
    const merchantRef = searchParams.get('OrderMerchantReference');
    const notificationType = searchParams.get('OrderNotificationType');

    if (notificationType !== 'IPNCHANGE') {
        return NextResponse.json({ status: 200 });
    }

    const token = await getPesaPalToken();
    const supabase = createClient(cookies());

    // 1. Verify the actual status from PesaPal servers (Security Check)
    const res = await fetch(`${process.env.PESAPAL_BASE_URL}/api/Transactions/GetTransactionStatus?orderTrackingId=${trackingId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const paymentData = await res.json();

    // 2. If status is COMPLETED (status_code 1), activate the trial
    if (paymentData.status_code === 1) {
        // Find the business based on the tracking ID we stored during initiation
        const { data: tenant } = await supabase
            .from('tenants')
            .select('id')
            .eq('pesapal_order_tracking_id', trackingId)
            .single();

        if (tenant) {
            await supabase.rpc('activate_business_trial', {
                p_biz_id: tenant.id,
                p_plan_name: paymentData.description.split(' ')[2], // Matches plan from description
                p_tracking_id: trackingId
            });
        }
    }

    // 3. ALWAYS return a 200 OK to PesaPal so they stop retrying
    return NextResponse.json({ status: 200 });
}