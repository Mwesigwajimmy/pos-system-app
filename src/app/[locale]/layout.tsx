// --- THE FIX: Force this layout to use the Node.js runtime ---
export const runtime = 'nodejs';

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

// --- THE FIX: The dynamic import for the Copilot is REMOVED from this file. ---
// This provider is specific to the authenticated dashboard and was causing the
// application to crash by trying to access business data on public pages.
// It will now be correctly placed in the dashboard's own layout file.

const fontSans = FontSans({
  subsets: ['latin'],
  variable: '--font-sans',
});

// Your original comments and structure are preserved.
/**
 * This is the root layout for the entire application.
 * It establishes all foundational providers.
 */
export default async function RootLayout({
  children,
  params: { locale },
}: {
  children: ReactNode;
  params: { locale: string };
}) {
  let session: Session | null = null;

  try {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    const { data } = await supabase.auth.getSession();
    session = data.session;
  } catch (error) {
    console.error('Error fetching Supabase session in root layout:', error);
  }

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={cn('min-h-screen bg-background font-sans antialiased', fontSans.variable)}>
        <SupabaseProvider session={session}>
          <TanstackProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              {/* --- CRITICAL: DynamicGlobalCopilotProvider is REMOVED --- */}
              <SidebarProvider>
                {children}
                <Toaster richColors position="bottom-right" />
              </SidebarProvider>
            </ThemeProvider>
          </TanstackProvider>
        </SupabaseProvider>
      </body>
    </html>
  );
}