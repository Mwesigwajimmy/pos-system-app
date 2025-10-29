'use client';

import React, { useState, useEffect, memo } from 'react';
import { usePathname } from 'next/navigation';
import { Menu, X, Sparkles } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { SyncProvider } from '@/components/core/SyncProvider';
import BrandingProvider from '@/components/core/BrandingProvider';
import { Button } from '@/components/ui/button';

// --- ADDED FIX: Import CoreMessage from the source package ---
import { type CoreMessage } from 'ai';

// --- THE REVOLUTION: Import the AI's Global Provider and its access hook ---
// FIX: Removed 'type CoreMessage' from this local import to solve the build error
import { GlobalCopilotProvider, useCopilot } from '@/components/core/GlobalCopilot'; 

// --- Mobile Sidebar Logic (Preserved from your original layout) ---
const useMobileSidebar = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => {
    if (isSidebarOpen) {
      setIsSidebarOpen(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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


// --- The Omnipresent AI Toggle Button ---
// This client component lives inside the provider to access its state.
const CopilotToggleButton = () => {
    // NOTE: The CoreMessage type is now correctly resolved in the context provider
    const { togglePanel, isOpen } = useCopilot();
    return (
        <Button 
            onClick={togglePanel}
            size="icon"
            className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-2xl z-50 transition-transform hover:scale-110 active:scale-95"
            aria-label={isOpen ? "Close AI Co-Pilot" : "Open AI Co-Pilot"}
        >
            <Sparkles className="h-6 w-6" />
        </Button>
    );
}

// --- The Main Application Layout ---
// The core layout component now orchestrates the AI provider and the UI.
const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const { isSidebarOpen, setIsSidebarOpen } = useMobileSidebar();

  return (
    <div className="flex h-screen bg-background">
      {/* --- Your existing, preserved UI structure --- */}
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
      
      {/* --- The Global AI is now always available via this button --- */}
      <CopilotToggleButton />
    </div>
  );
}

// --- The Final, Definitive Dashboard Layout Export ---
// This is the root component that provides all necessary context to the application.
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <BrandingProvider>
      <SyncProvider>
        {/* THE REVOLUTION: The GlobalCopilotProvider now wraps your entire application layout. */}
        {/* This makes Aura's brain and abilities available to every single component. */}
        <GlobalCopilotProvider>
          <AppLayout>
            {children}
          </AppLayout>
        </GlobalCopilotProvider>
      </SyncProvider>
    </BrandingProvider>
  );
}