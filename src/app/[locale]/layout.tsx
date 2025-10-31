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
import { BusinessProvider } from '@/context/BusinessContext';

// CRITICAL FIX: Dynamically import GlobalCopilotProvider with ssr: false
const DynamicGlobalCopilotProvider = dynamic(() => import('@/context/CopilotContext').then(mod => mod.GlobalCopilotProvider), {
  ssr: false,
});
// -----------------------------------------------------------

const fontSans = FontSans({
  subsets: ['latin'],
  variable: '--font-sans',
});

export default async function LocaleRootLayout({ // Renamed to avoid confusion with root app/layout.tsx
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
    console.error('Error fetching Supabase session in locale root layout:', error);
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
              <BusinessProvider>
                {/* DynamicGlobalCopilotProvider will only render CopilotWorkerProvider when profile is ready */}
                <DynamicGlobalCopilotProvider>
                  <SidebarProvider>
                    {children} {/* This is where your /signup page will be rendered */}
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