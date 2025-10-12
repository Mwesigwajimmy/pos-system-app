// File: src/app/(dashboard)/management/api/invite/route.ts

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  // This is a secure, server-only environment.
  try {
    // We create a Supabase client with ADMIN privileges using the secret SERVICE_ROLE_KEY.
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { email, fullName, role, businessId } = await request.json();

    if (!email || !fullName || !role || !businessId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // This is the master Admin function that is guaranteed to exist.
    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: {
        // This data is securely attached to the invitation.
        // Our 'handle_new_user' trigger will use it when the new user signs up.
        full_name: fullName,
        role: role,
        business_id: businessId,
        is_invite: true,
      },
    });

    if (error) {
      // If there's an error, we return it.
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // If successful, we return a success message.
    return NextResponse.json({ message: 'Invitation sent successfully!', data });

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}