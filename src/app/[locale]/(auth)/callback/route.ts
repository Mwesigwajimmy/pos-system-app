// src/app/auth/callback/route.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

/**
 * --- BBU1 SOVEREIGN AUTH CALLBACK ---
 * VERSION: v17.8 OMEGA (THE FINAL REDIRECT ANCHOR)
 * FIXED: Identity Shadowing & Middleware Race Conditions
 */

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const { searchParams, origin } = requestUrl;
  const authCode = searchParams.get('code');
  
  // 🛡️ LOCALE AWARENESS: Preserve the language during redirect
  const cookieStore = cookies();
  const locale = cookieStore.get('NEXT_LOCALE')?.value || 'en';
  
  const next = searchParams.get('next') ?? `/${locale}/dashboard`;
  const errorRedirectUrl = new URL(`/${locale}/auth/auth-error`, origin);

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
  // We fetch the context using the NEWLY established session.
  const { data: contextData } = await supabase.rpc('get_user_context');
  const userContext = contextData && contextData.length > 0 ? contextData[0] : null;

  // 🛡️ CRITICAL FIX: PHYSICAL COOKIE ANCHOR
  // We must set the business ID cookie HERE. If we wait for the frontend to do it,
  // the Middleware will fail the very next request.
  if (userContext?.business_id) {
    cookieStore.set('bbu1_active_business_id', userContext.business_id, {
        path: '/',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        sameSite: 'lax',
    });
  }

  // 3. SECURE REDIRECT LOGIC
  // If the user hasn't finished setup, send to welcome. 
  // We use localized paths to prevent Middleware 307 jumps.
  if (userContext && !userContext.setup_complete) {
    return NextResponse.redirect(`${origin}/${locale}/welcome`);
  }

  // Final hand-off to the dashboard or intended 'next' destination
  // If 'next' doesn't have a locale, we prepend it.
  const finalDestination = next.startsWith('/') ? next : `/${next}`;
  const localizedDestination = finalDestination.includes(`/${locale}/`) 
    ? finalDestination 
    : `/${locale}${finalDestination.replace(/^\/(de|en|fr|lg|nl|no|nyn|pt-BR|ru|rw|sw|zh)/, '')}`;

  return NextResponse.redirect(`${origin}${localizedDestination}`);
}