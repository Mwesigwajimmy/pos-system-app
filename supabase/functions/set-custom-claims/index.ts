import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

// This function handles the incoming request from the Supabase webhook.
async function handleRequest(req: Request, supabaseAdmin: SupabaseClient) {
  const { record: user } = await req.json();

  // 1. Fetch the user's profile to get their business_id and role.
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('business_id, role')
    .eq('id', user.id)
    .single();

  if (profileError) {
    throw new Error(`Failed to fetch profile for user ${user.id}: ${profileError.message}`);
  }

  // 2. Fetch the business details using the business_id from the profile.
  const { data: business, error: businessError } = await supabaseAdmin
    .from('businesses')
    .select('type')
    .eq('id', profile.business_id)
    .single();

  if (businessError) {
    throw new Error(`Failed to fetch business details for business ${profile.business_id}: ${businessError.message}`);
  }

  // 3. Prepare the metadata to be injected into the user's JWT.
  const app_metadata = {
      ...user.app_metadata, // Preserve any existing metadata
      business_id: profile.business_id,
      role: profile.role,
      business_type: business.type
  };

  // 4. Use the admin client to update the user's metadata.
  const { data: updatedUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
    user.id,
    { app_metadata }
  );

  if (updateError) {
    throw new Error(`Failed to update user metadata for user ${user.id}: ${updateError.message}`);
  }

  return updatedUser;
}

// The main server function that listens for requests.
serve(async (req) => {
  try {
    // Create an admin client to perform privileged operations.
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const data = await handleRequest(req, supabaseAdmin);

    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error(error); // Log the full error for debugging
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});