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
    // --- SOVEREIGN PATHS ---
    '/command-center': ['architect', 'commander'],
    '/sovereign-control': ['architect', 'commander'],
    '/tenants': ['architect', 'commander'],
    '/telemetry': ['architect', 'commander'],
    '/billing': ['architect', 'commander'],

    // --- CORE & SHARED PATHS ---
    '/dashboard': ['admin', 'manager', 'owner', 'architect', 'commander', 'accountant', 'auditor'],
    '/copilot': ['admin', 'manager', 'accountant', 'auditor', 'owner', 'architect', 'commander'],
    '/time-clock': ['admin', 'manager', 'cashier', 'owner', 'architect', 'commander', 'waiter_staff', 'pharmacist'],
    '/activities': ['admin', 'manager', 'auditor', 'owner', 'architect', 'commander'],
    '/reports': ['admin', 'manager', 'accountant', 'auditor', 'owner', 'architect', 'commander'],
    '/workbooks': ['admin', 'manager', 'cashier', 'accountant', 'auditor', 'owner', 'architect', 'commander'],
    '/library': ['admin', 'manager', 'accountant', 'cashier', 'auditor', 'owner', 'architect', 'commander'],

    // --- SALES & POS ---
    '/pos': ['admin', 'manager', 'cashier', 'owner', 'architect', 'commander', 'pharmacist', 'bartender'],
    '/kds': ['admin', 'manager', 'kitchen_staff', 'chef', 'architect', 'commander'],
    '/sales': ['admin', 'manager', 'owner', 'architect', 'commander', 'pharmacist', 'accountant'],
    '/customers': ['admin', 'manager', 'cashier', 'owner', 'architect', 'commander', 'pharmacist'],
    '/dsr': ['admin', 'manager', 'owner', 'architect', 'commander', 'accountant'],
    '/returns': ['admin', 'manager', 'owner', 'architect', 'commander'],
    '/loyalty': ['admin', 'owner', 'architect', 'commander'],

    // --- INVOICING & FINANCE ---
    '/invoicing': ['admin', 'manager', 'accountant', 'cashier', 'owner', 'architect', 'commander', 'pharmacist', 'legal_counsel'],
    '/finance': ['admin', 'manager', 'accountant', 'owner', 'architect', 'commander', 'auditor'],
    '/ledger': ['admin', 'manager', 'accountant', 'architect', 'commander'],
    '/expenses': ['admin', 'manager', 'accountant', 'owner', 'architect', 'commander'],
    '/accountant': ['admin', 'accountant', 'architect', 'commander', 'owner'],
    '/compliance': ['admin', 'manager', 'auditor', 'owner', 'architect', 'commander'],
    '/audit': ['admin', 'auditor', 'architect', 'commander', 'owner'],

    // --- INVENTORY & PROCUREMENT ---
    '/inventory': ['admin', 'manager', 'owner', 'architect', 'commander', 'pharmacist', 'warehouse_manager', 'inventory_manager', 'chef'],
    '/purchases': ['admin', 'manager', 'owner', 'architect', 'commander', 'procurement_officer', 'warehouse_manager'],
    '/procurement': ['admin', 'manager', 'owner', 'architect', 'commander', 'procurement_officer'],

    // --- HUMAN RESOURCES & PAYROLL ---
    '/hr': ['admin', 'manager', 'owner', 'architect', 'commander'],
    '/payroll': ['admin', 'manager', 'accountant', 'owner', 'architect', 'commander'],
    '/employees': ['admin', 'owner', 'architect', 'commander'],

    // --- SPECIALIZED INDUSTRY PATHS ---
    '/sacco': ['admin', 'manager', 'owner', 'architect', 'commander', 'sacco_manager', 'teller', 'loan_officer'],
    '/lending': ['admin', 'manager', 'owner', 'architect', 'commander', 'loan_officer', 'credit_analyst', 'debt_collector'],
    '/telecom': ['admin', 'manager', 'owner', 'architect', 'commander', 'agent', 'dsr_rep', 'float_manager', 'cashier'],
    '/distribution': ['admin', 'manager', 'owner', 'architect', 'commander', 'fleet_manager', 'driver', 'warehouse_manager'],
    '/professional-services': ['admin', 'manager', 'owner', 'architect', 'commander', 'lawyer', 'accountant', 'consultant', 'practitioner'],
    '/rentals': ['admin', 'manager', 'owner', 'architect', 'commander', 'property_manager', 'leasing_agent'],
    '/contractor': ['admin', 'manager', 'owner', 'architect', 'commander', 'engineer', 'foreman', 'site_manager'],
    '/field-service': ['admin', 'manager', 'owner', 'architect', 'commander', 'field_technician', 'dispatcher'],
    '/nonprofit': ['admin', 'manager', 'owner', 'architect', 'commander', 'grant_manager', 'donor_relations', 'volunteer_coordinator'],
    '/ecommerce': ['admin', 'manager', 'owner', 'architect', 'commander'],
    '/crm': ['admin', 'manager', 'owner', 'architect', 'commander'],
    '/booking': ['admin', 'manager', 'owner', 'architect', 'commander'],

    // --- SYSTEM & SETTINGS ---
    '/management': ['admin', 'manager', 'owner', 'architect', 'commander', 'auditor'],
    '/settings': ['admin', 'owner', 'architect', 'commander'],
    '/marketplace': ['admin', 'owner', 'architect', 'commander'],
    '/shifts': ['admin', 'manager', 'cashier', 'owner', 'architect', 'commander'],
};
const defaultDashboards: Record<string, string> = {
        'architect': '/command-center',
    'commander': '/command-center',
    'cashier': '/pos',
    'pharmacist': '/pos',
    'waiter_staff': '/pos',
    'chef': '/kds',
    'kitchen_staff': '/kds',
    'dsr_rep': '/telecom/dsr-dashboard',
    'agent': '/telecom/agent',
    'field_technician': '/field-service/technician',
    'driver': '/distribution',
    'loan_officer': '/lending/applications',
    'teller': '/sacco/contributions',
    'accountant': '/finance/banking',
    'auditor': '/audit',

    // --- INDUSTRY REDIRECTS (Exact Signup Strings) ---
    'SACCO / Co-operative': '/sacco',
    'Lending / Microfinance': '/lending',
    'Rentals / Real Estate': '/rentals/properties',
    'Telecom & Mobile Money': '/telecom',
    'Distribution / Wholesale Supply': '/distribution',
    'Contractor (General, Remodeling)': '/contractor',
    'Field Service (Trades, Barber, Salon)': '/field-service/work-orders',
    'Professional Services (Accounting, Medical)': '/professional-services',
    'Nonprofit / Education / NGO': '/nonprofit',
    'Retail / Wholesale': '/dashboard',
    'Restaurant / Cafe': '/dashboard',
    'Mixed/Conglomerate': '/dashboard',

    'default': '/dashboard',
};

// --- MIDDLEWARE FUNCTION ---
export async function middleware(request: NextRequest) {
    if (request.nextUrl.searchParams.has('_rsc')) {
        return NextResponse.next();
    }
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
  /*
   * Match all request paths except for the ones starting with:
   * - api (API routes)
   * - _next/static (static files)
   * - _next/image (image optimization files)
   * - any path containing a period '.' (most static assets like .png, .js, .webmanifest)
   */
  matcher: [
    '/((?!api|_next/static|_next/image|.*\\..*).*)',
  ],
};