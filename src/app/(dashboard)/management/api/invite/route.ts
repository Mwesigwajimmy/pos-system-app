// This is the final, definitive, and correct version of your API route.
// It uses the correct Supabase function and will work.

import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  // --- ADDED DEBUG LOG ---
  console.log("API: /dashboard/management/api/invite - POST handler invoked.");

  try {
    const { email, fullName, role } = await request.json();
    console.log("API: Request body parsed:", { email, fullName, role });

    if (!email || !fullName || !role) {
      console.error("API: Missing required fields in request body. Email:", email, "FullName:", fullName, "Role:", role);
      return NextResponse.json({ error: 'Email, full name, and role are required' }, { status: 400 });
    }

    const cookieStore = cookies();
    
    // --- IMPORTANT: Explicitly check for environment variables ---
    const NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!NEXT_PUBLIC_SUPABASE_URL || !NEXT_PUBLIC_SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      const missingKeys = [];
      if (!NEXT_PUBLIC_SUPABASE_URL) missingKeys.push('NEXT_PUBLIC_SUPABASE_URL');
      if (!NEXT_PUBLIC_SUPABASE_ANON_KEY) missingKeys.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');
      if (!SUPABASE_SERVICE_ROLE_KEY) missingKeys.push('SUPABASE_SERVICE_ROLE_KEY');
      console.error("API: Missing one or more Supabase environment variables! Missing:", missingKeys.join(', '));
      return NextResponse.json({ error: `Server configuration error: Missing Supabase keys: ${missingKeys.join(', ')}.` }, { status: 500 });
    }
    console.log("API: All required Supabase environment variables are present.");

    const supabase = createServerClient(
      NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { cookies: { get: (name) => cookieStore.get(name)?.value } }
    );
    console.log("API: Supabase client (user-authenticated) created.");


    const { data: { user: adminUser }, error: getUserError } = await supabase.auth.getUser();
    if (getUserError) {
      console.error("API: Error getting admin user:", getUserError);
      return NextResponse.json({ error: 'Error authenticating admin user.' }, { status: 401 });
    }
    if (!adminUser) {
      console.warn("API: Unauthorized access - No authenticated admin user found.");
      return NextResponse.json({ error: 'You must be logged in.' }, { status: 401 });
    }
    console.log("API: Admin user authenticated:", adminUser.id);

    const { data: adminProfile, error: profileError } = await supabase
      .from('profiles').select('business_id').eq('id', adminUser.id).single();

    if (profileError || !adminProfile?.business_id) {
      console.warn("API: Admin user not associated with a business or profile error:", profileError?.message);
      return NextResponse.json({ error: 'You are not associated with a business.' }, { status: 403 });
    }
    console.log("API: Admin business ID:", adminProfile.business_id);

    const supabaseAdmin = createClient(
      NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY
    );
    console.log("API: Supabase Admin client (service role) created.");

    // --- The Intelligent Logic Starts Here ---
    
    // 1. Check if a user with this email already exists.
    console.log("API: Checking for existing user via listUsers.");
    const { data: { users }, error: userListError } = await supabaseAdmin.auth.admin.listUsers();

    if (userListError) {
      console.error("API: Error listing users:", userListError);
      throw userListError; // If there's an actual error fetching the list, throw it.
    }
    console.log(`API: Fetched ${users.length} users from Supabase Auth.`);

    // Find if a user with the given email exists in the fetched list
    const existingUser = users.find(user => user.email === email);
    console.log("API: Existing user check result for email", email, ":", existingUser ? 'found' : 'not found');

    if (existingUser) {
      // 2. USER EXISTS: Assign them the new role.
      console.log(`API: User ${email} exists. Attempting to update role.`);
      const { data: existingProfile, error: existingProfileError } = await supabaseAdmin
        .from('profiles').select('business_id').eq('id', existingUser.id).single(); // Use existingUser.id here

      if (existingProfileError) {
        console.error("API: Error fetching existing user profile from DB:", existingProfileError);
        throw existingProfileError;
      }
      
      if (existingProfile.business_id !== adminProfile.business_id) {
        console.warn("API: Existing user is not part of the admin's business. Existing user business ID:", existingProfile.business_id, "Admin business ID:", adminProfile.business_id);
        return NextResponse.json({ error: 'This user exists but is not part of your business.' }, { status: 403 });
      }

      console.log(`API: Updating role for existing user ${existingUser.id} to ${role}.`);
      const { error: updateError } = await supabaseAdmin
        .from('profiles').update({ role: role }).eq('id', existingUser.id); // Use existingUser.id here
      
      if (updateError) {
        console.error("API: Error updating existing user role in DB:", updateError);
        throw updateError;
      }
      console.log("API: Role updated successfully for existing user.");
      return NextResponse.json({ message: `Role successfully updated for ${fullName}!` });

    } else {
      // 3. USER DOES NOT EXIST: Invite them.
      console.log(`API: User ${email} does not exist. Attempting to invite.`);
      const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        data: {
          full_name: fullName,
          role: role,
          business_id: adminProfile.business_id,
          is_invite: true,
        },
      });

      if (inviteError) {
        console.error("API: Error inviting new user via Supabase Auth:", inviteError);
        throw inviteError;
      }
      console.log("API: Invitation sent successfully.");
      return NextResponse.json({ message: `Invitation successfully sent to ${fullName}!` });
    }

  } catch (e: any) {
    console.error("API Error: Uncaught exception in invite route. Details:", e); // Log the error for debugging
    return NextResponse.json({ error: e.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}