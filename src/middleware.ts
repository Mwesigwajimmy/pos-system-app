// src/middleware.ts
// V-REVOLUTION: THE DEFINITIVE, LOOP-FREE SECURITY & ROUTING ENGINE
// FIXED: Identity Paradox & Circular Redirect Loop Resolution

import { match } from '@formatjs/intl-localematcher';
import Negotiator from 'negotiator';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// --- CONFIGURATION (Your original code, untouched) ---

// 1. Your complete list of supported languages
const locales = ['de', 'en', 'fr', 'lg', 'nl', 'no', 'nyn', 'pt-BR', 'ru', 'rw', 'sw', 'zh'];
const defaultLocale = 'en';

// 2. Global Public Paths
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
function getLocale(request: NextRequest): string {
    try {
        const negotiatorHeaders: Record<string, string> = {};
        request.headers.forEach((value, key) => (negotiatorHeaders[key] = value));

        const languages = new Negotiator({ headers: negotiatorHeaders }).languages();
        
        if (!languages || languages.length === 0 || (languages.length === 1 && languages[0] === '*')) {
            return defaultLocale;
        }

        return match(languages, locales, defaultLocale);
    } catch (e) {
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

export async function middleware(request: NextRequest) {
    if (request.nextUrl.searchParams.has('_rsc')) {
        return NextResponse.next();
    }
    if (request.headers.get('x-middleware-rewrite')) {
        return NextResponse.next();
    }

    const { pathname } = request.nextUrl;

    // ✅ ADD THESE 3 LINES RIGHT HERE:
    if (pathname.startsWith('/api/') || pathname.includes('.')) {
        return NextResponse.next();
    }
    // -------------------------------

    // --- START: next-intl Integration ---
    const pathnameIsMissingLocale = locales.every(
        (locale) => !pathname.startsWith(`/${locale}/`) && pathname !== `/${locale}`
    );

    let localeInPath: string;
    let pathWithoutLocale: string;
    let response: NextResponse;

    if (pathnameIsMissingLocale) {
        localeInPath = getLocale(request);
        const newPath = pathname === '/' ? '' : pathname;
        const redirectUrl = new URL(`/${localeInPath}${newPath}`, request.url);
        response = NextResponse.redirect(redirectUrl);
    } else {
        localeInPath = pathname.split('/')[1];
        const requestHeaders = new Headers(request.headers);
        requestHeaders.set('x-next-intl-locale', localeInPath);
        response = NextResponse.next({ request: { headers: requestHeaders } });
    }
    
    pathWithoutLocale = pathname.replace(`/${localeInPath}`, '') || '/';

    // --- START: GOOGLEBOT / SEO BYPASS ---
    const userAgent = request.headers.get('user-agent') || '';
    const isBot = /googlebot|bingbot|yandexbot|duckduckbot/i.test(userAgent);
    
    const isPublicPathForBot = publicPaths.some(pp => 
        pathWithoutLocale === pp || pathWithoutLocale.startsWith(`${pp}/`)
    );

    if (isBot && isPublicPathForBot) {
        return response;
    }

   // --- SUPABASE & AUTH LOGIC ---
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

    let activeBizId: string | undefined = undefined;

    if (user) {
        activeBizId = request.cookies.get('bbu1_active_business_id')?.value;
        if (activeBizId) {
            await supabase.rpc('set_session_business_id', { p_biz_id: activeBizId });
        }
    } else {
        const isPublicPath = publicPaths.some(pp => pathWithoutLocale === pp || pathWithoutLocale.startsWith(`${pp}/`));
        if (isPublicPath) return response;
        return NextResponse.redirect(new URL(`/${localeInPath}/login`, request.url));
    }

    // --- 2. CONTEXT MORPHING ---
    const { data: userContextData, error: contextError } = await supabase.rpc('get_user_context', {
        p_target_biz_id: activeBizId
    });

    // --- 3. IDENTITY RECOVERY PROTOCOL (FIXED LOOP) ---
    if (contextError || !userContextData || userContextData.length === 0) {
        // BREAK THE LOOP: If we are already on /login, stop and let it render. 
        // Never redirect back to /dashboard if context is failing.
        if (pathWithoutLocale === '/login') {
            return response;
        }

        const recoveryResponse = NextResponse.redirect(new URL(`/${localeInPath}/login`, request.url));
        recoveryResponse.cookies.delete('bbu1_active_business_id');
        return recoveryResponse;
    }
    
    const userContext = userContextData[0];
    const userRole = userContext.user_role || 'guest';
    const businessType = userContext.business_type || '';
    const setupComplete = userContext.setup_complete;
    const systemPower = userContext.system_power || null;

    // --- SUBSCRIPTION SECURITY GATE ---
    const subStatus = (userContext.subscription_status || '').toLowerCase().trim();
    const isPaid = ['trial', 'active', 'free', 'completed'].includes(subStatus);
    const isOnBillingPage = pathWithoutLocale.includes('/settings/billing');
    const isCallbackPage = pathWithoutLocale.includes('/settings/billing/callback');

    if (isPaid && isOnBillingPage && !isCallbackPage) {
        return NextResponse.redirect(new URL(`/${localeInPath}/dashboard`, request.url));
    }

    const isRestrictedPath = !isPublicPathForBot && !isOnBillingPage && !isCallbackPage && pathWithoutLocale !== '/welcome';
    if (!isPaid && isRestrictedPath) {
        return NextResponse.redirect(new URL(`/${localeInPath}/settings/billing`, request.url));
    }

    // --- THE SMART REDIRECT ENGINE ---
    const defaultDashboard = (systemPower === 'architect' || systemPower === 'commander') 
        ? '/command-center' 
        : (defaultDashboards[userRole] || defaultDashboards[businessType] || defaultDashboards['default']);

    // --- PRIORITY LOGIC (WELDED) ---
    if (!setupComplete && pathWithoutLocale !== '/welcome') {
        return NextResponse.redirect(new URL(`/${localeInPath}/welcome`, request.url));
    }
    
    if (setupComplete && pathWithoutLocale === '/welcome') {
        return NextResponse.redirect(new URL(`/${localeInPath}${defaultDashboard}`, request.url));
    }

    // AUTO-LANDING JUMP (FIXED LOOP)
    const isGenericDashboard = pathWithoutLocale === '/dashboard' || pathWithoutLocale === '/';
    if (isGenericDashboard && pathWithoutLocale !== defaultDashboard) {
        return NextResponse.redirect(new URL(`/${localeInPath}${defaultDashboard}`, request.url));
    }

    const isPublicPath = publicPaths.some(pp => 
        pathWithoutLocale === pp || pathWithoutLocale.startsWith(`${pp}/`)
    );

    if (isPublicPath) {
        const authOnlyPaths = ['/login', '/signup', '/'];
        // If logged in user tries to visit login/signup, push to their dashboard
        if (authOnlyPaths.includes(pathWithoutLocale)) {
            return NextResponse.redirect(new URL(`/${localeInPath}${defaultDashboard}`, request.url));
        }
        return response; 
    }

    // --- 4. SECURITY ACCESS ENFORCEMENT ---
    const requiredRolesForPath = Object.keys(rolePermissions).find(path => pathWithoutLocale.startsWith(path));
    if (requiredRolesForPath && !rolePermissions[requiredRolesForPath].includes(userRole)) {
        // Safety check to prevent infinite self-redirect
        if (pathWithoutLocale === defaultDashboard) {
            return response;
        }
        return NextResponse.redirect(new URL(`/${localeInPath}${defaultDashboard}`, request.url));
    }
    
    return response; 
}

export const config = {
  matcher: [
    '/((?!api/|_next/static|_next/image|robots.txt|sitemap.xml|.*\\..*).*)',
  ],
};