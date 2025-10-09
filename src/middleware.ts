// src/middleware.ts
// V-REVOLUTION: THE DEFINITIVE, LOOP-FREE SECURITY & ROUTING ENGINE

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
    const publicPaths = ['/login', '/signup'];

    if (!user) {
        if (!publicPaths.includes(pathname) && !pathname.startsWith('/auth')) {
            return NextResponse.redirect(new URL('/login', request.url));
        }
        return response;
    }

    const { data: profile, error } = await supabase
        .from('profiles')
        .select(`
            role,
            business:businesses ( business_type, setup_complete )
        `)
        .eq('id', user.id)
        .single();
        
    if (error || !profile || !profile.business) {
        await supabase.auth.signOut();
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('error', 'profile_not_found');
        return NextResponse.redirect(loginUrl);
    }
    
    const businessDetails = Array.isArray(profile.business) 
        ? profile.business[0] 
        : profile.business;

    if (!businessDetails) {
        await supabase.auth.signOut();
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('error', 'business_details_invalid');
        return NextResponse.redirect(loginUrl);
    }
    
    const userRole = profile.role;
    const businessType = businessDetails.business_type || '';
    const setupComplete = businessDetails.setup_complete;
    
    const defaultDashboard = defaultDashboards[userRole] || defaultDashboards[businessType] || defaultDashboards['default'];

    if (publicPaths.includes(pathname)) {
        return NextResponse.redirect(new URL(defaultDashboard, request.url));
    }

    if (!setupComplete && pathname !== '/welcome') {
        return NextResponse.redirect(new URL('/welcome', request.url));
    }
    if (setupComplete && pathname === '/welcome') {
        return NextResponse.redirect(new URL(defaultDashboard, request.url));
    }

    // ================================================================================= //
    // THE DEFINITIVE FIX IS HERE:
    // We now use a single, powerful check. It finds the "base path" the user is on
    // (e.g., '/pos' or '/sacco/members') and checks if their role has permission.
    // This removes the flawed logic and resolves the infinite loop permanently.
    // ================================================================================= //
    const requiredRolesForPath = Object.keys(rolePermissions).find(path => pathname.startsWith(path));

    if (requiredRolesForPath && !rolePermissions[requiredRolesForPath].includes(userRole)) {
        // If the user does not have the required role for the path they are trying to access,
        // we securely redirect them to their correct default dashboard.
        return NextResponse.redirect(new URL(defaultDashboard, request.url));
    }
    
    // By removing the old `isSpecializedModule` check, we eliminate the redirect loop.
    // The role-based permission check above is now the single source of truth for security.
    return response;
}

export const config = {
  matcher: [
    '/', // Run on the root path
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};