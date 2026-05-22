'use client';

/**
 * --- BBU1 SOVEREIGN DASHBOARD LAYOUT ---
 * VERSION: v19.3 OMEGA-ULTIMATUM (THE ULTIMATE RESPONSE WELD)
 * JURISDICTION: Multi-Tenant / Multi-Sector / Global ERP
 * 
 * CORE ARCHITECTURAL UPGRADES:
 * 1. COMPONENT ISOLATION: Moved MobileSidebar to the module scope to prevent 
 *    React from unmounting it during state transitions.
 * 2. ANIMATION STABILITY: Hardened AnimatePresence to ensure the drawer 
 *    physically slides into the viewport on touch.
 * 3. Z-INDEX SUPREMACY: Forced the drawer to z-[200] to bypass all AI 
 *    overlays and forensic guards.
 */

import React, { memo, ReactNode, useEffect } from 'react';
import { 
  Menu, X, Sparkles, Loader2, 
  ShieldAlert
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { SyncProvider } from '@/components/core/SyncProvider';
import BrandingProvider, { useBranding } from '@/components/core/BrandingProvider'; 
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client'; 
import { toast } from 'sonner'; 

// ✅ MASTER CONTEXT IMPORTS
import { BusinessProvider, useBusiness } from '@/context/BusinessContext';
import { GlobalCopilotProvider, useCopilot } from '@/context/CopilotContext';
import { SidebarProvider, useSidebar } from '@/context/SidebarContext'; 

// REDIRECTION & ROUTING
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * --- MOBILE SIDEBAR DRAWER ---
 * DEFINED OUTSIDE TO PRESERVE STATE & FOCUS
 */
const MobileSidebar = memo(({ isOpen, onClose }: { isOpen: boolean; onClose: () => void; }) => {
    return (
      <AnimatePresence mode="wait">
        {isOpen && (
          <div className="fixed inset-0 z-[200] flex lg:hidden" role="dialog" aria-modal="true">
            {/* 🛡️ BACKDROP WELD */}
            <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[190]" 
                onClick={onClose} 
            />
            {/* 🏗️ SLIDING PANEL WELD */}
            <motion.div 
                initial={{ x: '-100%' }} 
                animate={{ x: 0 }} 
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="relative flex-1 flex flex-col max-w-[300px] w-full bg-white shadow-[20px_0_60px_rgba(0,0,0,0.2)] overflow-hidden z-[200]"
            >
              <div className="absolute top-5 right-5 z-[210]">
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-10 w-10 rounded-xl bg-slate-50 border border-slate-100 shadow-sm text-slate-400 hover:text-red-500 transition-colors" 
                    onClick={onClose}
                >
                  <X className="h-6 w-6" />
                </Button>
              </div>
              
              {/* 🟢 SIDEBAR CONTENT INJECTION */}
              <div className="flex-1 overflow-y-auto [&>aside]:!w-full [&>aside]:!opacity-100 [&>aside]:!translate-x-0 [&>aside]:!pointer-events-auto">
                <Sidebar />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    );
});
MobileSidebar.displayName = 'MobileSidebar';

/**
 * --- SOVEREIGN LIVE GUARD ---
 */
const SovereignLiveGuard = () => {
    const supabase = createClient();
    const { branding } = useBranding();
    const activeBizId = branding?.business_id;
    
    useEffect(() => {
        if (!activeBizId) return;

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

        return () => { supabase.removeChannel(channel); };
    }, [supabase, activeBizId]);

    return null;
}

/**
 * --- DYNAMIC COPILOT BUTTON ---
 */
const CopilotToggleButton = ({ brandColor }: { brandColor: string }) => {
    const { toggleCopilot, isOpen, isReady, isLoading } = useCopilot();

    return (
        <Button
            onClick={toggleCopilot}
            size="icon"
            style={{ backgroundColor: brandColor }} 
            className="fixed bottom-6 right-6 h-16 w-16 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.4)] z-50 transition-all hover:scale-110 active:scale-95 text-white border-none group"
            aria-label={isOpen ? "Close AI Co-Pilot" : "Open AI Co-Pilot"}
        >
            <div className="relative">
                {isLoading && !isReady ? (
                    <Loader2 className="h-7 w-7 animate-spin text-white/50" />
                ) : (
                    <Sparkles className="h-7 w-7 group-hover:rotate-12 transition-transform" />
                )}
                <div className="absolute inset-0 bg-white blur-xl opacity-0 group-hover:opacity-20 transition-opacity" />
            </div>
        </Button>
    );
}

/**
 * --- APPLAYOUT ---
 */
const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const { isSidebarOpen, toggleSidebar, setIsSidebarOpen } = useSidebar();
  const pathname = usePathname();
  const { branding } = useBranding(); 
  
  const primaryColor = branding?.primary_color || '#1D4ED8'; 

  useEffect(() => {
    if (isSidebarOpen && typeof window !== 'undefined' && window.innerWidth < 1024) {
        setIsSidebarOpen(false);
    }
  }, [pathname, setIsSidebarOpen]);

  return (
    <div 
        className="flex h-screen bg-[#F8FAFC] overflow-hidden" 
        style={{ '--brand-primary': primaryColor } as React.CSSProperties}
    >
      <SovereignLiveGuard />
      
      {/* Desktop Sidebar Anchor */}
      <div className="hidden lg:flex lg:flex-shrink-0 border-r border-slate-100 shadow-sm">
        <Sidebar />
      </div>

      {/* 🟢 MOBILE DRAWER WELD: Now using isolated component for state stability */}
      <MobileSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <header className="relative z-[100] flex-shrink-0 flex h-20 bg-white/80 backdrop-blur-md border-b border-slate-200/60 shadow-sm">
          {/* ✅ THE ACTIVATION WELD: Aggressive touch area and Z-Index isolation */}
          <button 
            type="button" 
            className="relative z-[110] px-6 border-r border-slate-100 text-slate-500 lg:hidden hover:bg-slate-50 active:bg-slate-200 transition-all cursor-pointer" 
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleSidebar(); // Dispatch to Global Sidebar State
            }}
          >
            <Menu className="h-8 w-8" />
          </button>
          <Header />
        </header>

        <main className="flex-1 relative overflow-y-auto focus:outline-none bg-slate-50/40">
          <div className="p-4 sm:p-8 lg:p-10 animate-in fade-in slide-in-from-bottom-3 duration-1000">
            {children}
          </div>
        </main>
      </div>
      
      <CopilotToggleButton brandColor={primaryColor} />
    </div>
  );
}

