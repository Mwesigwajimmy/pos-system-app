import { ReactNode } from 'react';
import type { Metadata } from "next";
import { Inter as FontSans } from 'next/font/google';
import { cookies } from 'next/headers';
// NOTE: these next few imports (server Supabase client, the three
// providers, ServiceWorkerRegistrar) don't exist in this local copy of the
// repo — they live in the actual hosting/deploy repo. Left in place as-is
// per instruction: do not delete imports just because they can't be
// resolved here.
import { createClient } from '@/lib/supabase/server';
import "./globals.css";
import { cn } from '@/lib/utils';
import { Toaster } from "sonner";
import { ThemeProvider } from '@/components/theme-provider';
import TanstackProvider from '@/providers/TanstackProvider';
import SupabaseProvider from '@/providers/SupabaseProvider';
import { BusinessProvider } from '@/context/BusinessContext';
import { SidebarProvider } from '@/context/SidebarContext';
import type { Session } from '@supabase/supabase-js';
import ServiceWorkerRegistrar from '@/components/ServiceWorkerRegistrar';
import Script from 'next/script';
import SiteShell from "@/components/SiteShell";

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

// Vestigial here on purpose: next.config.ts handles /en, /fr, etc. via a
// rewrite (locale prefix -> same route, no [locale] dynamic segment), so
// Next.js never actually populates params.locale for app/layout.tsx — this
// always resolves to 'en'. Kept (not deleted) since the real repo may rely
// on it; harmless either way.
const SUPPORTED_LOCALES = ['de', 'en', 'fr', 'lg', 'nl', 'no', 'nyn', 'pt-BR', 'ru', 'rw', 'sw', 'zh'];

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: ReactNode;
  params?: { locale?: string };
}>) {
  const safeLocale = params?.locale && SUPPORTED_LOCALES.includes(params.locale) ? params.locale : 'en';

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  let session: Session | null = null;

  const brandColor = '#1D4ED8';
  const companyLogo = '/logo.png';

  try {
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    session = currentSession;
  } catch (e) {
    console.warn("[AURA ARCHITECT] Root session handshake deferred.");
    session = null;
  }

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
    "featureList": "Cloud Accounting, Inventory Management, CRM, HR, AI Insights"
  };

  return (
    <html lang={safeLocale} className="h-full antialiased" suppressHydrationWarning>
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
        className={cn('min-h-full flex flex-col bg-background font-sans antialiased', fontSans.variable)}
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
                  <SiteShell>{children}</SiteShell>
                  <Toaster position="top-center" richColors />
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