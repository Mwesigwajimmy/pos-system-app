// src/app/[locale]/layout.tsx

import { ReactNode } from 'react';
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

const fontSans = FontSans({
  subsets: ['latin'],
  variable: '--font-sans',
});

// NOTE: You do not need dynamic imports or business-related providers here.
// This layout is for things that apply to EVERY page, including login/signup.

export default async function LocaleRootLayout({
  children,
  params: { locale },
}: {
  children: ReactNode;
  params: { locale: string };
}) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const { data: { session } } = await supabase.auth.getSession();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={cn('min-h-screen bg-background font-sans antialiased', fontSans.variable)}>
        {/* These providers are truly global and are needed everywhere. */}
        <SupabaseProvider session={session}>
          <TanstackProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              <SidebarProvider>
                {children} {/* This renders all your pages (login, dashboard, etc.) */}
                <Toaster richColors position="bottom-right" />
              </SidebarProvider>
            </ThemeProvider>
          </TanstackProvider>
        </SupabaseProvider>
      </body>
    </html>
  );
}