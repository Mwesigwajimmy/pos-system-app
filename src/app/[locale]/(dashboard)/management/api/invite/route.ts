// src/app/api/management/invite/route.ts
// V-REVOLUTION: MASTER RECRUITMENT & IDENTITY LINKING ENGINE
// Fully welded for Multi-Tenant Sovereign Identity Swapping.

import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

/**
 * SOVEREIGN RECRUITMENT PROTOCOL
 * Handles the logic for inviting new users or linking existing global identities
 * to the currently active business node.
 */
export async function POST(request: Request) {
  try {
    const { email, fullName, role } = await request.json();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !fullName || !role) {
      return NextResponse.json({ error: 'Identity credentials (email, name, role) are required' }, { status: 400 });
    }

    const cookieStore = cookies();
    
    // --- 1. INFRASTRUCTURE VALIDATION ---
    const NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        return NextResponse.json({ error: 'Sovereign Configuration Error: Missing Infrastructure Keys' }, { status: 500 });
    }

    // Standard client for inviter verification
    const supabase = createServerClient(
      NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { get: (name) => cookieStore.get(name)?.value } }
    );

    // Master Admin client for identity manipulation
    const supabaseAdmin = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // --- 2. CONTEXT RESOLUTION (THE WELD) ---
    // We check the 'bbu1_active_business_id' cookie first.
    // This ensures that if the Admin has switched businesses, the invite is bound 
    // to the CORRECT active node.
    const { data: { user: adminUser } } = await supabase.auth.getUser();
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized: Commander session required.' }, { status: 401 });
    }

    const activeBizId = cookieStore.get('bbu1_active_business_id')?.value || 
                        adminUser.user_metadata?.business_id || 
                        adminUser.app_metadata?.business_id;

    if (!activeBizId) {
      return NextResponse.json({ error: 'Identity Error: Could not resolve active business node.' }, { status: 403 });
    }

    // --- 3. GLOBAL IDENTITY DISCOVERY ---
    // Instead of listing all users (which is slow), we surgically look for this specific email.
    const { data: userData, error: fetchError } = await supabaseAdmin.auth.admin.listUsers(); 
    const existingUser = userData?.users.find(u => u.email === cleanEmail);

    if (existingUser) {
      // ==============================================================================
      // BRANCH A: GLOBAL IDENTITY LINKING
      // The user already exists in BBU1 (e.g., they are an owner elsewhere).
      // We "Weld" their existing ID to your active business node.
      // ==============================================================================
      console.log(`API: Identity ${cleanEmail} exists. Linking to node ${activeBizId}.`);

      // A1. Create the Membership Bridge
      const { error: membershipError } = await supabaseAdmin
        .from('business_memberships')
        .upsert({ 
            user_id: existingUser.id, 
            business_id: activeBizId,
            role: role,
            is_active: true,
            is_primary: false // This business is a secondary node for them
        }, { onConflict: 'user_id, business_id' });

      if (membershipError) throw membershipError;

      // A2. Sync local profile for display in employee lists
      // We use 'ON CONFLICT DO NOTHING' for certain fields to avoid overwriting their 
      // primary setup in their own business.
      const { error: profileSyncError } = await supabaseAdmin
        .from('profiles')
        .upsert({
            id: existingUser.id,
            full_name: fullName,
            email: cleanEmail,
            is_active: true,
            // We do NOT update business_id here to avoid breaking their "Home" node
        }, { onConflict: 'id' });

      if (profileSyncError) throw profileSyncError;

      return NextResponse.json({ 
        message: `${fullName} is already a BBU1 member. They have been successfully linked to your business as a ${role.replace('_', ' ')}!` 
      });

    } else {
      // ==============================================================================
      // BRANCH B: NEW USER RECRUITMENT
      // The user is new to the ecosystem. We dispatch a sovereign invitation.
      // ==============================================================================
      console.log(`API: Identity ${cleanEmail} is new. Initializing Invitation.`);

      const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(cleanEmail, {
        data: {
          full_name: fullName,
          role: role,
          business_id: activeBizId,
          is_invite: true, // This flag allows the 'handle_new_user' trigger to bypass owner setup
        },
        // Redirect them back to the 'Accept Invite' page we just built
        redirectTo: `${new URL(request.url).origin}/accept-invite`
      });

      if (inviteError) throw inviteError;

      return NextResponse.json({ 
        message: `Sovereign invitation dispatched to ${fullName}!` 
      });
    }

  } catch (e: any) {
    console.error("CRITICAL RECRUITMENT ERROR:", e);
    return NextResponse.json({ 
        error: e.message || 'The recruitment protocol encountered a fatal error.' 
    }, { status: 500 });
  }
}