/**
 * --- SOVEREIGN GATEKEEPER ---
 */
const DashboardGatekeeper = ({ children }: { children: ReactNode }) => {
    const { profile, isLoading: isBusinessLoading, error } = useBusiness();
    const { isLoading: isBrandingLoading } = useBranding();
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        if (profile?.is_ready && !isBusinessLoading && !isBrandingLoading) {
            const rawStatus = (profile as any).subscription_status || '';
            const status = rawStatus.toLowerCase().trim();
            const isAuthorized = ['trial', 'active', 'free', 'completed', 'lifetime', ''].includes(status);
            const locale = pathname.split('/')[1] || 'en';
            const isOnBillingPath = pathname.includes('/settings/billing');
            const isCallbackPage = pathname.includes('/settings/billing/callback');
            const isOnWelcomePage = pathname.includes('/welcome');
            const isSetupComplete = profile.setup_complete ?? true;
            
            if (!isAuthorized && !isOnBillingPath && !isCallbackPage) {
                router.push(`/${locale}/settings/billing`);
            } 
            else if (isAuthorized && isOnBillingPath && !isCallbackPage) {
                const targetPath = isSetupComplete ? `/${locale}/dashboard` : `/${locale}/welcome`;
                router.push(targetPath);
            }
            else if (isAuthorized && isSetupComplete && isOnWelcomePage) {
                router.push(`/${locale}/dashboard`);
            }
            else if (isAuthorized && !isSetupComplete && !isOnWelcomePage && !isCallbackPage && !isOnBillingPath) {
                router.push(`/${locale}/welcome`);
            }
        }
    }, [profile, isBusinessLoading, isBrandingLoading, pathname, router]);

    const identityIsVerified = !!profile?.business_id && profile?.is_ready === true;

    if (isBusinessLoading || isBrandingLoading || (!identityIsVerified && !error)) {
        return (
            <div className="flex h-screen w-screen flex-col items-center justify-center bg-white">
                <Loader2 className="h-16 w-16 animate-spin text-blue-600 mb-8" />
                <p className="text-[11px] font-black uppercase tracking-[0.5em] text-slate-800 animate-pulse">
                    Synchronizing Sovereign Node...
                </p>
            </div>
        );
    }

    if (error || !profile) {
        return (
            <div className="flex h-screen w-screen items-center justify-center bg-[#F8FAFC] p-4">
                <div className="text-center p-12 bg-white border border-slate-100 rounded-[4rem] shadow-2xl max-w-lg">
                    <ShieldAlert className="text-rose-500 h-16 w-16 mx-auto mb-10" />
                    <h1 className="text-2xl font-black uppercase tracking-tighter text-slate-900 leading-none">Identity Desync</h1>
                    <Button onClick={() => window.location.reload()} variant="outline" className="h-14 mt-12 rounded-3xl font-black uppercase tracking-widest text-[10px]">
                        Retry Sync
                    </Button>
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
        <SidebarProvider>
            <BrandingProvider>
                <SyncProvider>
                    <DashboardGatekeeper>
                    {children}
                    </DashboardGatekeeper>
                </SyncProvider>
            </BrandingProvider>
        </SidebarProvider>
      </GlobalCopilotProvider>
    </BusinessProvider>
  );
}