// src/app/[locale]/(dashboard)/layout.tsx

'use client';

import React, { memo, ReactNode } from 'react';
import { 
  Menu, X, Sparkles, Loader2, 
  ShieldAlert, Activity, Zap, Fingerprint
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { SyncProvider } from '@/components/core/SyncProvider';
import BrandingProvider from '@/components/core/BrandingProvider';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client'; 
import { toast } from 'sonner'; 

import { BusinessProvider, useBusiness } from '@/context/BusinessContext';
import { GlobalCopilotProvider, useCopilot } from '@/context/CopilotContext';

import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

/**
 * --- UPGRADE: SOVEREIGN LIVE GUARD ---
 * Listen specifically for rows inserted by SQL triggers.
 */
const SovereignLiveGuard = () => {
    const supabase = createClient();
    
    useEffect(() => {
        const channel = supabase
            .channel('sovereign_forensics')
            .on('postgres_changes', { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'sovereign_audit_anomalies' 
            }, (payload) => {
                const anomaly = payload.new;
                if (anomaly.severity === 'CRITICAL' || anomaly.severity === 'HIGH') {
                    toast.error(`AUTONOMOUS GUARD: ${anomaly.anomaly_type}`, {
                        description: anomaly.description,
                        duration: 10000,
                        icon: <ShieldAlert className="text-red-500" />
                    });
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [supabase]);

    return null;
}

const CopilotToggleButton = () => {
    const { toggleCopilot, isOpen, isReady } = useCopilot();

    if (!isReady) {
        return null;
    }
    return (
        <Button
            onClick={toggleCopilot}
            size="icon"
            className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-2xl z-50 transition-transform hover:scale-110 active:scale-95 bg-blue-600 hover:bg-blue-700 text-white"
            aria-label={isOpen ? "Close AI Co-Pilot" : "Open AI Co-Pilot"}
        >
            <Sparkles className="h-6 w-6" />
        </Button>
    );
}

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (isSidebarOpen) {
      setIsSidebarOpen(false);
    }
  }, [pathname]);

  const MobileSidebar = memo(({ isOpen, onClose }: { isOpen: boolean; onClose: () => void; }) => {
    if (!isOpen) return null;
    return (
      <div className="fixed inset-0 z-40 flex md:hidden" role="dialog" aria-modal="true">
        <div className="fixed inset-0 bg-black/60" aria-hidden="true" onClick={onClose}></div>
        {/* Mobile Sidebar Background set to white for clarity */}
        <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
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
    // Main Container background changed to light blue-slate for contrast
    <div className="flex h-screen bg-[#F8FAFC]">
      <SovereignLiveGuard />
      
      {/* Sidebar Wrapper with a thin professional border for split view */}
      <div className="hidden md:flex md:flex-shrink-0 border-r border-slate-200">
        <Sidebar />
      </div>

      <MobileSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header set to pure white to stand out from the slate background */}
        <header className="relative z-30 flex-shrink-0 flex h-16 bg-white border-b border-slate-200">
          <button type="button" className="px-4 border-r border-slate-200 text-slate-500 focus:outline-none md:hidden" onClick={() => setIsSidebarOpen(true)}>
            <span className="sr-only">Open sidebar</span>
            <Menu className="h-6 w-6" aria-hidden="true" />
          </button>
          <Header />
        </header>

        {/* Main Content Area */}
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

const DashboardGatekeeper = ({ children }: { children: ReactNode }) => {
    const { profile, isLoading, error } = useBusiness();

    if (isLoading) {
        return (
            <div className="flex h-screen w-screen items-center justify-center bg-white">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (error || !profile) {
        return (
            <div className="flex h-screen w-screen items-center justify-center bg-[#F8FAFC] text-red-600">
                <div className="text-center p-8 bg-white border border-slate-200 rounded-xl shadow-sm">
                    <h1 className="text-xl font-bold">Application Error</h1>
                    <p className="text-slate-500 mt-2">{error || "Your business profile could not be loaded. Please log in again."}</p>
                </div>
            </div>
        );
    }
    
    return <AppLayout>{children}</AppLayout>;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <BusinessProvider>
      <GlobalCopilotProvider>
        <BrandingProvider>
          <SyncProvider>
            <DashboardGatekeeper>
              {children}
            </DashboardGatekeeper>
          </SyncProvider>
        </BrandingProvider>
      </GlobalCopilotProvider>
    </BusinessProvider>
  );
}