// File: app/api/invite/route.ts (or your custom path)

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // We now get fullName from the request body as well.
    const { email, fullName, role } = await request.json();

    if (!email || !fullName || !role) {
      return NextResponse.json({ error: 'Email, full name, and role are required' }, { status: 400 });
    }

    // We no longer invite the user. We now call our new, smart function
    // to either assign a role to an existing user or invite a new one.
    const { error } = await supabaseAdmin.rpc('assign_role_to_existing_user', {
      p_email: email,
      p_full_name: fullName,
      p_role: role,
    });

    if (error) {
      // If there's an error from the RPC, we return it.
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // If successful, we return a success message.
    return NextResponse.json({ message: 'Role assigned or invitation sent successfully!' });

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}