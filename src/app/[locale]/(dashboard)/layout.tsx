// src/app/(dashboard)/layout.tsx
'use client';

import React, { useState, useEffect, memo } from 'react';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';

// Core Application Components
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";

// Application-wide Providers
import { SyncProvider } from "@/components/core/SyncProvider";
import BrandingProvider from '@/components/core/BrandingProvider';

// --- 1. Custom Hook for Mobile Sidebar Logic ---

/**
 * Manages the state and behavior of the mobile sidebar.
 * Encapsulates the open/closed state and the effect of closing
 * the sidebar automatically on route changes.
 */
const useMobileSidebar = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();

  // Close the sidebar whenever the user navigates to a new page
  useEffect(() => {
    if (isSidebarOpen) {
      setIsSidebarOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return { isSidebarOpen, setIsSidebarOpen };
};


// --- 2. Dedicated Component for the Mobile Sidebar ---

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Renders the sidebar for mobile devices, including the overlay,
 * slide-in panel, and close button. This component is memoized
 * for performance.
 */
const MobileSidebar = memo(({ isOpen, onClose }: MobileSidebarProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 flex md:hidden" role="dialog" aria-modal="true">
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/60" aria-hidden="true" onClick={onClose}></div>
      
      {/* Sidebar Panel */}
      <div className="relative flex-1 flex flex-col max-w-xs w-full bg-card">
        <div className="absolute top-0 right-0 -mr-12 pt-2">
          <button
            type="button"
            className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
            onClick={onClose}
          >
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


// --- 3. Main Dashboard Layout Component ---

/**
 * The primary layout for all dashboard pages. It arranges the main
 * structural components and wraps the application in necessary context providers.
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isSidebarOpen, setIsSidebarOpen } = useMobileSidebar();

  return (
    <BrandingProvider>
      <SyncProvider>
        <div className="flex h-screen bg-background">
          
          {/* Static sidebar for desktop */}
          <div className="hidden md:flex md:flex-shrink-0">
            <Sidebar />
          </div>

          {/* Mobile sidebar (conditionally rendered) */}
          <MobileSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

          {/* Main content area */}
          <div className="flex flex-col flex-1 overflow-hidden">
            
            {/* Header */}
            <header className="relative z-10 flex-shrink-0 flex h-16 bg-card border-b border-border">
              <button
                type="button"
                className="px-4 border-r border-border text-muted-foreground focus:outline-none md:hidden"
                onClick={() => setIsSidebarOpen(true)}
              >
                <span className="sr-only">Open sidebar</span>
                <Menu className="h-6 w-6" aria-hidden="true" />
              </button>
              <Header />
            </header>

            {/* Page Content */}
            <main className="flex-1 relative overflow-y-auto focus:outline-none p-4 sm:p-6 lg:p-8">
              {children}
            </main>
          </div>

        </div>
      </SyncProvider>
    </BrandingProvider>
  );
}