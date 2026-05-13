// src/app/api/payments/pesapal/verify/route.ts
import { NextResponse } from 'next/server';
import { getPesaPalToken } from '@/lib/payments/pesapal';
import { createClient } from '@supabase/supabase-js'; 

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const trackingId = searchParams.get('trackingId');

    if (!trackingId) return NextResponse.json({ success: false }, { status: 400 });

    try {
        const token = await getPesaPalToken();
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY! 
        );

        // 1. Gateway Handshake
        const res = await fetch(`${process.env.PESAPAL_BASE_URL}/api/Transactions/GetTransactionStatus?orderTrackingId=${trackingId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const paymentData = await res.json();

        // 2. Success Validation (1 = Completed)
        if (paymentData.status_code === 1) {
            
            // Resolve business via Tracking ID
            const { data: tenant } = await supabase
                .from('tenants')
                .select('id, subscription_plan')
                .eq('pesapal_order_tracking_id', trackingId)
                .single();

            if (!tenant) throw new Error("Identity Mismatch");

            // 3. AUTHORITATIVE ACTIVATION (Unlock the Gate)
            const { error: rpcError } = await supabase.rpc('proc_authorize_business_access', {
                p_biz_id: tenant.id,
                p_plan_name: tenant.subscription_plan || 'ENTERPRISE',
                p_tracking_id: trackingId,
                p_amount: paymentData.amount
            });

            if (rpcError) throw new Error("Sync Failed");

            return NextResponse.json({ success: true, businessId: tenant.id });
        }

        return NextResponse.json({ success: false, message: "Verification Pending" });

    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}