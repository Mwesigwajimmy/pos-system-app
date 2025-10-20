// src/app/layout.tsx

import type { Metadata, Viewport } from 'next';
import { Inter as FontSans } from 'next/font/google';
import './globals.css';
import { cn } from '@/lib/utils';
import Providers from "@/components/Providers";
import { Toaster } from "react-hot-toast";
import { ThemeProvider } from '@/components/theme-provider';

// --- next-intl Imports ---
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';

const fontSans = FontSans({
  subsets: ['latin'],
  variable: '--font-sans',
});

// Your existing metadata and viewport are perfect, no changes needed there.
export const metadata: Metadata = {
  title: "BBU1 | The Global Operating System for Ambitious Enterprise",
  description: "Unify your POS, Inventory, Cloud Accounting, Telecoms, and AI-driven insights into one powerful, scalable platform for Africa, Uganda, and the world.",
  manifest: '/site.webmanifest',
  keywords: ['Uganda', 'Africa', 'business software', 'POS', 'Inventory Management', 'Accounting Software', 'Telecom', 'Airtel', 'MTN', 'offline POS', 'mobile money integration'],
  authors: [{ name: 'BBU1' }],
  creator: 'BBU1 Team',
  openGraph: {
    title: 'BBU1 | The Global Operating System for Ambitious Enterprise',
    description: 'The all-in-one platform for Sales, Inventory, Accounting, and CRM, built for businesses to thrive—even offline.',
    url: 'https://www.bbu1.com',
    siteName: 'BBU1',
    images: [{
      url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1200&h=630&fit=crop&crop=entropy',
      width: 1200,
      height: 630,
      alt: 'BBU1 Dashboard showing business growth',
    }],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BBU1 | The Global Operating System for Ambitious Enterprise',
    description: 'The all-in-one platform for Sales, Inventory, Accounting, and CRM, built for businesses to thrive—even offline.',
    creator: '@bbu1',
    images: ['https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1200&h=630&fit=crop&crop=entropy'],
  },
  icons: {
    icon: [
        { url: '/favicon.ico', sizes: 'any' },
        { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
        { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
    other: [
        { rel: 'android-chrome-192x192', url: '/android-chrome-192x192.png' },
        { rel: 'android-chrome-512x512', url: '/android-chrome-512x512.png' }
    ]
  },
};

export const viewport: Viewport = {
  themeColor: '#10B981',
};


// The RootLayout function is what needs to be corrected.
export default async function RootLayout({
  children,
  params: {locale} // `locale` is passed from the URL by Next.js
}: {
  children: React.ReactNode;
  params: {locale: string};
}) {
  // This is the crucial step: Fetch the messages for the current locale.
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={cn(
          'min-h-screen bg-background font-sans antialiased',
          fontSans.variable
        )}
      >
        {/*
          The NextIntlClientProvider MUST wrap everything, including other providers,
          so that all components can access the language messages.
        */}
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <Providers>
              {children}
            </Providers>
            <Toaster position="bottom-right" />
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}