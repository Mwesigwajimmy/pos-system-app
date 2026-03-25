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
import type { Session } from '@supabase/supabase-js';
import ServiceWorkerRegistrar from '@/components/ServiceWorkerRegistrar';
import Script from 'next/script';

// --- PROFESSIONAL GLOBAL METADATA ---
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
  metadataBase: new URL('https://www.bbu1.com'), // FIXED: Added proper base URL for SEO
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
   * This prevents the "RangeError: Incorrect locale information provided" crash.
   * If 'locale' is invalid (e.g. Google hits the root or a junk URL), we force it to 'en'.
   */
  const safeLocale = SUPPORTED_LOCALES.includes(locale) ? locale : 'en';

  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  
  // Safe session fetch (Try/Catch to prevent bot-induced crashes)
  let session = null;
  try {
    const sessionRes = await supabase.auth.getSession();
    session = sessionRes.data.session;
  } catch (e) {
    session = null;
  }

  return (
    <html lang={safeLocale} suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/site.webmanifest" />
        <meta name="theme-color" content="#ffffff" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        
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
      <body className={cn('min-h-screen bg-background font-sans antialiased', fontSans.variable)}>
        <SupabaseProvider session={session}>
          <TanstackProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="light" 
              enableSystem={false}
              disableTransitionOnChange
            >
              <SidebarProvider>
                {children}
                <Toaster richColors position="bottom-right" />
              </SidebarProvider>
            </ThemeProvider>
          </TanstackProvider>
        </SupabaseProvider>
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}