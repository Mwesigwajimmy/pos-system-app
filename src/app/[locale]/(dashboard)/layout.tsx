'use client';

import React, { memo, ReactNode, useState, useEffect } from 'react';
import { 
  Menu, X, Sparkles, Loader2, 
  ShieldAlert, ShieldCheck, Fingerprint, Building2
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { SyncProvider } from '@/components/core/SyncProvider';
import BrandingProvider, { useBranding } from '@/components/core/BrandingProvider'; 
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client'; 
import { toast } from 'sonner'; 

import { BusinessProvider, useBusiness } from '@/context/BusinessContext';
import { GlobalCopilotProvider, useCopilot } from '@/context/CopilotContext';

import { usePathname } from 'next/navigation';

/**
 * --- UPGRADE: SOVEREIGN LIVE GUARD ---
 * Dynamically listens for forensic anomalies based on the active node.
 * This ensures Jimmy only sees alerts for the business he is currently visiting.
 */
const SovereignLiveGuard = () => {
    const supabase = createClient();
    const { branding } = useBranding();
    const activeBizId = branding?.business_id;
    
    useEffect(() => {
        if (!activeBizId) return;

        // We anchor the channel to the specific business ID to ensure 
        // Realtime isolation during an Identity Swap.
        const channel = supabase
            .channel(`sovereign_forensics_${activeBizId}`)
            .on('postgres_changes', { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'sovereign_audit_anomalies',
                filter: `business_id=eq.${activeBizId}` 
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

        return () => { 
            // Graceful cleanup during node swap
            supabase.removeChannel(channel); 
        };
    }, [supabase, activeBizId]);

    return null;
}

// --- UPGRADE: DYNAMIC COPILOT BUTTON ---
const CopilotToggleButton = ({ brandColor }: { brandColor: string }) => {
    const { toggleCopilot, isOpen, isReady } = useCopilot();

    if (!isReady) return null;

    return (
        <Button
            onClick={toggleCopilot}
            size="icon"
            style={{ backgroundColor: brandColor }} 
            className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.3)] z-50 transition-all hover:scale-110 active:scale-95 text-white border-none group"
            aria-label={isOpen ? "Close AI Co-Pilot" : "Open AI Co-Pilot"}
        >
            <Sparkles className="h-6 w-6 group-hover:rotate-12 transition-transform" />
        </Button>
    );
}

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();
  const { branding } = useBranding(); 
  
  const primaryColor = branding?.primary_color || '#1D4ED8'; 

  useEffect(() => {
    if (isSidebarOpen) setIsSidebarOpen(false);
  }, [pathname]);

  const MobileSidebar = memo(({ isOpen, onClose }: { isOpen: boolean; onClose: () => void; }) => {
    if (!isOpen) return null;
    return (
      <div className="fixed inset-0 z-50 flex md:hidden" role="dialog" aria-modal="true">
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" aria-hidden="true" onClick={onClose}></div>
        <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white shadow-2xl">
          <div className="absolute top-0 right-0 -mr-12 pt-4">
            <button type="button" className="text-white hover:rotate-90 transition-transform" onClick={onClose}>
              <X className="h-8 w-8" />
            </button>
          </div>
          <Sidebar />
        </div>
      </div>
    );
  });
  MobileSidebar.displayName = 'MobileSidebar';

  return (
    <div 
        className="flex h-screen bg-[#F8FAFC] overflow-hidden" 
        style={{ '--brand-primary': primaryColor } as React.CSSProperties}
    >
      <SovereignLiveGuard />
      
      {/* Static Sidebar for Desktop */}
      <div className="hidden md:flex md:flex-shrink-0">
        <Sidebar />
      </div>

      <MobileSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <header className="relative z-30 flex-shrink-0 flex h-16 bg-white border-b border-slate-200 shadow-sm">
          <button 
            type="button" 
            className="px-4 border-r border-slate-200 text-slate-500 md:hidden hover:bg-slate-50" 
            onClick={() => setIsSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
          <Header />
        </header>

        <main className="flex-1 relative overflow-y-auto focus:outline-none scrollbar-hide bg-slate-50/30">
          <div className="p-4 sm:p-6 lg:p-8 animate-in fade-in slide-in-from-bottom-2 duration-700">
            {children}
          </div>
        </main>
      </div>
      
      <CopilotToggleButton brandColor={primaryColor} />
    </div>
  );
}

/**
 * SOVEREIGN GATEKEEPER
 * UPGRADE: Now handles "In-Between" switch states gracefully to prevent logout loops.
 * This is the 'Stability Shield' that keeps the UI professional during node swaps.
 */
const DashboardGatekeeper = ({ children }: { children: ReactNode }) => {
    const { profile, isLoading: isBusinessLoading, error } = useBusiness();
    const { isLoading: isBrandingLoading } = useBranding();

    // --- THE STABILITY SHIELD ---
    // While the system is actively loading OR if the profile is momentarily null during a swap,
    // we show the high-end loader instead of the error screen. 
    // This prevents the system from "panicking" and forcing a logout.
    if (isBusinessLoading || isBrandingLoading || (!profile && !error)) {
        return (
            <div className="flex h-screen w-screen flex-col items-center justify-center bg-white">
                <div className="relative">
                    <div className="absolute inset-0 rounded-full bg-blue-500/10 blur-xl animate-pulse" />
                    <Loader2 className="h-12 w-12 animate-spin text-blue-600 relative z-10" />
                </div>
                <p className="mt-6 text-[10px] font-black uppercase tracking-[0.5em] text-slate-400 animate-pulse">
                    Synchronizing Sovereign Node...
                </p>
            </div>
        );
    }

    // ONLY show the error if we have finished loading and the profile is still missing/errored
    if (error || !profile) {
        return (
            <div className="flex h-screen w-screen items-center justify-center bg-[#F8FAFC] p-4">
                <div className="text-center p-10 bg-white border border-slate-100 rounded-[3rem] shadow-[0_40px_80px_-15px_rgba(0,0,0,0.1)] max-w-md">
                    <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-inner">
                        <ShieldAlert className="text-red-500 h-10 w-10" />
                    </div>
                    <h1 className="text-2xl font-black uppercase tracking-tighter text-slate-900 leading-none">Security Protocol Delay</h1>
                    <p className="text-slate-500 mt-4 font-medium leading-relaxed text-sm">
                        The system is having trouble verifying your access to this node. This may happen during high-speed identity swaps.
                    </p>
                    <div className="flex flex-col gap-3 mt-8">
                        <Button onClick={() => window.location.reload()} variant="outline" className="h-12 rounded-2xl font-bold uppercase tracking-widest text-[10px] border-slate-200">
                            Retry Synchronization
                        </Button>
                        <Button onClick={() => window.location.href = '/login'} className="h-12 bg-slate-900 hover:bg-black text-white rounded-2xl font-bold uppercase tracking-widest text-[10px]">
                            Secure Re-Login
                        </Button>
                    </div>
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