// src/app/[locale]/layout.tsx

// --- THE FIX: Force this layout to use the Node.js runtime ---
// This prevents Next.js from automatically opting into the Edge Runtime due to the AI SDK,
// which ensures compatibility with the Supabase server client.
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
import { GlobalCopilotProvider, useCopilot } from '@/components/core/GlobalCopilot';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import type { Session } from '@supabase/supabase-js'; // Import the Session type for safety

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
export default async function RootLayout({
  children,
  params: { locale },
}: {
  children: ReactNode;
  params: { locale: string };
}) {
  let session: Session | null = null;

  // --- FIX: ADDED TRY/CATCH BLOCK FOR SAFE SERVER-SIDE DATA FETCHING ---
  // This prevents the entire application from crashing if Supabase connection fails.
  try {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    const { data } = await supabase.auth.getSession();
    session = data.session;
  } catch (error) {
    // This will print the detailed error message in your Vercel server logs
    // so you can see exactly what went wrong (e.g., "Invalid API key").
    console.error('Error fetching Supabase session in root layout:', error);
    // The page will now continue to render with a null session instead of crashing.
  }

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={cn('min-h-screen bg-background font-sans antialiased', fontSans.variable)}>
        {/* The session (or null if it failed) is safely passed to the provider */}
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