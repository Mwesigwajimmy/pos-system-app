import { ReactNode } from 'react';
import { Metadata } from 'next'; 
import { Inter as FontSans } from 'next/font/google';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import './globals.css';
import { cn } from '@/lib/utils';
import { Toaster } from 'sonner';
import { ThemeProvider } from '@/components/theme-provider';
import TanstackProvider from '@/providers/TanstackProvider';
import SupabaseProvider from '@/providers/SupabaseProvider';
import { SidebarProvider } from '@/context/SidebarContext';
// ✅ DEEP WELD: Added the missing BusinessProvider to global scope
import { BusinessProvider } from '@/context/BusinessContext'; 
import type { Session } from '@supabase/supabase-js';
import ServiceWorkerRegistrar from '@/components/ServiceWorkerRegistrar';
import Script from 'next/script';
import React from 'react';

/**
 * --- BBU1 SOVEREIGN GLOBAL LAYOUT ---
 * VERSION: v18.6 OMEGA (THE MASTER ARCHITECT - CONTEXT SEALED)
 * JURISDICTION: Global Multi-Tenant Infrastructure
 * 
 * CORE UPGRADES:
 * 1. SERVER-SIDE IDENTITY ANCHOR: Hardened the branding fetch with a 
 *    permissive error-catch to prevent page-hangs during RLS transitions.
 * 2. FAVICON DYNAMIC WELD: Physically links the browser tab identity to 
 *    the Director's specific business logo (1024-dim sync).
 * 3. THE SOVEREIGN STYLE WELD: Injects '--brand-primary' into the body 
 *    CSS environment to ensure the entire UI respects the active node's DNA.
 * 4. PWA & SEO INTEGRITY: 100% preservation of site.webmanifest and 
 *    SoftwareApplication JSON-LD schemas.
 * 5. CONTEXT ARCHITECTURE: Integrated BusinessProvider globally to 
 *    ensure useBusiness() works on Welcome and Setup screens.
 */

// --- PROFESSIONAL GLOBAL METADATA (UNTOUCHED) ---
export const metadata: Metadata = {
  title: {
    default: 'BBU1 Global | Enterprise Business Operating System',
    template: '%s | BBU1 Global'
  },
  description: 'The unified operating system for global business management, inventory, and enterprise-grade retail operations. Secure, automated, and scalable.',
  keywords: ['ERP', 'Business Operating System', 'Inventory Management', 'POS', 'Enterprise Finance'],
  authors: [{ name: 'BBU1 Enterprise' }],
  creator: 'BBU1',
  publisher: 'BBU1 Global',
  metadataBase: new URL('https://www.bbu1.com'), 
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://www.bbu1.com', 
    title: 'BBU1 Global | Enterprise Business Operating System',
    description: 'BBU1 is the standard for global business management.',
    siteName: 'BBU1 ERP',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BBU1 Global Enterprise Platform',
    description: 'Automating business operations worldwide.',
  },
};

const fontSans = FontSans({
  subsets: ['latin'],
  variable: '--font-sans',
});

// List of supported locales for sanitization
const SUPPORTED_LOCALES = ['de', 'en', 'fr', 'lg', 'nl', 'no', 'nyn', 'pt-BR', 'ru', 'rw', 'sw', 'zh'];

export default async function LocaleRootLayout({
  children,
  params: { locale },
}: {
  children: ReactNode;
  params: { locale: string };
}) {
  /**
   * PROFESSIONAL FIX: Locale Sanitization
   */
  const safeLocale = SUPPORTED_LOCALES.includes(locale) ? locale : 'en';

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  
  // Safe session fetch
  let session: Session | null = null;
  
  // --- SOVEREIGN IDENTITY VARIABLES ---
  let brandColor = '#1D4ED8'; // Default BBU1 Blue
  let companyLogo = '/logo.png'; // Default Fallback Logo

  try {
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    session = currentSession;

    // --- UPGRADE: SERVER-SIDE IDENTITY FETCH (v18.5 HARDENED) ---
    // We prioritize the active business cookie for new windows
    const activeBizId = cookieStore.get('bbu1_active_business_id')?.value;

    if (session?.user) {
        // We look for the business node linked to this session
        const targetBizId = activeBizId || session.user.user_metadata?.business_id;

        if (targetBizId && targetBizId !== 'loading') {
            // Forensic Branding Fetch: Bypasses UI lag by pre-loading on server
            const { data: brand } = await supabase
                .from('view_bbu1_corporate_identity')
                .select('primary_color, logo_url')
                .eq('business_id', targetBizId)
                .maybeSingle(); // maybeSingle avoids crashing if the view is in maintenance
            
            if (brand?.primary_color) brandColor = brand.primary_color;
            if (brand?.logo_url) companyLogo = brand.logo_url;
        }
    }
  } catch (e) {
    console.warn("[AURA ARCHITECT] Server-side identity fetch deferred. Using defaults.");
    session = null;
  }

  // --- PROFESSIONAL APPLICATION SCHEMA ---
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "BBU1 Global Business OS",
    "operatingSystem": "Windows, MacOS, Android, iOS, Web",
    "applicationCategory": "BusinessApplication, FinanceApplication",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "publisher": {
      "@type": "Organization",
      "name": "LITONU BUSINESS BASE UNIVERSE LTD",
      "url": "https://www.bbu1.com",
      "logo": "https://www.bbu1.com/icons/android-chrome-512x512.png"
    },
    "downloadUrl": "https://www.bbu1.com/en/download",
    "featureList": "Cloud Accounting, Inventory Management, CRM, HR, AI Insights",
    "installTarget": {
        "@type": "InstallAction",
        "target": {
            "@type": "EntryPoint",
            "urlTemplate": "https://www.bbu1.com/en/download",
            "actionPlatform": ["http://schema.org/DesktopWebPlatform", "http://schema.org/IOSPlatform", "http://schema.org/AndroidPlatform"]
        }
    }
  };

  return (
    <html lang={safeLocale} suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/site.webmanifest" />
        
        {/* --- DYNAMIC IDENTITY FAVICON WELD --- */}
        <link rel="icon" href={companyLogo} />
        <link rel="apple-touch-icon" href={companyLogo} />
        
        <meta name="theme-color" content={brandColor} />
        
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

        <Script
          async
          src="https://www.googletagmanager.com/gtag/js?id=G-VXKX3Y51MN"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-VXKX3Y51MN');
          `}
        </Script>
      </head>
      <body 
        className={cn('min-h-screen bg-background font-sans antialiased', fontSans.variable)}
        /* --- THE SOVEREIGN WELD: GLOBAL CSS VARIABLE INJECTION --- */
        style={{ '--brand-primary': brandColor } as React.CSSProperties}
      >
        <SupabaseProvider session={session}>
          <TanstackProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="light" 
              enableSystem={false}
              disableTransitionOnChange
            >
              {/* ✅ FIX: BusinessProvider is now at the Top Level to prevent useBusiness() crashes */}
              <BusinessProvider>
                <SidebarProvider>
                  {children}
                  <Toaster richColors position="bottom-right" />
                </SidebarProvider>
              </BusinessProvider>
            </ThemeProvider>
          </TanstackProvider>
        </SupabaseProvider>
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}

/**
 * STATUS: Global Layout Sealed.
 * JURISDICTION: Unified Multi-Tenant Cloud.
 * ENGINE: Elite 1024-dim Identity Ready.
 */