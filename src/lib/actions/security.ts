// src/lib/actions/security.ts
'use server'

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { randomBytes } from 'crypto';

// Generates a secure, random API Key (sk_live_...)
function generateSecureKey() {
  const buffer = randomBytes(24);
  return `sk_live_${buffer.toString('hex')}`;
}

export async function getApiCredentials() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  
  // 1. Get Current User & Tenant
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');
  
  const tenantId = user.user_metadata.org_id || user.id;

  // 2. Fetch Existing Key securely
  const { data, error } = await supabase
    .from('tenants') // Assuming keys are stored on the tenant record
    .select('api_key, api_endpoint')
    .eq('id', tenantId)
    .single();

  if (error) throw new Error('Could not fetch API credentials');

  // If no key exists yet, generate one automatically
  if (!data.api_key) {
    return await rotateApiKey();
  }

  return { 
    apiKey: data.api_key, 
    endpoint: data.api_endpoint || `https://api.yoursacco.com/v1/sacco/${tenantId}` 
  };
}

export async function rotateApiKey() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');
  
  const tenantId = user.user_metadata.org_id || user.id;
  const newKey = generateSecureKey();

  // 3. Update DB with new Key
  const { error } = await supabase
    .from('tenants')
    .update({ 
      api_key: newKey,
      api_key_last_rotated: new Date().toISOString()
    })
    .eq('id', tenantId);

  if (error) throw new Error('Failed to rotate API Key');

  return { 
    apiKey: newKey, 
    endpoint: `https://api.yoursacco.com/v1/sacco/${tenantId}` 
  };
}