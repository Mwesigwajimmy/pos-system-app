import { NextResponse } from 'next/server';
import { getPesaPalToken } from '@/lib/payments/pesapal';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const trackingId = searchParams.get('trackingId');
    
    const token = await getPesaPalToken();
    const supabase = createClient(cookies());

    // 1. Check PesaPal Status
    const res = await fetch(`${process.env.PESAPAL_BASE_URL}/api/Transactions/GetTransactionStatus?orderTrackingId=${trackingId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const paymentData = await res.json();

    // 2. If Payment is COMPLETED (Status Code 1)
    if (paymentData.status_code === 1) {
        const { data: profile } = await supabase.from('profiles').select('business_id').single();
        
        // Use the SQL function we created in Step 1
        await supabase.rpc('activate_business_trial', {
            p_biz_id: profile?.business_id,
            p_plan_name: paymentData.description.split(' ')[2], // Extract plan name from description
            p_tracking_id: trackingId
        });

        return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false });
}