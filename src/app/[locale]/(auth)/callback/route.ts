// src/app/auth/callback/route.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const { searchParams, origin } = requestUrl;
  const authCode = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard'; // Default to dashboard for better flow

  const errorRedirectUrl = new URL('/auth/auth-error', origin);

  if (!authCode) {
    errorRedirectUrl.searchParams.set('message', 'Invalid authentication request: No code provided.');
    return NextResponse.redirect(errorRedirectUrl);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    errorRedirectUrl.searchParams.set('message', 'Server configuration error: Missing Supabase credentials.');
    return NextResponse.redirect(errorRedirectUrl);
  }

  const cookieStore = cookies();
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) { return cookieStore.get(name)?.value; },
      set(name: string, value: string, options: CookieOptions) {
        cookieStore.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        cookieStore.set({ name, value: '', ...options });
      },
    },
  });

  // 1. EXCHANGE CODE FOR SESSION
  const { data: sessionData, error: sessionError } = await supabase.auth.exchangeCodeForSession(authCode);

  if (sessionError) {
    console.error('Supabase Auth Error:', sessionError.message);
    errorRedirectUrl.searchParams.set('message', 'Authentication failed: ' + sessionError.message);
    return NextResponse.redirect(errorRedirectUrl);
  }

  // 2. THE IDENTITY WELD: PRE-EMPTIVE CONTEXT RESOLUTION
  // We fetch the user context IMMEDIATELY after login to determine 
  // if they are an Owner, Accountant (like Jimmy), or Architect.
  const { data: contextData } = await supabase.rpc('get_user_context');
  
  const userContext = contextData && contextData.length > 0 ? contextData[0] : null;

  // 3. SECURE REDIRECT LOGIC
  // If the user has not finished onboarding, force them to the welcome page
  if (userContext && !userContext.setup_complete) {
    return NextResponse.redirect(`${origin}/welcome`);
  }

  // If we are logging in an existing Jimmy-type user, we send them straight 
  // to the dashboard so the Middleware can apply the role-based routing.
  return NextResponse.redirect(`${origin}${next}`);
}