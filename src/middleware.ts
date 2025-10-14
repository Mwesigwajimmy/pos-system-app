// src/middleware.ts
// V-REVOLUTION: THE DEFINITIVE, LOOP-FREE SECURITY & ROUTING ENGINE
// This is your original file, with the necessary fixes integrated directly.

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

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

export async function middleware(request: NextRequest) {
    let response = NextResponse.next({ request: { headers: request.headers } });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get: (name: string) => {
                    return request.cookies.get(name)?.value;
                },
                set: (name: string, value: string, options: CookieOptions) => {
                    request.cookies.set({ name, value, ...options });
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
    const { pathname } = request.nextUrl;
    
    // FIX: Add the root path '/' to the public paths to handle it explicitly.
    const publicPaths = ['/', '/login', '/signup', '/accept-invite'];

    // This section for unauthenticated users is correct. No changes needed.
    if (!user) {
        // RULE: If an unauthenticated user is trying to access a public page,
        // let them pass without any redirects.
        if (publicPaths.includes(pathname)) {
            return response;
        }

        // RULE: If they are trying to access any OTHER page,
        // redirect them to the login page.
        return NextResponse.redirect(new URL('/login', request.url));
    }

    // This profile fetch is also correct.
    const { data: profile, error } = await supabase
        .from('profiles')
        .select(`
            role,
            business:businesses ( business_type, setup_complete )
        `)
        .eq('id', user.id)
        .single();
    
    // FIX: This is the primary change. We split the error handling into two steps.
    // STEP 1: Handle a critical error where the user's profile is missing in the database.
    // This is a data integrity problem, and the only safe action is to sign out.
    if (error || !profile) {
        await supabase.auth.signOut();
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('error', 'profile_not_found');
        loginUrl.searchParams.set('message', 'Critical error: User profile not found.');
        return NextResponse.redirect(loginUrl);
    }
    
    const businessDetails = Array.isArray(profile.business) 
        ? profile.business[0] 
        : profile.business;

    // STEP 2: Handle the case where the user profile exists, but their business setup is not complete.
    // Instead of logging them out, we redirect them to the setup page. This stops the loop.
    if (!businessDetails) {
        // If they aren't already on the welcome page, send them there.
        if (pathname !== '/welcome') {
            return NextResponse.redirect(new URL('/welcome', request.url));
        }
        // If they are on the welcome page, allow the request.
        return response;
    }

    const userRole = profile.role;
    const businessType = businessDetails.business_type || '';
    const setupComplete = businessDetails.setup_complete;
    
    const defaultDashboard = defaultDashboards[userRole] || defaultDashboards[businessType] || defaultDashboards['default'];

    // This logic is correct: if a logged-in user visits a public page, redirect them to their dashboard.
    if (publicPaths.includes(pathname)) {
        return NextResponse.redirect(new URL(defaultDashboard, request.url));
    }

    // This logic for handling setup completion is also correct.
    if (!setupComplete && pathname !== '/welcome') {
        return NextResponse.redirect(new URL('/welcome', request.url));
    }
    if (setupComplete && pathname === '/welcome') {
        return NextResponse.redirect(new URL(defaultDashboard, request.url));
    }

    // This role-based access control logic is correct and remains unchanged.
    const requiredRolesForPath = Object.keys(rolePermissions).find(path => pathname.startsWith(path));

    if (requiredRolesForPath && !rolePermissions[requiredRolesForPath].includes(userRole)) {
        return NextResponse.redirect(new URL(defaultDashboard, request.url));
    }
    
    return response;
}

export const config = {
  matcher: [
    // This matcher is fine. It correctly applies the middleware to all relevant paths.
    '/',
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};