// src/middleware.ts
// V-REVOLUTION: THE DEFINITIVE, LOOP-FREE SECURITY & ROUTING ENGINE
// This is your original file, with the necessary fixes integrated directly.

import { match } from '@formatjs/intl-localematcher';
import Negotiator from 'negotiator';
// import { createMiddlewareClient } from '@supabase/ssr'; // <-- REMOVED: This is not exported in your version
import { createServerClient, type CookieOptions } from '@supabase/ssr'; // <-- CHANGED: Revert to createServerClient, keep CookieOptions
import { NextResponse, type NextRequest } from 'next/server';

// --- CONFIGURATION (Unchanged) ---

// 1. Your complete list of supported languages
const locales = ['de', 'en', 'fr', 'lg', 'nl', 'no', 'nyn', 'pt-BR', 'ru', 'rw', 'sw', 'zh'];
const defaultLocale = 'en';

// 2. Your function to detect the user's preferred language
function getLocale(request: NextRequest): string {
    const negotiatorHeaders: Record<string, string> = {};
    request.headers.forEach((value, key) => (negotiatorHeaders[key] = value));

    const languages = new Negotiator({ headers: negotiatorHeaders }).languages();
    
    // Find the best match between the user's browser languages and your supported languages
    return match(languages, locales, defaultLocale);
}

const rolePermissions: Record<string, string[]> = {
    '/inventory': ['admin', 'manager'],
    '/purchases': ['admin', 'manager'],
    '/customers': ['admin', 'manager'],
    '/reports': ['admin', 'manager'],
    '/shifts': ['admin', 'manager'],
    '/expenses': ['admin', 'manager'],
    '/employees': ['admin'],
    '/ledger': ['admin', 'manager', 'accountant'],
    '/audit': ['admin', 'auditor'],
    '/compliance': ['admin', 'manager', 'accountant'],
    '/accountant': ['admin', 'accountant'],
    '/settings': ['admin'],
    '/pos': ['admin', 'manager', 'cashier'],
    '/distribution': ['admin', 'manager'],
    '/management': ['admin', 'manager', 'auditor'],
    '/sacco': ['admin', 'manager'],
    '/rentals': ['admin', 'manager'],
    '/lending': ['admin', 'manager'],
    '/booking': ['admin', 'manager'],
};

const defaultDashboards: Record<string, string> = {
    'SACCO / Co-operative': '/sacco',
    'Rentals / Real Estate': '/rentals/properties',
    'Lending / Microfinance': '/lending/applications',
    'Retail / Wholesale': '/dashboard',
    'Restaurant / Cafe': '/dashboard',
    'cashier': '/pos',
    'default': '/dashboard',
};

