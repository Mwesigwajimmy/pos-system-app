import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
    try {
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const body = await req.json();
        const { email, full_name, organization, industry, intent, message, amount } = body;

        if (!email || !full_name) {
            return NextResponse.json({ error: "Missing required identity fields." }, { status: 400 });
        }

        const { error } = await supabaseAdmin
            .from('system_marketing_leads')
            .insert([{
                email: email.toLowerCase().trim(),
                full_name,
                organization: organization || 'Private Visionary',
                industry: industry || 'General',
                intent: intent || 'Inquiry',
                metadata: {
                    message: message || '',
                    donation_amount: amount || null,
                    captured_at: new Date().toISOString(),
                    user_agent: req.headers.get('user-agent')
                }
            }]);

        if (error) throw error;

        return NextResponse.json({ success: true, message: "Transmission received by BBU1 Core." });

    } catch (e: any) {
        return NextResponse.json({ error: "Core connection failure." }, { status: 500 });
    }
}