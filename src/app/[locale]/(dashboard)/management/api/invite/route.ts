// src/app/api/management/invite/route.ts
// V-REVOLUTION: MASTER RECRUITMENT & IDENTITY LINKING ENGINE

import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  console.log("API: BBU1 Recruitment Protocol - POST handler invoked.");

  try {
    const { email, fullName, role } = await request.json();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !fullName || !role) {
      return NextResponse.json({ error: 'Identity credentials (email, name, role) are required' }, { status: 400 });
    }

    const cookieStore = cookies();
    
    // --- 1. ENVIRONMENT VALIDATION ---
    const NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        return NextResponse.json({ error: 'Sovereign Configuration Error: Missing Infrastructure Keys' }, { status: 500 });
    }

    const supabase = createServerClient(
      NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { get: (name) => cookieStore.get(name)?.value } }
    );

    // --- 2. AUTHENTICATION HANDSHAKE ---
    const { data: { user: adminUser } } = await supabase.auth.getUser();
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized: Commander session required.' }, { status: 401 });
    }

    // Resolve the business identity of the inviter
    const { data: adminProfile } = await supabase
      .from('profiles').select('business_id').eq('id', adminUser.id).single();

    if (!adminProfile?.business_id) {
      return NextResponse.json({ error: 'Unauthorized: User is not anchored to a valid business.' }, { status: 403 });
    }

    // Initialize the Admin Engine (Service Role) to perform account creation
    const supabaseAdmin = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // --- 3. GLOBAL IDENTITY DISCOVERY ---
    // We check if this person already has a BBU1 account anywhere in the world
    const { data: listUsersData, error: userListError } = await supabaseAdmin.auth.admin.listUsers();
    if (userListError) throw userListError;

    const existingUser = listUsersData.users.find(u => u.email === cleanEmail);

    if (existingUser) {
      // ==============================================================================
      // BRANCH A: GLOBAL IDENTITY LINKING
      // If the user exists, we don't send a new email. 
      // We "Weld" their existing ID to your business memberships.
      // ==============================================================================
      console.log(`API: Identity ${cleanEmail} exists globally. Executing Membership Bridge.`);

      const { error: membershipError } = await supabaseAdmin
        .from('business_memberships')
        .upsert({ 
            user_id: existingUser.id, 
            business_id: adminProfile.business_id,
            role: role,
            is_active: true,
            is_primary: false // This business is an additional node for them
        }, { onConflict: 'user_id, business_id' });

      if (membershipError) throw membershipError;

      // Ensure the profile is also updated/created without overwriting their own business ID
      // This ensures they appear in your local employee lists
      const { error: profileSyncError } = await supabaseAdmin
        .from('profiles')
        .upsert({
            id: existingUser.id,
            full_name: fullName,
            email: cleanEmail,
            is_active: true
        }, { onConflict: 'id' });

      return NextResponse.json({ 
        message: `${fullName} is already a BBU1 member. They have been successfully linked to your business as a ${role}!` 
      });

    } else {
      // ==============================================================================
      // BRANCH B: NEW USER RECRUITMENT
      // If the email is not in the system, send a formal invitation.
      // ==============================================================================
      console.log(`API: Identity ${cleanEmail} is new. Initializing Sovereign Invitation.`);

      const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(cleanEmail, {
        data: {
          full_name: fullName,
          role: role,
          business_id: adminProfile.business_id,
          is_invite: true, // This flag triggers our upgraded SQL 'handle_new_user' logic
        },
      });

      if (inviteError) throw inviteError;

      return NextResponse.json({ 
        message: `Invitation successfully dispatched to ${fullName}!` 
      });
    }

  } catch (e: any) {
    console.error("CRITICAL API ERROR: Recruitment Breach Failed.", e);
    return NextResponse.json({ error: e.message || 'The recruitment protocol encountered a fatal error.' }, { status: 500 });
  }
}