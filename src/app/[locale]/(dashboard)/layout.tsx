// src/app/[locale]/(dashboard)/layout.tsx

'use client';

import React, { memo, ReactNode } from 'react';
import { Menu, X, Sparkles, Loader2 } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { SyncProvider } from '@/components/core/SyncProvider';
import BrandingProvider from '@/components/core/BrandingProvider';
import { Button } from '@/components/ui/button';

// --- V-REVOLUTION FIX: IMPORT THE NECESSARY PROVIDERS ---
import { BusinessProvider, useBusiness } from '@/context/BusinessContext';
import { GlobalCopilotProvider, useCopilot } from '@/context/CopilotContext';
// --- END OF FIX ---

import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

// --- The Omnipresent AI Toggle Button (No changes needed here) ---
const CopilotToggleButton = () => {
    const { toggleCopilot, isOpen, isReady } = useCopilot();

    if (!isReady) {
        return null;
    }
    return (
        <Button
            onClick={toggleCopilot}
            size="icon"
            className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-2xl z-50 transition-transform hover:scale-110 active:scale-95"
            aria-label={isOpen ? "Close AI Co-Pilot" : "Open AI Co-Pilot"}
        >
            <Sparkles className="h-6 w-6" />
        </Button>
    );
}

// --- The Main Application Layout (No changes needed here) ---
const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (isSidebarOpen) {
      setIsSidebarOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

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

  return (
    <div className="flex h-screen bg-background">
      <div className="hidden md:flex md:flex-shrink-0"><Sidebar /></div>
      <MobileSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <header className="relative z-30 flex-shrink-0 flex h-16 bg-card border-b border-border">
          <button type="button" className="px-4 border-r border-border text-muted-foreground focus:outline-none md:hidden" onClick={() => setIsSidebarOpen(true)}>
            <span className="sr-only">Open sidebar</span>
            <Menu className="h-6 w-6" aria-hidden="true" />
          </button>
          <Header />
        </header>
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
      <CopilotToggleButton />
    </div>
  );
}

// --- Gatekeeper Component (Your original, correct logic) ---
// This component now sits inside the providers and determines if the main UI should render.
const DashboardGatekeeper = ({ children }: { children: ReactNode }) => {
    const { profile, isLoading, error } = useBusiness();

    if (isLoading) {
        return (
            <div className="flex h-screen w-screen items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error || !profile) {
        return (
            <div className="flex h-screen w-screen items-center justify-center bg-background text-destructive">
                <div className="text-center">
                    <h1 className="text-xl font-bold">Application Error</h1>
                    <p>{error || "Your business profile could not be loaded. Please log in again."}</p>
                </div>
            </div>
        );
    }
    
    // Profile is loaded, render the actual app layout.
    return <AppLayout>{children}</AppLayout>;
}

// --- The Final, Definitive Dashboard Layout Export (NOW WITH PROVIDERS) ---
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <BusinessProvider>
      <GlobalCopilotProvider>
        <BrandingProvider>
          <SyncProvider>
            {/* The Gatekeeper now protects the UI and has access to the contexts it needs */}
            <DashboardGatekeeper>
              {children}
            </DashboardGatekeeper>
          </SyncProvider>
        </BrandingProvider>
      </GlobalCopilotProvider>
    </BusinessProvider>
  );
}