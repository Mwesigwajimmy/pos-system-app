import type { Metadata, Viewport } from 'next';
import { Inter as FontSans } from 'next/font/google';
import './globals.css';
import { cn } from '@/lib/utils';
import Providers from "@/components/Providers";
import { Toaster } from "react-hot-toast";
import { ThemeProvider } from '@/components/theme-provider';

const fontSans = FontSans({
  subsets: ['latin'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: "UG-BizSuite | The Operating System for Ugandan Ambition",
  description: "The all-in-one platform for Sales, Inventory, Accounting, and CRM, built for Ugandan businesses to thrive—even offline. Get started for free.",
  manifest: '/manifest.json',
  keywords: ['Uganda', 'business software', 'POS', 'Inventory Management', 'Accounting Software', 'CRM', 'Ugandan businesses', 'offline POS', 'mobile money integration'],
  authors: [{ name: 'UG-BizSuite' }],
  creator: 'UG-BizSuite Team',
  openGraph: {
    title: 'UG-BizSuite | The Operating System for Ugandan Ambition',
    description: 'The all-in-one platform for Sales, Inventory, Accounting, and CRM, built for Ugandan businesses to thrive—even offline.',
    url: 'https://www.ugbizsuite.com',
    siteName: 'UG-BizSuite',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1200&h=630&fit=crop&crop=entropy',
        width: 1200,
        height: 630,
        alt: 'UG-BizSuite Dashboard showing business growth',
      },
    ],
    locale: 'en_UG',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'UG-BizSuite | The Operating System for Ugandan Ambition',
    description: 'The all-in-one platform for Sales, Inventory, Accounting, and CRM, built for Ugandan businesses to thrive—even offline.',
    creator: '@ugbizsuite',
    images: ['https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1200&h=630&fit=crop&crop=entropy'],
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#10B981',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          'min-h-screen bg-background font-sans antialiased',
          fontSans.variable
        )}
      >
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
      </body>
    </html>
  );
}