// src/middleware.ts
// V-REVOLUTION: THE DEFINITIVE, LOOP-FREE SECURITY & ROUTING ENGINE
// This is your original file, with the necessary fixes integrated directly.

import { match } from '@formatjs/intl-localematcher';
import Negotiator from 'negotiator';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
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
    const { pathname } = request.nextUrl;

    // --- START: next-intl Integration ---
    const pathnameIsMissingLocale = locales.every(
        (locale) => !pathname.startsWith(`/${locale}/`) && pathname !== `/${locale}`
    );

    // 1. REDIRECT IF LOCALE IS MISSING
    if (pathnameIsMissingLocale) {
        const locale = getLocale(request);
        // Correctly handle the root path by adding a slash if needed
        const newPath = pathname === '/' ? '' : pathname;
        return NextResponse.redirect(new URL(`/${locale}${newPath}`, request.url));
    }
    
    // 2. GET LOCALE AND PREPARE HEADERS/RESPONSE FOR THE REST OF THE MIDDLEWARE
    const localeInPath = pathname.split('/')[1];
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-next-intl-locale', localeInPath);
    let response = NextResponse.next({ request: { headers: requestHeaders } });
    
    // 3. CREATE A LOCALE-FREE PATH FOR YOUR SECURITY LOGIC
    const pathWithoutLocale = pathname.replace(`/${localeInPath}`, '') || '/';
    // --- END: next-intl Integration ---


    // --- YOUR EXISTING SUPABASE & AUTH LOGIC (Now using 'response' and 'pathWithoutLocale') ---
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get: (name: string) => request.cookies.get(name)?.value,
                set: (name: string, value: string, options: CookieOptions) => {
                    request.cookies.set({ name, value, ...options });
                    // Re-create response with updated headers after cookie operations
                    response = NextResponse.next({ request: { headers: request.headers } });
                    response.cookies.set({ name, value, ...options });
                },
                remove: (name: string, options: CookieOptions) => {
                    request.cookies.set({ name, value: '', ...options });
                    response = NextResponse.next({ request: { headers: request.headers } });
                    response.cookies.set({ name, value: '', ...options });
                },
            },
        }
    );

    const { data: { user } } = await supabase.auth.getUser();
    
    const publicPaths = ['/', '/login', '/signup', '/accept-invite', '/auth/callback'];

    if (!user) {
        if (publicPaths.includes(pathWithoutLocale)) { // MODIFIED: Use pathWithoutLocale
            return response;
        }
        // MODIFIED: Prepend locale to redirect URL
        return NextResponse.redirect(new URL(`/${localeInPath}/login`, request.url));
    }

    const { data: profile, error } = await supabase
        .from('profiles')
        .select(`role, business:businesses ( business_type, setup_complete )`)
        .eq('id', user.id)
        .single();
    
    if (error || !profile) {
        await supabase.auth.signOut();
        // MODIFIED: Prepend locale to redirect URL
        const loginUrl = new URL(`/${localeInPath}/login`, request.url);
        loginUrl.searchParams.set('error', 'profile_not_found');
        loginUrl.searchParams.set('message', 'Critical error: User profile not found.');
        return NextResponse.redirect(loginUrl);
    }
    
    const businessDetails = Array.isArray(profile.business) ? profile.business[0] : profile.business;

    if (!businessDetails) {
        if (pathWithoutLocale !== '/welcome') { // MODIFIED: Use pathWithoutLocale
            // MODIFIED: Prepend locale to redirect URL
            return NextResponse.redirect(new URL(`/${localeInPath}/welcome`, request.url));
        }
        return response;
    }

    const userRole = profile.role;
    const businessType = businessDetails.business_type || '';
    const setupComplete = businessDetails.setup_complete;
    
    const defaultDashboard = defaultDashboards[userRole] || defaultDashboards[businessType] || defaultDashboards['default'];

    if (publicPaths.includes(pathWithoutLocale)) { // MODIFIED: Use pathWithoutLocale
        // MODIFIED: Prepend locale to redirect URL
        return NextResponse.redirect(new URL(`/${localeInPath}${defaultDashboard}`, request.url));
    }

    if (!setupComplete && pathWithoutLocale !== '/welcome') { // MODIFIED: Use pathWithoutLocale
        // MODIFIED: Prepend locale to redirect URL
        return NextResponse.redirect(new URL(`/${localeInPath}/welcome`, request.url));
    }
    if (setupComplete && pathWithoutLocale === '/welcome') { // MODIFIED: Use pathWithoutLocale
        // MODIFIED: Prepend locale to redirect URL
        return NextResponse.redirect(new URL(`/${localeInPath}${defaultDashboard}`, request.url));
    }

    // MODIFIED: Use pathWithoutLocale
    const requiredRolesForPath = Object.keys(rolePermissions).find(path => pathWithoutLocale.startsWith(path));

    if (requiredRolesForPath && !rolePermissions[requiredRolesForPath].includes(userRole)) {
        // MODIFIED: Prepend locale to redirect URL
        return NextResponse.redirect(new URL(`/${localeInPath}${defaultDashboard}`, request.url));
    }
    
    return response;
}

// --- YOUR MATCHER (Unchanged) ---
export const config = {
  // This matcher ensures the middleware runs on all paths except for specific assets and API routes.
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};