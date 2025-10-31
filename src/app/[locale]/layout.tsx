// src/app/[locale]/layout.tsx

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

// --- NEW IMPORTS: ---
import dynamic from 'next/dynamic';
import { BusinessProvider } from '@/context/BusinessContext'; // <--- NEW IMPORT for BusinessProvider

// CRITICAL FIX: Dynamically import GlobalCopilotProvider with ssr: false
// Pointing to the context/CopilotContext instead of components/core/GlobalCopilot
const DynamicGlobalCopilotProvider = dynamic(() => import('@/context/CopilotContext').then(mod => mod.GlobalCopilotProvider), {
  ssr: false, // This ensures that the problematic imports within the provider are never processed on the server
});
// -----------------------------------------------------------

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
              {/* --- NEW: BusinessProvider added here --- */}
              <BusinessProvider>
                <DynamicGlobalCopilotProvider>
                  <SidebarProvider>
                    {children}
                    <Toaster richColors position="bottom-right" />
                  </SidebarProvider>
                </DynamicGlobalCopilotProvider>
              </BusinessProvider>
            </ThemeProvider>
          </TanstackProvider>
        </SupabaseProvider>
      </body>
    </html>
  );
}