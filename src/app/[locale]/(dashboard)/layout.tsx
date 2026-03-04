'use client';

import React, { memo, ReactNode, useState, useEffect } from 'react';
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

// --- IDENTITY & AI PROVIDERS ---
import { BusinessProvider, useBusiness } from '@/context/BusinessContext';
import { GlobalCopilotProvider, useCopilot } from '@/context/CopilotContext';

import { usePathname } from 'next/navigation';

/**
 * --- SOVEREIGN LIVE GUARD ---
 * Listens for forensic anomalies triggered by backend SQL functions.
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

/**
 * --- THE AI TOGGLE BUTTON ---
 * FIXED: Uses the 'togglePanel' function from our upgraded context.
 */
const CopilotToggleButton = () => {
    // We use the context handlers we verified in the backend audit
    const { togglePanel, isOpen, isReady } = useCopilot();

    // Only show the floating button once the identity handshake is 100% ready
    if (!isReady) {
        return null;
    }

    return (
        <Button
            onClick={togglePanel}
            size="icon"
            className={cn(
                "fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-2xl z-50 transition-transform hover:scale-110 active:scale-95",
                isOpen ? "bg-slate-200 text-slate-900" : "bg-slate-950 text-white"
            )}
            aria-label="Toggle Aura Co-Pilot"
        >
            <Sparkles className={cn("h-6 w-6", !isOpen && "text-emerald-400 animate-pulse")} />
        </Button>
    );
}

/**
 * --- THE MAIN APPLICATION LAYOUT ---
 */
const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (isSidebarOpen) setIsSidebarOpen(false);
  }, [pathname]);

  const MobileSidebar = memo(({ isOpen, onClose }: { isOpen: boolean; onClose: () => void; }) => {
    if (!isOpen) return null;
    return (
      <div className="fixed inset-0 z-40 flex md:hidden" role="dialog" aria-modal="true">
        <div className="fixed inset-0 bg-black/60" aria-hidden="true" onClick={onClose}></div>
        <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button type="button" className="ml-1 flex items-center justify-center h-10 w-10" onClick={onClose}>
              <X className="h-6 w-6 text-white" />
            </button>
          </div>
          <Sidebar />
        </div>
      </div>
    );
  });
  MobileSidebar.displayName = 'MobileSidebar';

  return (
    <div className="flex h-screen bg-slate-50">
      <SovereignLiveGuard />
      
      <div className="hidden md:flex md:flex-shrink-0"><Sidebar /></div>
      <MobileSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      <div className="flex flex-col flex-1 overflow-hidden">
        <header className="relative z-30 flex-shrink-0 flex h-16 bg-white border-b border-slate-200">
          <button 
            type="button" 
            className="px-4 border-r md:hidden" 
            onClick={() => setIsSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
          <Header />
        </header>
        
        <main className="flex-1 relative overflow-y-auto focus:outline-none p-4 md:p-8">
            {children}
        </main>
      </div>
      
      {/* Floating AI Button */}
      <CopilotToggleButton />
    </div>
  );
}

/**
 * --- GATEKEEPER COMPONENT ---
 * Protects the UI from rendering until the Business Profile is physically resolved.
 */
const DashboardGatekeeper = ({ children }: { children: ReactNode }) => {
    const { profile, isLoading, error } = useBusiness();

    if (isLoading) {
        return (
            <div className="flex h-screen w-screen items-center justify-center bg-white">
                <div className="text-center space-y-4">
                    <Loader2 className="h-10 w-10 animate-spin text-emerald-500 mx-auto" />
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Loading Business Assets...</p>
                </div>
            </div>
        );
    }

    if (error || !profile) {
        return (
            <div className="flex h-screen w-screen items-center justify-center bg-white text-destructive p-8">
                <div className="text-center max-w-md">
                    <ShieldAlert className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <h1 className="text-xl font-black uppercase tracking-widest mb-2">Identity Blackout</h1>
                    <p className="text-xs text-slate-500 mb-6">{error || "Your business profile is physically present, but the session is disconnected. Please re-login."}</p>
                    <Button onClick={() => window.location.href = '/login'} variant="outline" className="rounded-xl">Return to Login</Button>
                </div>
            </div>
        );
    }
    
    return <AppLayout>{children}</AppLayout>;
}

/**
 * --- THE FINAL DASHBOARD LAYOUT ---
 * Correct Provider Hierarchy: Business -> AI -> UI -> Gatekeeper
 */
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

// Helper utility for class merging
function cn(...inputs: any[]) {
    return inputs.filter(Boolean).join(' ');
}