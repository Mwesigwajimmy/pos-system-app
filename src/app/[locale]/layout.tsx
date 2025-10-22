'use client';

// Removed: import { BusinessProvider } from '@/hooks/useBusinessContext';
// The new useBusinessContext hook is just a data fetching hook, not a provider component.

import { usePathname } from 'next/navigation';
import { Inter as FontSans } from 'next/font/google';
import './globals.css';
import { cn } from '@/lib/utils';
import Providers from "@/components/Providers";
import { Toaster } from "react-hot-toast";
import { ThemeProvider } from '@/components/theme-provider';

// --- Your Professional Dashboard UI Code (Now safely integrated here) ---
import React, { useState, useEffect, memo } from 'react';
import { Menu, X } from 'lucide-react';
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { SyncProvider } from "@/components/core/SyncProvider";
import BrandingProvider from '@/components/core/BrandingProvider';

const fontSans = FontSans({
  subsets: ['latin'],
  variable: '--font-sans',
});

// Custom Hook and Mobile Sidebar (from your original dashboard layout)
const useMobileSidebar = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => {
    if (isSidebarOpen) {
      setIsSidebarOpen(false);
    }
  }, [pathname]);
  return { isSidebarOpen, setIsSidebarOpen };
};

const MobileSidebar = memo(({ isOpen, onClose }: { isOpen: boolean; onClose: () => void; }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-40 flex md:hidden" role="dialog" aria-modal="true">
      <div className="fixed inset-0 bg-black/60" aria-hidden="true" onClick={onClose}></div>
      <div className="relative flex-1 flex flex-col max-w-xs w-full bg-card">
        <div className="absolute top-0 right-0 -mr-12 pt-2">
          <button type="button" className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white" onClick={onClose}>
            <span className="sr-only">Close sidebar</span>
            <X className="h-6 w-6 text-white" aria-hidden="true" />
          </button>
        </div>
        <Sidebar />
      </div>
    </div>
  );
});
MobileSidebar.displayName = 'MobileSidebar';


// --- The Final, Correct Root Layout ---
export default function RootLayout({
  children,
  params: { locale }
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const pathname = usePathname();
  const { isSidebarOpen, setIsSidebarOpen } = useMobileSidebar();

  // Logic to determine which layout to apply
  const pathSegments = pathname.split('/');
  const mainSegment = pathSegments[2] || '';

  const isDashboardPage = !['', 'login', 'signup', 'accept-invite', 'kds'].includes(mainSegment);
  const isAuthPage = ['login', 'signup'].includes(mainSegment);

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={cn('min-h-screen bg-background font-sans antialiased', fontSans.variable)}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <Providers>
            {/* The BusinessProvider component is no longer needed here if useBusinessContext is just a hook */}
            {isDashboardPage ? (
              // --- RENDER YOUR PROFESSIONAL DASHBOARD UI ---
              <BrandingProvider>
                <SyncProvider>
                  <div className="flex h-screen bg-background">
                    <div className="hidden md:flex md:flex-shrink-0"><Sidebar /></div>
                    <MobileSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
                    <div className="flex flex-col flex-1 overflow-hidden">
                      <header className="relative z-10 flex-shrink-0 flex h-16 bg-card border-b border-border">
                        <button type="button" className="px-4 border-r border-border text-muted-foreground focus:outline-none md:hidden" onClick={() => setIsSidebarOpen(true)}>
                          <span className="sr-only">Open sidebar</span>
                          <Menu className="h-6 w-6" aria-hidden="true" />
                        </button>
                        <Header />
                      </header>
                      <main className="flex-1 relative overflow-y-auto focus:outline-none p-4 sm:p-6 lg:p-8">
                        {children}
                      </main>
                    </div>
                  </div>
                </SyncProvider>
              </BrandingProvider>
            ) : isAuthPage ? (
              // --- RENDER YOUR PROFESSIONAL AUTH UI ---
              <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                {children}
              </div>
            ) : (
              // --- RENDER OTHER PAGES (LIKE YOUR LANDING PAGE) DIRECTLY ---
              <>{children}</>
            )}
            <Toaster position="bottom-right" />
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}