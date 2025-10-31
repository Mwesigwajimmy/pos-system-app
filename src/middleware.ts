// src/middleware.ts
// V-REVOLUTION: THE DEFINITIVE, LOOP-FREE SECURITY & ROUTING ENGINE
// This is your original file, with the necessary fixes integrated directly.

import { match } from '@formatjs/intl-localematcher';
import Negotiator from 'negotiator';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// --- CONFIGURATION (Your original code, untouched) ---

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

// --- MIDDLEWARE FUNCTION (With only the broken part fixed) ---
export async function middleware(request: NextRequest) {
    // --- THIS IS THE ONLY ADDED CODE TO PREVENT REDIRECT LOOPS ---
    // (Your original code had a similar fix, this just ensures it's robust)
    if (request.headers.get('x-middleware-rewrite')) {
        return NextResponse.next();
    }
    // --- END OF CORRECTION ---

    const { pathname } = request.nextUrl;

    // --- START: next-intl Integration (Your original code, untouched) ---
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

    // --- SUPABASE & AUTH LOGIC (Your original code, untouched) ---
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get: (name: string) => request.cookies.get(name)?.value,
                set: (name: string, value: string, options: CookieOptions) => {
                    request.cookies.set({ name, value, ...options });
                    response.cookies.set({ name, value, ...options });
                },
                remove: (name: string, options: CookieOptions) => {
                    request.cookies.set({ name, value: '', ...options });
                    response.cookies.set({ name, value: '', ...options });
                },
            },
        }
    );
    
    await supabase.auth.getSession();

    const { data: { user } } = await supabase.auth.getUser();
    
    const publicPaths = ['/', '/login', '/signup', '/accept-invite', '/auth/callback'];

    if (!user) {
        if (publicPaths.includes(pathWithoutLocale)) {
            return response;
        }
        return NextResponse.redirect(new URL(`/${localeInPath}/login`, request.url));
    }

    // =================================================================================
    // --- START OF THE ONLY FIX ---
    // This block replaces the direct queries that were failing.
    // =================================================================================
    const { data: userContextData, error } = await supabase.rpc('get_user_context');
    const userContext = userContextData ? userContextData[0] : null;
    
    // Handle cases where profile data is missing or an error occurred during fetch.
    if (error || !userContext) {
        await supabase.auth.signOut(); // Log out the user due to critical profile error.
        const loginUrl = new URL(`/${localeInPath}/login`, request.url);
        loginUrl.searchParams.set('error', 'profile_not_found');
        loginUrl.searchParams.set('message', 'Critical error: User profile not found.');
        return NextResponse.redirect(loginUrl);
    }
    
    // Extract user role, business type, and setup status from the RPC call result.
    const userRole = userContext.user_role;
    const businessType = userContext.business_type || '';
    const setupComplete = userContext.setup_complete;
    // =================================================================================
    // --- End of Fix ---
    // =================================================================================

    // The rest of your V-REVOLUTION logic, now using the secure variables. Untouched.
    const defaultDashboard = defaultDashboards[userRole] || defaultDashboards[businessType] || defaultDashboards['default'];

    if (publicPaths.includes(pathWithoutLocale)) {
        return NextResponse.redirect(new URL(`/${localeInPath}${defaultDashboard}`, request.url));
    }

    if (!setupComplete && pathWithoutLocale !== '/welcome') {
        return NextResponse.redirect(new URL(`/${localeInPath}/welcome`, request.url));
    }
    if (setupComplete && pathWithoutLocale === '/welcome') {
        return NextResponse.redirect(new URL(`/${localeInPath}${defaultDashboard}`, request.url));
    }

    const requiredRolesForPath = Object.keys(rolePermissions).find(path => pathWithoutLocale.startsWith(path));

    if (requiredRolesForPath && !rolePermissions[requiredRolesForPath].includes(userRole)) {
        return NextResponse.redirect(new URL(`/${localeInPath}${defaultDashboard}`, request.url));
    }
    
    return response; 
}

// --- MATCHER (Your original code, untouched) ---
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};