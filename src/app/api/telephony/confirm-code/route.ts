import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    try {
        const { businessId, code } = await req.json();

        // 1. VALIDATE PENDING TOKEN IN VAULT
        const { data: verification, error: verifyError } = await supabase
            .from('aura_telephony_verifications')
            .select('*')
            .eq('business_id', businessId)
            .eq('verification_code', code)
            .eq('status', 'pending')
            .single();

        if (verifyError || !verification) {
            throw new Error("Invalid or Expired Verification Signal.");
        }

        // 2. SEAL THE IDENTITY
        // Mark the line as verified in the tenants table
        const { error: updateError } = await supabase
            .from('tenants')
            .update({ 
                aura_voice_verified: true,
                aura_caller_id_phone: verification.phone_number 
            })
            .eq('id', businessId);

        if (updateError) throw updateError;

        // 3. RETIRE THE TOKEN
        await supabase
            .from('aura_telephony_verifications')
            .update({ status: 'verified' })
            .eq('id', verification.id);

        return NextResponse.json({ 
            success: true, 
            message: "Identity Locked. Your company line is now live." 
        });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 400 });
    }
}