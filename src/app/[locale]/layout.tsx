// src/app/[locale]/layout.tsx

import { ReactNode } from 'react';
import { Inter as FontSans } from 'next/font/google';
import { cookies } from 'next/headers'; // Import cookies
import { createClient } from '@/lib/supabase/server'; // Import your server client
import './globals.css';
import { cn } from '@/lib/utils';
import { Toaster } from 'sonner';
import { ThemeProvider } from '@/components/theme-provider';
import TanstackProvider from '@/providers/TanstackProvider';
import SupabaseProvider from '@/providers/SupabaseProvider';
import { SidebarProvider } from '@/context/SidebarContext';
import { GlobalCopilotProvider, useCopilot } from '@/components/core/GlobalCopilot';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';

const fontSans = FontSans({
  subsets: ['latin'],
  variable: '--font-sans',
});

const CopilotToggleButton = () => {
    'use client';
    const { togglePanel, isOpen } = useCopilot();
    return (
        <Button 
            onClick={togglePanel}
            variant="default"
            size="icon"
            className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-2xl z-50 transition-transform hover:scale-110 active:scale-95 animate-in fade-in zoom-in-95"
            aria-label={isOpen ? "Close AI Co-Pilot" : "Open AI Co-Pilot"}
        >
            <Sparkles className="h-6 w-6" />
        </Button>
    );
}

/**
 * This is the root layout for the entire application.
 * It establishes all foundational providers, including the AI Kernel's
 * connection to the frontend via the GlobalCopilotProvider.
 */
// 1. Make the RootLayout an async function
export default async function RootLayout({
  children,
  params: { locale },
}: {
  children: ReactNode;
  params: { locale: string };
}) {
  // 2. Fetch the session on the server
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const { data: { session } } = await supabase.auth.getSession();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={cn('min-h-screen bg-background font-sans antialiased', fontSans.variable)}>
        {/* 3. Pass the fetched session to the provider */}
        <SupabaseProvider session={session}>
          <TanstackProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              <GlobalCopilotProvider>
                <SidebarProvider>
                  {children}
                  <CopilotToggleButton />
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