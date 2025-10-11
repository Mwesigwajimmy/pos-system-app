'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { SyncProvider } from "@/components/core/SyncProvider";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (isSidebarOpen) {
      setIsSidebarOpen(false);
    }
  }, [pathname]);

  return (
    <SyncProvider>
      <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
        
        <div className="hidden md:flex md:flex-shrink-0">
          <Sidebar />
        </div>

        {isSidebarOpen && (
          <div className="fixed inset-0 z-40 flex md:hidden" role="dialog" aria-modal="true">
            <div className="fixed inset-0 bg-black/60" aria-hidden="true" onClick={() => setIsSidebarOpen(false)}></div>
            <div className="relative flex-1 flex flex-col max-w-xs w-full bg-card">
              <div className="absolute top-0 right-0 -mr-12 pt-2">
                <button
                  type="button"
                  className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                  onClick={() => setIsSidebarOpen(false)}
                >
                  <span className="sr-only">Close sidebar</span>
                  <X className="h-6 w-6 text-white" aria-hidden="true" />
                </button>
              </div>
              <Sidebar />
            </div>
          </div>
        )}

        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="relative z-30 flex-shrink-0 flex h-16 bg-card border-b border-border">
            <button
              type="button"
              className="px-4 border-r border-border text-muted-foreground focus:outline-none md:hidden"
              onClick={() => setIsSidebarOpen(true)}
            >
              <span className="sr-only">Open sidebar</span>
              <Menu className="h-6 w-6" aria-hidden="true" />
            </button>
            <Header />
          </div>
          <main className="flex-1 relative overflow-y-auto focus:outline-none p-4 md:p-6 lg:p-8">
            {children}
          </main>
        </div>

      </div>
    </SyncProvider>
  );
}