// --- MIDDLEWARE FUNCTION (With targeted edits) ---
export async function middleware(request: NextRequest) {
    // --- THIS IS THE ONLY ADDED CODE TO PREVENT REDIRECT LOOPS ---
    // If a rewrite has already occurred (e.g., by next-intl for locale-less paths),
    // prevent re-running the main logic to avoid infinite redirects.
    if (request.headers.get('x-middleware-rewrite')) {
        return NextResponse.next();
    }
    // --- END OF CORRECTION ---

    const { pathname } = request.nextUrl;

    // --- START: next-intl Integration ---
    const pathnameIsMissingLocale = locales.every(
        (locale) => !pathname.startsWith(`/${locale}/`) && pathname !== `/${locale}`
    );

    let localeInPath: string;
    let pathWithoutLocale: string;
    let response: NextResponse; // Declare response here, will be modified by Supabase

    // 1. REDIRECT IF LOCALE IS MISSING
    if (pathnameIsMissingLocale) {
        localeInPath = getLocale(request); // Determine locale based on request headers
        const newPath = pathname === '/' ? '' : pathname; // Handle root path correctly
        const redirectUrl = new URL(`/${localeInPath}${newPath}`, request.url);
        
        response = NextResponse.redirect(redirectUrl); // Initialize response for redirect
    } else {
        // If locale is present, extract it and prepare headers for subsequent requests.
        localeInPath = pathname.split('/')[1];
        const requestHeaders = new Headers(request.headers);
        requestHeaders.set('x-next-intl-locale', localeInPath);
        
        response = NextResponse.next({ request: { headers: requestHeaders } }); // Initialize basic "next" response
    }
    
    // Determine the path without the locale for internal logic (auth, permissions).
    pathWithoutLocale = pathname.replace(`/${localeInPath}`, '') || '/';
    // --- END: next-intl Integration ---

    // --- SUPABASE & AUTH LOGIC ---
    // CHANGED: Revert to createServerClient but with Edge-compatible cookie handlers
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get: (name: string) => request.cookies.get(name)?.value,
                set: (name: string, value: string, options: CookieOptions) => {
                    // Update the request cookie (for subsequent reads in this middleware run)
                    request.cookies.set({ name, value, ...options });
                    // Update the response cookie (to be sent back to the client)
                    response.cookies.set({ name, value, ...options });
                },
                remove: (name: string, options: CookieOptions) => {
                    // Update the request cookie
                    request.cookies.set({ name, value: '', ...options });
                    // Update the response cookie
                    response.cookies.set({ name, value: '', ...options });
                },
            },
        }
    );
    
    // Ensure the Supabase session is loaded and cookies are correctly synced with the response.
    // This step is crucial for authentication state to be available and persisted.
    // This call will use the cookie handlers defined above to read/set cookies on 'request' and 'response'.
    await supabase.auth.getSession();

    const { data: { user } } = await supabase.auth.getUser();
    
    // Define public paths that don't require authentication
    const publicPaths = ['/', '/login', '/signup', '/accept-invite', '/auth/callback'];

    // If no user is logged in:
    if (!user) {
        // If the current path is a public path, allow access.
        if (publicPaths.includes(pathWithoutLocale)) {
            return response; // Return the response with potential cookies set by Supabase client
        }
        // Otherwise, redirect to the login page, preserving the locale.
        return NextResponse.redirect(new URL(`/${localeInPath}/login`, request.url));
    }

    // If a user is logged in, fetch their profile to check roles and business setup.
    const { data: profile, error } = await supabase
        .from('profiles')
        .select(`role, business:businesses ( business_type, setup_complete )`)
        .eq('id', user.id)
        .single();
    
    // Handle cases where profile data is missing or an error occurred during fetch.
    if (error || !profile) {
        await supabase.auth.signOut(); // Log out the user due to critical profile error.
        // Redirect to login with error messages, preserving the locale.
        const loginUrl = new URL(`/${localeInPath}/login`, request.url);
        loginUrl.searchParams.set('error', 'profile_not_found');
        loginUrl.searchParams.set('message', 'Critical error: User profile not found.');
        return NextResponse.redirect(loginUrl);
    }
    
    // Extract business details, handling potential array return.
    const businessDetails = Array.isArray(profile.business) ? profile.business[0] : profile.business;

    // If business details are missing, redirect to the welcome/setup page.
    if (!businessDetails) {
        if (pathWithoutLocale !== '/welcome') {
            return NextResponse.redirect(new URL(`/${localeInPath}/welcome`, request.url));
        }
        return response; // Allow access to /welcome
    }

    // Extract user role, business type, and setup status.
    const userRole = profile.role;
    const businessType = businessDetails.business_type || '';
    const setupComplete = businessDetails.setup_complete;
    
    // Determine the appropriate default dashboard based on role or business type.
    const defaultDashboard = defaultDashboards[userRole] || defaultDashboards[businessType] || defaultDashboards['default'];

    // If user is logged in and trying to access a public path:
    if (publicPaths.includes(pathWithoutLocale)) {
        // Redirect them to their default dashboard, preserving the locale.
        return NextResponse.redirect(new URL(`/${localeInPath}${defaultDashboard}`, request.url));
    }

    // If setup is not complete and user is not on the welcome page, redirect to welcome.
    if (!setupComplete && pathWithoutLocale !== '/welcome') {
        return NextResponse.redirect(new URL(`/${localeInPath}/welcome`, request.url));
    }
    // If setup is complete and user is still on the welcome page, redirect to their default dashboard.
    if (setupComplete && pathWithoutLocale === '/welcome') {
        return NextResponse.redirect(new URL(`/${localeInPath}${defaultDashboard}`, request.url));
    }

    // Check path permissions based on user role.
    const requiredRolesForPath = Object.keys(rolePermissions).find(path => pathWithoutLocale.startsWith(path));

    // If the path requires specific roles and the user doesn't have them, redirect to their default dashboard.
    if (requiredRolesForPath && !rolePermissions[requiredRolesForPath].includes(userRole)) {
        return NextResponse.redirect(new URL(`/${localeInPath}${defaultDashboard}`, request.url));
    }
    
    // If all checks pass, allow the request to proceed with the modified response (containing updated cookies).
    return response; 
}

// --- MATCHER (Unchanged) ---
export const config = {
  // This matcher ensures the middleware runs on all paths except for specific assets and API routes.
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};