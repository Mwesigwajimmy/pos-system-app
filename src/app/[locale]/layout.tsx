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

// --- THE FIX: We now import our "Gatekeeper" provider directly ---
// It is a client component that safely handles its children, so dynamic import is no longer needed.
import { GlobalCopilotProvider } from '@/context/CopilotContext';

const fontSans = FontSans({
  subsets: ['latin'],
  variable: '--font-sans',
});

/**
 * This is the root layout for the entire application.
 * It establishes all foundational providers, including the AI Kernel's
 * connection to the frontend via the GlobalCopilotProvider.
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
              {/* --- CRITICAL: Use the new GlobalCopilotProvider --- */}
              {/* It will render its children immediately, but only activate the AI when the business context is ready. */}
              <GlobalCopilotProvider>
                <SidebarProvider>
                  {children}
                  <Toaster richColors position="bottom-right" />
                </SidebarProvider>
              </GlobalCopilotProvider>
            </ThemeProvider>
          </TanstackProvider>
        </SupabaseProvider>
      </body>
    </html>
  );
}