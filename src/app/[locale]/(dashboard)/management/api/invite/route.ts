import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

/**
 * SOVEREIGN RECRUITMENT PROTOCOL
 */
export async function POST(request: Request) {
  try {
    const { email, fullName, role, businessId } = await request.json();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !fullName || !role) {
      return NextResponse.json({ error: 'Identity credentials (email, name, role) are required' }, { status: 400 });
    }

    const cookieStore = cookies();
    
    const NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        return NextResponse.json({ error: 'Sovereign Configuration Error: Missing Infrastructure Keys' }, { status: 500 });
    }

    const supabase = createServerClient(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      cookies: { get: (name) => cookieStore.get(name)?.value }
    });

    const supabaseAdmin = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // --- CONTEXT VALIDATION ---
    const { data: { user: adminUser } } = await supabase.auth.getUser();
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized: Commander session required.' }, { status: 401 });
    }

    // Use the explicitly passed businessId from the Modal (The Active Node)
    const activeBizId = businessId || cookieStore.get('bbu1_active_business_id')?.value;

    if (!activeBizId) {
      return NextResponse.json({ error: 'Identity Error: Target business node not specified.' }, { status: 403 });
    }

    // --- IDENTITY DISCOVERY ---
    const { data: userData } = await supabaseAdmin.auth.admin.listUsers(); 
    const existingUser = userData?.users.find(u => u.email === cleanEmail);

    if (existingUser) {
      // BRANCH A: WELD EXISTING GLOBAL IDENTITY
      const { error: membershipError } = await supabaseAdmin
        .from('business_memberships')
        .upsert({ 
            user_id: existingUser.id, 
            business_id: activeBizId,
            role: role,
            is_active: true,
            is_primary: false 
        }, { onConflict: 'user_id, business_id' });

      if (membershipError) throw membershipError;

      return NextResponse.json({ 
        message: `${fullName} is already a BBU1 member. They have been successfully linked to this node!` 
      });

    } else {
      // BRANCH B: NEW USER RECRUITMENT
      const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(cleanEmail, {
        data: {
          full_name: fullName,
          role: role,
          business_id: activeBizId,
          is_invite: true,
        },
        redirectTo: `${new URL(request.url).origin}/accept-invite`
      });

      if (inviteError) throw inviteError;

      return NextResponse.json({ message: `Invitation dispatched to ${fullName}!` });
    }

  } catch (e: any) {
    console.error("CRITICAL RECRUITMENT ERROR:", e);
    return NextResponse.json({ error: e.message || 'Fatal Protocol Error' }, { status: 500 });
  }
}