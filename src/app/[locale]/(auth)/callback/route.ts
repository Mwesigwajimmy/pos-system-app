// src/app/auth/callback/route.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

/**
 * This server-side route handles the OAuth callback from Supabase.
 * When a user signs in with a provider like Google, they are redirected here.
 * This route then exchanges the authorization code for a user session.
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const { searchParams, origin } = requestUrl;
  const authCode = searchParams.get('code');

  // Construct the URL for the error page.
  // This approach allows us to pass a specific error message to the client
  // without exposing internal details.
  const errorRedirectUrl = new URL('/auth/auth-error', origin);

  if (!authCode) {
    // If no authorization code is provided, redirect to an error page.
    // This can happen if the user manually navigates to this URL.
    errorRedirectUrl.searchParams.set('message', 'Invalid authentication request: No code provided.');
    return NextResponse.redirect(errorRedirectUrl);
  }

  // Check for mandatory environment variables.
  // This provides a clear server-side error if the project is misconfigured.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    errorRedirectUrl.searchParams.set('message', 'Server configuration error: Missing Supabase credentials.');
    console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables.');
    return NextResponse.redirect(errorRedirectUrl);
  }

  const cookieStore = cookies();
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        cookieStore.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        cookieStore.set({ name, value: '', ...options });
      },
    },
  });

  // Exchange the authorization code for a user session.
  const { error } = await supabase.auth.exchangeCodeForSession(authCode);

  if (error) {
    // Log the detailed error on the server for debugging purposes.
    console.error('Supabase Auth Error:', error.message);

    // If the code exchange fails, redirect to the error page with a user-friendly message.
    errorRedirectUrl.searchParams.set('message', 'Failed to authenticate. The link may have expired or been used already.');
    return NextResponse.redirect(errorRedirectUrl);
  }

  // On successful authentication, redirect the user to their intended page
  // or the dashboard root. The "next" parameter allows for redirecting
  // back to a specific page after login (e.g., a settings page).
  const next = searchParams.get('next') ?? '/';
  return NextResponse.redirect(`${origin}${next}`);
}