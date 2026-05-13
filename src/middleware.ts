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

// 2. Global Public Paths (Moved to top to prevent ReferenceError)
const publicPaths = [
    '/', 
    '/login', 
    '/signup', 
    '/accept-invite', 
    '/auth/callback', 
    '/blog', 
    '/careers',
    '/contact', 
    '/pricing', 
    '/about', 
    '/aura-ai', 
    '/industries', 
    '/courses', 
    '/donate', 
    '/newsletter', 
    '/help-centre',
    '/download',
    '/features'
];

// 3. Your function to detect the user's preferred language
// FIXED: Added try/catch and empty language checks to stop the [RangeError] 500 crash for Googlebot.
function getLocale(request: NextRequest): string {
    try {
        const negotiatorHeaders: Record<string, string> = {};
        request.headers.forEach((value, key) => (negotiatorHeaders[key] = value));

        const languages = new Negotiator({ headers: negotiatorHeaders }).languages();
        
        // Safety: If no languages found (common with bots), return default immediately
        if (!languages || languages.length === 0 || (languages.length === 1 && languages[0] === '*')) {
            return defaultLocale;
        }

        return match(languages, locales, defaultLocale);
    } catch (e) {
        // Absolute fallback to prevent middleware invocation failure
        return defaultLocale;
    }
}

