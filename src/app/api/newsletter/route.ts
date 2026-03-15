import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { email, interest, company } = await request.json();

        if (!email || !email.includes('@')) {
            return NextResponse.json({ error: 'Valid business email required' }, { status: 400 });
        }

        const { error } = await supabase
            .from('system_newsletter_signups')
            .insert([{ 
                email: email.toLowerCase().trim(), 
                interest: interest || 'General Intel',
                company_name: company || null,
                captured_at: new Date().toISOString()
            }]);

        if (error) {
            if (error.code === '23505') {
                return NextResponse.json({ message: 'Identity already verified in network' }, { status: 200 });
            }
            throw error;
        }

        return NextResponse.json({ message: 'Access granted to BBU1 Intel' }, { status: 200 });

    } catch (error: any) {
        return NextResponse.json({ error: 'System connection error' }, { status: 500 });
    }
}