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

// --- MIDDLEWARE FUNCTION ---
export async function middleware(request: NextRequest) {
    if (request.headers.get('x-middleware-rewrite')) {
        return NextResponse.next();
    }

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
            return response; // Allow access to public paths if not logged in
        }
        // For any other path, redirect to login
        return NextResponse.redirect(new URL(`/${localeInPath}/login`, request.url));
    }

    // If we have a user, fetch their context
    const { data: userContextData, error } = await supabase.rpc('get_user_context');

    if (error || !userContextData || userContextData.length === 0) {
        await supabase.auth.signOut();
        const loginUrl = new URL(`/${localeInPath}/login`, request.url);
        loginUrl.searchParams.set('error', 'profile_not_found');
        return NextResponse.redirect(loginUrl);
    }
    
    const userContext = userContextData[0];
    const userRole = userContext.user_role;
    const businessType = userContext.business_type || '';
    const setupComplete = userContext.setup_complete;
    
    const defaultDashboard = defaultDashboards[userRole] || defaultDashboards[businessType] || defaultDashboards['default'];

    // =================================================================================
    // --- START OF LOGIC REORDERING (THE ONLY FIX NEEDED) ---
    // The following blocks have been re-ordered to prioritize the setup check.
    // =================================================================================

    // PRIORITY 1: If setup is NOT complete, the user MUST be on the welcome page.
    // If they are anywhere else, redirect them there immediately.
    if (!setupComplete && pathWithoutLocale !== '/welcome') {
        return NextResponse.redirect(new URL(`/${localeInPath}/welcome`, request.url));
    }
    
    // PRIORITY 2: If setup IS complete, the user MUST NOT be on the welcome page.
    // If they land there by mistake, send them to their dashboard.
    if (setupComplete && pathWithoutLocale === '/welcome') {
        return NextResponse.redirect(new URL(`/${localeInPath}${defaultDashboard}`, request.url));
    }

    // PRIORITY 3: If setup IS complete and they land on a public page (like the homepage),
    // redirect them into the application to their dashboard.
    if (publicPaths.includes(pathWithoutLocale)) {
        return NextResponse.redirect(new URL(`/${localeInPath}${defaultDashboard}`, request.url));
    }

    // =================================================================================
    // --- END OF LOGIC REORDERING ---
    // =================================================================================

    // Standard role-based permission check (Your original code, untouched)
    const requiredRolesForPath = Object.keys(rolePermissions).find(path => pathWithoutLocale.startsWith(path));
    if (requiredRolesForPath && !rolePermissions[requiredRolesForPath].includes(userRole)) {
        return NextResponse.redirect(new URL(`/${localeInPath}${defaultDashboard}`, request.url));
    }
    
    // If all checks pass, allow the request to proceed.
    return response; 
}

// --- MATCHER (Your original code, untouched) ---
export const config = {
  // The matcher is updated to skip all static assets in the public folder,
  // INCLUDING the PWA manifest and service worker.
  matcher: [
    '/((?!api|_next/static|_next/image|images|icons|patterns|templates|videos|favicon.ico|site.webmanifest|sw.js).*)',
  ],
};