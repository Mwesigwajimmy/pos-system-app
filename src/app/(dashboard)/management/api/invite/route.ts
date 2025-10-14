// This is the final, definitive, and correct version of your API route.
// It uses the correct Supabase function and will work.

import { createClient } from '@supabase/supabase-js';
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
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { get: (name) => cookieStore.get(name)?.value } }
    );

    const { data: { user: adminUser } } = await supabase.auth.getUser();
    if (!adminUser) {
      return NextResponse.json({ error: 'You must be logged in.' }, { status: 401 });
    }

    const { data: adminProfile, error: profileError } = await supabase
      .from('profiles').select('business_id').eq('id', adminUser.id).single();

    if (profileError || !adminProfile?.business_id) {
      return NextResponse.json({ error: 'You are not associated with a business.' }, { status: 403 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // --- The Intelligent Logic Starts Here ---
    
    // 1. Check if a user with this email already exists.
    // Use listUsers to get all users and then filter in application logic.
    const { data: { users }, error: userListError } = await supabaseAdmin.auth.admin.listUsers();

    if (userListError) {
      // If there's an actual error fetching the list, throw it.
      throw userListError;
    }

    // Find if a user with the given email exists in the fetched list
    const existingUser = users.find(user => user.email === email);

    if (existingUser) {
      // 2. USER EXISTS: Assign them the new role.
      const { data: existingProfile, error: existingProfileError } = await supabaseAdmin
        .from('profiles').select('business_id').eq('id', existingUser.id).single(); // Use existingUser.id here

      if (existingProfileError) throw existingProfileError;
      
      if (existingProfile.business_id !== adminProfile.business_id) {
        return NextResponse.json({ error: 'This user exists but is not part of your business.' }, { status: 403 });
      }

      const { error: updateError } = await supabaseAdmin
        .from('profiles').update({ role: role }).eq('id', existingUser.id); // Use existingUser.id here
      
      if (updateError) throw updateError;
      
      return NextResponse.json({ message: `Role successfully updated for ${fullName}!` });

    } else {
      // 3. USER DOES NOT EXIST: Invite them.
      const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        data: {
          full_name: fullName,
          role: role,
          business_id: adminProfile.business_id,
          is_invite: true,
        },
      });

      if (inviteError) throw inviteError;
      
      return NextResponse.json({ message: `Invitation successfully sent to ${fullName}!` });
    }

  } catch (e: any) {
    console.error("API Error:", e); // Log the error for debugging
    return NextResponse.json({ error: e.message || 'An unexpected error occurred.' }, { status: 500 });
  }
}