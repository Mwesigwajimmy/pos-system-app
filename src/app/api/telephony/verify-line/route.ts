import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

/**
 * --- BBU1 TELEPHONY VERIFICATION HANDSHAKE ---
 * VERSION: v2.0 OMEGA-MASTER (FORENSIC PERSISTENCE)
 * Logic: Generates a persistent security token, locks it in the DB, and triggers Aura.
 */

export async function POST(req: NextRequest) {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    try {
        const { businessId, phone } = await req.json();

        // 1. IDENTITY GUARD: Deep verification of the requesting actor
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { data: employee } = await supabase
            .from('employees')
            .select('id, business_id')
            .eq('user_id', user.id)
            .eq('business_id', businessId)
            .single();

        if (!employee) throw new Error("Director Identity Mismatch. Access Denied.");

        // 2. GENERATE AND LOCK FORENSIC TOKEN
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Insert into physical registry with 10-minute expiration
        const { error: dbError } = await supabase
            .from('aura_telephony_verifications')
            .insert([{
                business_id: businessId,
                phone_number: phone,
                verification_code: verificationCode,
                expires_at: new Date(Date.now() + 10 * 60000).toISOString(), // 10 Min TTL
                status: 'pending'
            }]);

        if (dbError) throw new Error(`Vault Insertion Failed: ${dbError.message}`);

        // 3. TRIGGER THE AURA VOICE Handshake
        // Points to your SambaNova brain logic
        const response = await fetch('https://api.vapi.ai/call/phone', {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${process.env.VAPI_API_KEY}`, 
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify({
                phoneNumber: phone,
                assistant: {
                    model: {
                        provider: "custom-llm",
                        url: `${process.env.NEXT_PUBLIC_APP_URL}/api/chat`,
                        model: "Meta-Llama-3.3-70B-Instruct"
                    },
                    firstMessage: `Hello, I am Aura, your digital concierge. I am calling to verify your company's physical office line. Your security code is ${verificationCode.split('').join(' ')}. Again, that is ${verificationCode.split('').join(' ')}. Please enter this code into your ERP dashboard.`
                },
                metadata: {
                    business_id: businessId,
                    handshake_id: verificationCode
                }
            })
        });

        if (!response.ok) throw new Error("Voice Switchboard Unreachable");

        return NextResponse.json({ 
            success: true, 
            message: "Signal dispatched. Aura is dialing your line.",
            expiry: "10 minutes"
        });

    } catch (e: any) {
        console.error("[TELEPHONY ERROR]", e.message);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}