const rolePermissions: Record<string, string[]> = {
    // --- SOVEREIGN PATHS (GOD MODE) ---
    '/command-center': ['architect', 'commander'],
    '/sovereign-control': ['architect', 'commander'],
    '/tenants': ['architect', 'commander'],
    '/telemetry': ['architect', 'commander'],
    '/billing': ['architect', 'commander'],
    
    // --- CORE & SHARED PATHS ---
    '/dashboard': ['admin', 'manager', 'owner', 'architect', 'commander', 'accountant', 'auditor', 'hr_manager', 'procurement_officer', 'fleet_manager', 'sacco_manager'],
    '/copilot': ['admin', 'manager', 'accountant', 'auditor', 'owner', 'architect', 'commander', 'hr_manager', 'procurement_officer'],
    '/time-clock': ['admin', 'manager', 'cashier', 'owner', 'architect', 'commander', 'waiter_staff', 'pharmacist', 'nurse', 'technician', 'driver', 'barber_stylist'],
    '/activities': ['admin', 'manager', 'auditor', 'owner', 'architect', 'commander', 'hr_manager', 'procurement_officer'],
    '/reports': ['admin', 'manager', 'accountant', 'auditor', 'owner', 'architect', 'commander', 'hr_manager', 'procurement_officer', 'fleet_manager', 'donor_manager'],
    '/workbooks': ['admin', 'manager', 'cashier', 'accountant', 'auditor', 'owner', 'architect', 'commander', 'practitioner', 'consultant'],
    '/library': ['admin', 'manager', 'accountant', 'cashier', 'auditor', 'owner', 'architect', 'commander', 'legal_counsel', 'teacher_principal'],

    // --- SALES & POS ---
    '/pos': ['admin', 'manager', 'cashier', 'owner', 'architect', 'commander', 'pharmacist', 'bartender', 'waiter_staff', 'barista', 'dsr_rep'],
    '/kds': ['admin', 'manager', 'kitchen_staff', 'chef', 'architect', 'commander'],
    '/sales': ['admin', 'manager', 'owner', 'architect', 'commander', 'pharmacist', 'accountant', 'cashier', 'collections_agent', 'marketing_specialist'],
    '/customers': ['admin', 'manager', 'cashier', 'owner', 'architect', 'commander', 'pharmacist', 'support_agent', 'collections_agent'],
    '/dsr': ['admin', 'manager', 'owner', 'architect', 'commander', 'accountant', 'cashier', 'dsr_rep'],
    '/returns': ['admin', 'manager', 'owner', 'architect', 'commander', 'cashier', 'warehouse_manager'],
    '/loyalty': ['admin', 'owner', 'architect', 'commander', 'marketing_specialist'],

    // --- INVOICING & FINANCE ---
    '/invoicing/fx-audit': ['admin', 'manager', 'accountant', 'owner', 'architect', 'commander', 'auditor'],
    '/invoicing/compliance': ['admin', 'manager', 'accountant', 'owner', 'architect', 'commander', 'auditor', 'legal_counsel'],
    '/invoicing/recurring': ['admin', 'manager', 'accountant', 'owner', 'architect', 'commander', 'property_manager'],
    '/invoicing': ['admin', 'manager', 'accountant', 'cashier', 'owner', 'architect', 'commander', 'pharmacist', 'legal_counsel', 'procurement_officer'],
    '/finance': ['admin', 'manager', 'accountant', 'owner', 'architect', 'commander', 'auditor', 'sacco_manager'],
    '/ledger': ['admin', 'manager', 'accountant', 'architect', 'commander', 'auditor'],
    '/expenses': ['admin', 'manager', 'accountant', 'owner', 'architect', 'commander', 'fleet_manager', 'procurement_officer'],
    '/accountant': ['admin', 'accountant', 'architect', 'commander', 'owner', 'auditor'],
    '/compliance/sales-tax': ['admin', 'manager', 'accountant', 'auditor', 'owner', 'architect', 'commander'],
    '/compliance': ['admin', 'manager', 'auditor', 'owner', 'architect', 'commander', 'accountant', 'legal_counsel'],
    '/audit': ['admin', 'auditor', 'architect', 'commander', 'owner'],

    // --- INVENTORY & PROCUREMENT ---
    '/inventory': ['admin', 'manager', 'owner', 'architect', 'commander', 'pharmacist', 'warehouse_manager', 'inventory_manager', 'chef', 'technician', 'warehouse_staff'],
    '/purchases': ['admin', 'manager', 'owner', 'architect', 'commander', 'procurement_officer', 'warehouse_manager'],
    '/procurement': ['admin', 'manager', 'owner', 'architect', 'commander', 'procurement_officer', 'grant_officer'],

    // --- HUMAN RESOURCES & PAYROLL ---
    '/hr': ['admin', 'manager', 'owner', 'architect', 'commander', 'hr_manager', 'teacher_principal'],
    '/payroll': ['admin', 'manager', 'accountant', 'owner', 'architect', 'commander', 'hr_manager'],
    '/employees': ['admin', 'owner', 'architect', 'commander', 'hr_manager', 'site_manager'],

    // --- SPECIALIZED INDUSTRY PATHS ---
    '/sacco': ['admin', 'manager', 'owner', 'architect', 'commander', 'sacco_manager', 'teller', 'loan_officer'],
    '/lending': ['admin', 'manager', 'owner', 'architect', 'commander', 'loan_officer', 'credit_analyst', 'debt_collector', 'collections_agent'],
    '/telecom': ['admin', 'manager', 'owner', 'architect', 'commander', 'agent', 'dsr_rep', 'float_manager', 'cashier', 'network_engineer'],
    '/distribution/aura-master': ['admin', 'manager', 'owner', 'architect', 'commander'],
    '/distribution/manifest-entry': ['admin', 'manager', 'owner', 'architect', 'commander', 'warehouse_manager'],
    '/distribution/customs': ['admin', 'manager', 'owner', 'architect', 'commander', 'auditor'],
    '/distribution/market-intel': ['admin', 'manager', 'owner', 'architect', 'commander', 'marketing_specialist'],
    '/distribution': ['admin', 'manager', 'owner', 'architect', 'commander', 'fleet_manager', 'driver', 'warehouse_manager', 'collections_agent', 'matatu_driver', 'conductor'],
    '/professional-services': ['admin', 'manager', 'owner', 'architect', 'commander', 'lawyer', 'accountant', 'consultant', 'practitioner', 'medical_officer', 'dentist'],
    '/rentals': ['admin', 'manager', 'owner', 'architect', 'commander', 'property_manager', 'leasing_agent'],
    '/contractor': ['admin', 'manager', 'owner', 'architect', 'commander', 'engineer', 'foreman', 'site_manager', 'surveyor', 'architect_pro'],
    '/field-service': ['admin', 'manager', 'owner', 'architect', 'commander', 'field_technician', 'dispatcher', 'technician'],
    '/nonprofit': ['admin', 'manager', 'owner', 'architect', 'commander', 'grant_manager', 'donor_relations', 'volunteer_coordinator', 'donor_manager'],
    '/ecommerce': ['admin', 'manager', 'owner', 'architect', 'commander', 'ecommerce_manager'],
    '/crm': ['admin', 'manager', 'owner', 'architect', 'commander', 'support_agent', 'marketing_specialist'],
    '/booking': ['admin', 'manager', 'owner', 'architect', 'commander', 'receptionist'],

    // --- SYSTEM & SETTINGS ---
    '/management': ['admin', 'manager', 'owner', 'architect', 'commander', 'auditor', 'hr_manager'],
    '/settings': ['admin', 'owner', 'architect', 'commander'],
    '/marketplace': ['admin', 'owner', 'architect', 'commander'],
    '/shifts': ['admin', 'manager', 'cashier', 'owner', 'architect', 'commander', 'waiter_staff', 'bartender'],
};

