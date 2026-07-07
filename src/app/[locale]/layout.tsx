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
 * VERSION: v18.7 OMEGA (NETWORK GUARD INTEGRATED)
 * JURISDICTION: Global Multi-Tenant Infrastructure
 * 
 * CORE UPGRADES:
 * 1. FORENSIC NETWORK GUARD: Injected a deep-level script to monitor 
 *    navigator.onLine status. If offline, it triggers the BBU1 Red Alert screen.
 * 2. SERVER-SIDE IDENTITY ANCHOR: Hardened branding fetch with 
 *    permissive error-catch logic.
 * 3. FAVICON DYNAMIC WELD: Links browser tab identity to business logo.
 * 4. CONTEXT ARCHITECTURE: BusinessProvider globally integrated.
 */

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

const SUPPORTED_LOCALES = ['de', 'en', 'fr', 'lg', 'nl', 'no', 'nyn', 'pt-BR', 'ru', 'rw', 'sw', 'zh'];

export default async function LocaleRootLayout({
  children,
  params: { locale },
}: {
  children: ReactNode;
  params: { locale: string };
}) {
  const safeLocale = SUPPORTED_LOCALES.includes(locale) ? locale : 'en';
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  
  let session: Session | null = null;
  let brandColor = '#1D4ED8'; 
  let companyLogo = '/logo.png'; 

  try {
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    session = currentSession;

    const activeBizId = cookieStore.get('bbu1_active_business_id')?.value;

    if (session?.user) {
        const targetBizId = activeBizId || session.user.user_metadata?.business_id;

        if (targetBizId && targetBizId !== 'loading') {
            const { data: brand } = await supabase
                .from('view_bbu1_corporate_identity')
                .select('primary_color, logo_url')
                .eq('business_id', targetBizId)
                .maybeSingle();
            
            if (brand?.primary_color) brandColor = brand.primary_color;
            if (brand?.logo_url) companyLogo = brand.logo_url;
        }
    }
  } catch (e) {
    console.warn("[AURA ARCHITECT] Identity fetch deferred.");
    session = null;
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "BBU1 Global Business OS",
    "operatingSystem": "Windows, MacOS, Android, iOS, Web",
    "applicationCategory": "BusinessApplication, FinanceApplication",
    "publisher": {
      "@type": "Organization",
      "name": "LITONU BUSINESS BASE UNIVERSE LTD",
      "url": "https://www.bbu1.com"
    }
  };

  return (
    <html lang={safeLocale} suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/site.webmanifest" />
        <link rel="icon" href={companyLogo} />
        <link rel="apple-touch-icon" href={companyLogo} />
        <meta name="theme-color" content={brandColor} />
        
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

        {/* --- DYNAMIC NETWORK GUARD (OFFLINE WELD) --- */}
        <Script id="network-guard" strategy="afterInteractive">
          {`
            (function() {
              const guardId = 'bbu1-offline-overlay';
              
              function showOfflineScreen() {
                if (document.getElementById(guardId)) return;
                const overlay = document.createElement('div');
                overlay.id = guardId;
                overlay.style.position = 'fixed';
                overlay.style.top = '0';
                overlay.style.left = '0';
                overlay.style.width = '100vw';
                overlay.style.height = '100vh';
                overlay.style.zIndex = '10000';
                overlay.style.backgroundColor = '#ffffff';
                overlay.innerHTML = '<iframe src="/offline.html" style="width:100%; height:100%; border:none;"></iframe>';
                document.body.appendChild(overlay);
              }

              function hideOfflineScreen() {
                const overlay = document.getElementById(guardId);
                if (overlay) overlay.remove();
              }

              window.addEventListener('offline', showOfflineScreen);
              window.addEventListener('online', hideOfflineScreen);

              // Initial Check
              if (!navigator.onLine) showOfflineScreen();
            })();
          `}
        </Script>

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