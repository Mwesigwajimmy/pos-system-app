// File: app/api/accept-invite/route.ts

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { accessToken, password } = await request.json();

    if (!accessToken || !password) {
      return NextResponse.json({ error: 'Access token and password are required.' }, { status: 400 });
    }

    // Create a temporary Supabase client authenticated AS THE USER.
    // This proves the access token is valid and gets us their user ID.
    const supabaseUserClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
    );

    const { data: { user }, error: userError } = await supabaseUserClient.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Invalid or expired access token.' }, { status: 401 });
    }

    // Now, create the MASTER ADMIN client using the service role key.
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Use the master client to forcibly update the user's password.
    // This is the guaranteed way to set the password for an invited user.
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { password: password }
    );

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ message: 'Password set successfully.' });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}