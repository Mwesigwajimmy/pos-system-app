import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

/**
 * LITONU BUSINESS BASE UNIVERSE LTD - SOVEREIGN RECRUITMENT PROTOCOL
 * 
 * UPGRADE: Deeply aligned with Multi-Tenant, Multi-Country, and Multi-Currency logic.
 * Ensures the identity is sealed to the correct target business node.
 */
export async function POST(request: Request) {
  try {
    const { email, fullName, role, businessId } = await request.json();
    const cleanEmail = email.trim().toLowerCase();

    // 1. IDENTITY INTEGRITY CHECK
    if (!cleanEmail || !fullName || !role) {
      return NextResponse.json({ error: 'Identity credentials (email, name, role) are required' }, { status: 400 });
    }

    const cookieStore = cookies();
    const NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        return NextResponse.json({ error: 'Sovereign Infrastructure Fault: Missing System Keys' }, { status: 500 });
    }

    // Standard client for session validation
    const supabase = createServerClient(NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      cookies: { get: (name) => cookieStore.get(name)?.value }
    });

    // Admin client to bypass RLS for recruitment
    const supabaseAdmin = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });

    // 2. AUTHORITY VALIDATION
    const { data: { user: adminUser } } = await supabase.auth.getUser();
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized: Sovereign session required.' }, { status: 401 });
    }

    // 3. NODE RESOLUTION (Multi-Tenant Awareness)
    // We prioritize the businessId passed from the UI
    const activeBizId = businessId || cookieStore.get('bbu1_active_business_id')?.value;

    if (!activeBizId) {
      return NextResponse.json({ error: 'Context Error: No target business node detected.' }, { status: 403 });
    }

    // 4. IDENTITY DISCOVERY (Check if user exists in the Universe)
    const { data: userData, error: listError } = await supabaseAdmin.auth.admin.listUsers(); 
    if (listError) throw listError;

    const existingUser = userData?.users.find(u => u.email === cleanEmail);

    if (existingUser) {
      // --- BRANCH A: WELD EXISTING GLOBAL IDENTITY ---
      // User exists. We simply link them to the new business node with a specific role.
      const { error: membershipError } = await supabaseAdmin
        .from('business_memberships')
        .upsert({ 
            user_id: existingUser.id, 
            business_id: activeBizId,
            role: role, // e.g. 'procurement_officer'
            is_active: true,
            is_primary: false 
        }, { onConflict: 'user_id, business_id' });

      if (membershipError) throw membershipError;

      return NextResponse.json({ 
        message: `${fullName} is already a BBU1 member. They have been successfully linked to this node!` 
      });

    } else {
      // --- BRANCH B: NEW USER RECRUITMENT ---
      // User is new to the system. We send the "Smart Invite".
      const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(cleanEmail, {
        data: {
          full_name: fullName,
          role: role,
          business_id: activeBizId, // This ensures the Trigger births them into the right node
          is_invite: true,
        },
        // We use the full domain to ensure the email link is authoritative
        redirectTo: `https://www.bbu1.com/accept-invite`
      });

      if (inviteError) {
          console.error("SMTP_HANDSHAKE_FAILURE:", inviteError.message);
          // Return a descriptive error to help fix the SMTP settings
          return NextResponse.json({ 
              error: `SMTP Failure: ${inviteError.message}. Check Supabase SMTP settings for Port 465/SSL.` 
          }, { status: 500 });
      }

      return NextResponse.json({ message: `Invitation successfully dispatched to ${fullName}!` });
    }

  } catch (e: any) {
    console.error("CRITICAL RECRUITMENT FAILURE:", e);
    return NextResponse.json({ error: e.message || 'Identity Handshake Failed' }, { status: 500 });
  }
}