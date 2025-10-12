// This is the final, definitive, and correct version of your API route.

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { email, fullName, role } = await request.json();
    if (!email || !fullName || !role) {
      return NextResponse.json({ error: 'Email, full name, and role are required' }, { status: 400 });
    }

    const cookieStore = cookies();
    
    // Create a server client that knows who the logged-in user (the admin) is.
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { get: (name) => cookieStore.get(name)?.value } }
    );

    // Get the currently logged-in user's data.
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'You must be logged in to assign roles.' }, { status: 401 });
    }

    // THIS IS THE KEY: Securely fetch the admin's business ID from the profiles table.
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('business_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.business_id) {
      // This is the error you were seeing, now correctly handled on the server.
      return NextResponse.json({ error: 'You are not associated with a business and cannot assign roles.' }, { status: 403 });
    }

    // Now, create the MASTER ADMIN client to perform the action.
    const supabaseAdmin = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { cookies: { get: (name) => cookieStore.get(name)?.value } }
    );

    // Call our new, correct function, passing in the admin's business ID.
    const { error: rpcError } = await supabaseAdmin.rpc('assign_role_to_existing_user', {
      p_admin_business_id: profile.business_id,
      p_email: email,
      p_full_name: fullName,
      p_role: role,
    });

    if (rpcError) throw rpcError;

    return NextResponse.json({ message: 'Role assigned or invitation sent successfully!' });

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}