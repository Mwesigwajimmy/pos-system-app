import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

/**
 * --- BBU1 SOVEREIGN AUTH CALLBACK ---
 * VERSION: v17.9 OMEGA (THE ULTIMATE IDENTITY ANCHOR)
 * 
 * DEEP WELD LOGIC:
 * 1. Corrected Route Group Resolution: (auth) is invisible in URL.
 * 2. Hardened Locale Preservation: Extracts locale from both URL and Cookies.
 * 3. Identity Shadowing Prevention: Forces business ID anchor before next hop.
 */

export async function GET(
    request: Request, 
    { params }: { params: { locale: string } } // DEEP WELD: Using Next.js params for 100% accuracy
) {
    const requestUrl = new URL(request.url);
    const { searchParams, origin } = requestUrl;
    const authCode = searchParams.get('code');
    
    // 🛡️ LOCALE AWARENESS: Priority 1: URL Params | Priority 2: Cookies | Priority 3: Default 'en'
    const cookieStore = cookies();
    const locale = params.locale || cookieStore.get('NEXT_LOCALE')?.value || 'en';
    
    // Calculate fallback destination if 'next' is missing
    const next = searchParams.get('next') ?? `/${locale}/dashboard`;
    const errorRedirectUrl = new URL(`/${locale}/auth-error`, origin); // Adjusted: Removed '/auth'

    // 1. PROTOCOL VALIDATION
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

    // 2. EXCHANGE CODE FOR SESSION
    const { data: sessionData, error: sessionError } = await supabase.auth.exchangeCodeForSession(authCode);

    if (sessionError) {
        console.error('Supabase Auth Error:', sessionError.message);
        errorRedirectUrl.searchParams.set('message', 'Authentication failed: ' + sessionError.message);
        return NextResponse.redirect(errorRedirectUrl);
    }

    // 3. THE IDENTITY WELD: PRE-EMPTIVE CONTEXT RESOLUTION
    const { data: contextData } = await supabase.rpc('get_user_context');
    const userContext = contextData && contextData.length > 0 ? contextData[0] : null;

    // 🛡️ CRITICAL FIX: PHYSICAL COOKIE ANCHOR
    if (userContext?.business_id) {
        cookieStore.set('bbu1_active_business_id', userContext.business_id, {
            path: '/',
            maxAge: 60 * 60 * 24 * 30, // 30 days
            sameSite: 'lax',
        });
    }

    // 4. SECURE REDIRECT LOGIC
    if (userContext && !userContext.setup_complete) {
        return NextResponse.redirect(`${origin}/${locale}/welcome`);
    }

    /**
     * FINAL HAND-OFF: Localized destination calculation
     * Ensures we don't drop the user back to the default locale or home page.
     */
    let finalDestination = next;

    // If 'next' is just a path like '/update-password', we make it absolute and localized
    if (!finalDestination.startsWith(`/${locale}/`)) {
        // Remove existing locale if present (e.g., from /en/update-password -> update-password)
        const cleanPath = finalDestination.replace(/^\/(de|en|fr|lg|nl|no|nyn|pt-BR|ru|rw|sw|zh)/, '').replace(/^\//, '');
        finalDestination = `/${locale}/${cleanPath}`;
    }

    return NextResponse.redirect(`${origin}${finalDestination}`);
}