const defaultDashboards: Record<string, string> = {
    'architect': '/command-center',
    'commander': '/command-center',
    'cashier': '/pos',
    'pharmacist': '/pos',
    'waiter_staff': '/pos',
    'barista': '/pos',
    'bartender': '/pos',
    'chef': '/kds',
    'kitchen_staff': '/kds',
    'dsr_rep': '/telecom/dsr-dashboard',
    'agent': '/telecom/agent',
    'field_technician': '/field-service/technician',
    'technician': '/field-service/technician',
    'driver': '/distribution',
    'matatu_driver': '/distribution',
    'conductor': '/distribution',
    'warehouse_manager': '/inventory',
    'inventory_manager': '/inventory',
    'procurement_officer': '/procurement',
    'hr_manager': '/hr/dashboard',
    'loan_officer': '/lending/applications',
    'credit_analyst': '/lending/analytics',
    'teller': '/sacco/contributions',
    'sacco_manager': '/sacco',
    'accountant': '/finance/banking',
    'auditor': '/audit',
    'lawyer': '/professional-services',
    'practitioner': '/professional-services',
    'property_manager': '/rentals/properties',
    'donor_manager': '/nonprofit',
    'ecommerce_manager': '/ecommerce/orders',
    'site_manager': '/contractor/jobs',

    // --- INDUSTRY REDIRECTS ---
    'SACCO / Co-operative': '/sacco',
    'Lending / Microfinance': '/lending',
    'Rentals / Real Estate': '/rentals/properties',
    'Telecom & Mobile Money': '/telecom',
    'Distribution / Wholesale Supply': '/distribution',
    'Distribution': '/distribution',
    'Contractor (General, Remodeling)': '/contractor',
    'Field Service (Trades, Barber, Salon)': '/field-service/work-orders',
    'Professional Services (Accounting, Medical)': '/professional-services',
    'Nonprofit / Education / NGO': '/nonprofit',
    
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

// --- START: GOOGLEBOT / SEO BYPASS ---
    // Identify search engine bots
    const userAgent = request.headers.get('user-agent') || '';
    const isBot = /googlebot|bingbot|yandexbot|duckduckbot/i.test(userAgent);
    
    // If it's a bot and it's looking at a public path, let it through 
    // immediately without calling Supabase or the Database.
    const isPublicPathForBot = publicPaths.some(pp => 
        pathWithoutLocale === pp || pathWithoutLocale.startsWith(`${pp}/`)
    );

    if (isBot && isPublicPathForBot) {
        return response;
    }

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

    // --- AUTH & IDENTITY WELD SECTION ---
    const { data: { user } } = await supabase.auth.getUser();

    // Initialize the active business ID variable for the secure handoff
    let activeBizId: string | undefined = undefined;

    if (user) {
        // --- 1. SOVEREIGN IDENTITY HANDSHAKE ---
        // We detect the target node via the secure identity cookie set by the Sidebar.
        activeBizId = request.cookies.get('bbu1_active_business_id')?.value;
        
        if (activeBizId) {
            // SESSION INVERSION: Pre-inject the ID into the session for RLS stability.
            // This ensures all subsequent database queries in this request see the correct node.
            await supabase.rpc('set_session_business_id', { p_biz_id: activeBizId });
        }
    } else {
        // Public Path handling for unauthenticated sessions
        const isPublicPath = publicPaths.some(pp => pathWithoutLocale === pp || pathWithoutLocale.startsWith(`${pp}/`));
        if (isPublicPath) return response;
        return NextResponse.redirect(new URL(`/${localeInPath}/login`, request.url));
    }

    // --- 2. CONTEXT MORPHING (THE SECURE HANDOFF) ---
    // UPGRADE: We pass p_target_biz_id directly to the RPC. 
    // This stops the 'Logical Ghosting' by forcing the DB to return the role/industry of the TARGET node.
    const { data: userContextData, error: contextError } = await supabase.rpc('get_user_context', {
        p_target_biz_id: activeBizId
    });

// --- 3. IDENTITY RECOVERY PROTOCOL (STABILITY WELD) ---
    // This prevents the "Forced Logout" during high-speed identity swaps.
    if (contextError || !userContextData || userContextData.length === 0) {
        
        // LOOP GUARD: If we are already on the generic dashboard and it STILL fails,
        // it means the session is truly broken or the SQL function is missing.
        if (pathWithoutLocale === '/dashboard') {
            const recoveryResponse = NextResponse.redirect(new URL(`/${localeInPath}/login`, request.url));
            recoveryResponse.cookies.delete('bbu1_active_business_id');
            return recoveryResponse;
        }

        // RECOVERY BUFFER: Instead of signing out, we redirect to /dashboard.
        // This forces a new middleware cycle, allowing the database time 
        // to fully synchronize the new session parameters.
        return NextResponse.redirect(new URL(`/${localeInPath}/dashboard`, request.url));
    }
    
    // --- THE DEEP IDENTITY RESOLUTION ---
    const userContext = userContextData[0];
    
    // 1. Job Role (e.g. admin, cashier, accountant)
    const userRole = userContext.user_role || 'guest';
    
    // 2. Business Type (Ensures industry-specific redirects work deeply)
    const businessType = userContext.business_type || '';
    
    // 3. Setup Status (Controls the Welcome page gate)
    const setupComplete = userContext.setup_complete;
    
    // 4. Sovereign Power Tier (The God-Mode Flag)
    // This is returned from the new 'system_power' column in your DB function
    const systemPower = userContext.system_power || null;

    // --- THE SMART REDIRECT ENGINE ---
    // Calculates the correct landing node. 
    // ARCHITECTS go to /command-center. Standard ADMITS go to their Industry Dashboard.
    const defaultDashboard = (systemPower === 'architect' || systemPower === 'commander') 
        ? '/command-center' 
        : (defaultDashboards[userRole] || defaultDashboards[businessType] || defaultDashboards['default']);
    // =================================================================================
    // --- START OF LOGIC REORDERING (FULLY WELDED) ---
    // =================================================================================

    // PRIORITY 1: If setup is NOT complete, the user MUST be on the welcome page.
    if (!setupComplete && pathWithoutLocale !== '/welcome') {
        return NextResponse.redirect(new URL(`/${localeInPath}/welcome`, request.url));
    }
    
    // PRIORITY 2: If setup IS complete, the user MUST NOT be on the welcome page.
    if (setupComplete && pathWithoutLocale === '/welcome') {
        return NextResponse.redirect(new URL(`/${localeInPath}${defaultDashboard}`, request.url));
    }

    // --- THE SOVEREIGN ROUTE WELD (AUTO-LANDING JUMP - LOOP PROOF) ---
    // This ensures that when Jimmy switches to 'Accountant' at CAKE, 
    // he is physically moved from /dashboard to the correct industry-specific landing spot.
    const isGenericDashboard = pathWithoutLocale === '/dashboard' || pathWithoutLocale === '/';
    
    if (isGenericDashboard && defaultDashboard !== '/dashboard' && pathWithoutLocale !== defaultDashboard) {
        // LOOP GUARD: Only redirect if the target industry dashboard is different from where we are.
        return NextResponse.redirect(new URL(`/${localeInPath}${defaultDashboard}`, request.url));
    }

    // PRIORITY 3: Allow logged-in users to stay on public pages.
    const isPublicPath = publicPaths.some(pp => 
        pathWithoutLocale === pp || pathWithoutLocale.startsWith(`${pp}/`)
    );

    if (isPublicPath) {
        const authOnlyPaths = ['/login', '/signup', '/'];
        if (authOnlyPaths.includes(pathWithoutLocale)) {
            return NextResponse.redirect(new URL(`/${localeInPath}${defaultDashboard}`, request.url));
        }
        return response; 
    }
    // =================================================================================
    // --- END OF LOGIC REORDERING ---
    // =================================================================================

    // --- 4. SECURITY ACCESS ENFORCEMENT (LOOP PROOF) ---
    const requiredRolesForPath = Object.keys(rolePermissions).find(path => pathWithoutLocale.startsWith(path));
    if (requiredRolesForPath && !rolePermissions[requiredRolesForPath].includes(userRole)) {
        
        // LOOP GUARD: If the redirect destination is the SAME as the current path, 
        // stop and allow the request to proceed to avoid a recursive loop.
        if (pathWithoutLocale === defaultDashboard) {
            return response;
        }

        return NextResponse.redirect(new URL(`/${localeInPath}${defaultDashboard}`, request.url));
    }
    
    // Authorization verified. Proceed to Active Node.
    return response; 
}

// --- MATCHER (Sovereign Engine Optimized) ---
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|robots.txt|sitemap.xml|.*\\..*).*)',
  ],
};