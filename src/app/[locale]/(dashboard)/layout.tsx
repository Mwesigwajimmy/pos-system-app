'use client';

/**
 * --- BBU1 SOVEREIGN DASHBOARD LAYOUT ---
 * VERSION: v28.1 OMEGA-ULTIMATUM (THE STABILIZED ANCHOR)
 * JURISDICTION: Multi-Tenant / Multi-Sector / Global ERP
 * 
 * CORE ARCHITECTURAL FIXES:
 * 1. REDIRECT LOOP PREVENTION: Added strict path-equivalence checks to ensure 
 *    router.push() never fires if the browser is already at the destination.
 * 2. LOCALE SEGMENT PROTECTION: Hardened locale extraction logic to prevent 
 *    pathnames like "/dashboard" from being treated as locales, which creates 
 *    recursive "URL stacking" loops.
 * 3. IDENTITY SYNCHRONIZATION: The redirection logic now strictly waits for 
 *    'profile.is_active' to be true, preventing premature redirects during 
 *    the neural handshake loading state.
 * 4. ROUTE NORMALIZATION: Uses .startsWith() and segment splitting for more 
 *    reliable path detection than fuzzy .includes() checks.
 */

import React, { memo, ReactNode, useEffect, useMemo } from 'react';
import { 
  Menu, X, Sparkles, Loader2, 
  ShieldAlert, Activity
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
 */
const MobileSidebar = memo(({ isOpen, onClose }: { isOpen: boolean; onClose: () => void; }) => {
    return (
      <AnimatePresence mode="wait">
        {isOpen && (
          <div className="fixed inset-0 z-[200] flex lg:hidden" role="dialog" aria-modal="true">
            <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[190]" 
                onClick={onClose} 
            />
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
    const supabase = useMemo(() => createClient(), []); 
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
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;
    if (isMobile) setIsSidebarOpen(true);
  }, [setIsSidebarOpen]);

  useEffect(() => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;
    if (isSidebarOpen && isMobile) setIsSidebarOpen(false);
  }, [pathname, setIsSidebarOpen]);

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden" style={{ '--brand-primary': primaryColor } as React.CSSProperties}>
      <SovereignLiveGuard />
      <div className="hidden lg:flex lg:flex-shrink-0 border-r border-slate-100 shadow-sm">
        <Sidebar />
      </div>
      <MobileSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <header className="relative z-[100] flex-shrink-0 flex h-20 bg-white/80 backdrop-blur-md border-b border-slate-200/60 shadow-sm">
          <button type="button" className="relative z-[110] px-8 border-r border-slate-100 text-slate-500 lg:hidden hover:bg-slate-50 transition-all cursor-pointer" onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleSidebar(); }}>
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
 * 🛡️ The Identity Sentinel (FIXED DEEPLY TO KILL REDIRECT LOOPS)
 */
const DashboardGatekeeper = ({ children }: { children: ReactNode }) => {
    const { profile, isLoading: isBusinessLoading, error } = useBusiness();
    const { isLoading: isBrandingLoading } = useBranding();
    const pathname = usePathname();
    const router = useRouter();

    /**
     * ✅ DEEP HANDSHAKE VERIFICATION
     */
    const identityIsVerified = !!profile?.business_id && profile?.is_active === true;

    useEffect(() => {
        // Only run redirection logic if we have a verified, active profile and loading has finished
        if (profile && !isBusinessLoading && !isBrandingLoading && profile.is_active === true) {
            
            // 1. SAFELY IDENTIFY LOCALE
            // We split segments and ensure the first segment isn't a known system route to avoid /dashboard/dashboard loops
            const segments = pathname.split('/').filter(Boolean);
            const firstSegment = segments[0] || 'en';
            const locale = ['dashboard', 'welcome', 'auth', 'api'].includes(firstSegment) ? 'en' : firstSegment;

            // 2. DEFINE TARGETS
            const welcomeTarget = `/${locale}/welcome`;
            const dashboardTarget = `/${locale}/dashboard`;

            // 3. STABILIZED CHECK (Segment-aware instead of fuzzy .includes)
            const isOnWelcome = segments.some(s => s === 'welcome');
            const isOnDashboard = segments.some(s => s === 'dashboard');

            // 4. DEEP REDIRECT LOGIC WITH "SAME-PATH" GUARDS
            if (profile.setup_complete === false && !isOnWelcome) {
                // Only push if we aren't already at the target to prevent "Too Many Redirects"
                if (pathname !== welcomeTarget) {
                    router.replace(welcomeTarget);
                }
            } else if (profile.setup_complete === true && isOnWelcome) {
                // If setup is done but user is still on welcome, push to dashboard
                if (pathname !== dashboardTarget) {
                    router.replace(dashboardTarget);
                }
            }
        }
    }, [profile, isBusinessLoading, isBrandingLoading, pathname, router]);

    // Handle Loading States
    if (isBusinessLoading || isBrandingLoading || !identityIsVerified) {
        return (
            <div className="flex h-screen w-screen flex-col items-center justify-center bg-white">
                <div className="relative mb-12">
                   <Loader2 className="h-16 w-16 animate-spin text-emerald-600" />
                   <Activity className="absolute inset-0 m-auto h-6 w-6 text-emerald-500 animate-pulse" />
                </div>
                <div className="text-center space-y-2">
                   <p className="text-[11px] font-black uppercase tracking-[0.5em] text-slate-800 animate-pulse">
                       Anchoring Sovereign Node...
                   </p>
                   <p className="text-[9px] font-mono text-slate-400 uppercase tracking-widest">
                       VAULT: {profile?.business_id?.substring(0, 18) || 'CONNECTING...'}
                   </p>
                </div>
            </div>
        );
    }

    // Handle Error States
    if (error || !profile) {
        return (
            <div className="flex h-screen w-screen items-center justify-center bg-[#F8FAFC] p-4">
                <div className="text-center p-12 bg-white border border-slate-100 rounded-[4rem] shadow-2xl max-w-lg">
                    <ShieldAlert className="text-rose-500 h-16 w-16 mx-auto mb-10" />
                    <h1 className="text-2xl font-black uppercase tracking-tighter text-slate-900 leading-none">Identity Desync</h1>
                    <p className="text-slate-500 text-xs mt-4">The neural link to your vault could not be established.</p>
                    <Button onClick={() => window.location.reload()} className="h-14 mt-12 w-full rounded-3xl bg-slate-950 text-white font-black uppercase tracking-widest text-[10px] hover:bg-slate-800 transition-all">Retry Neural Handshake</Button>
                </div>
            </div>
        );
    }
    
    return <AppLayout>{children}</AppLayout>;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <BusinessProvider>
      <SyncProvider>
        <BrandingProvider>
          <GlobalCopilotProvider>
            <SidebarProvider>
              <DashboardGatekeeper>
                {children}
              </DashboardGatekeeper>
            </SidebarProvider>
          </GlobalCopilotProvider>
        </BrandingProvider>
      </SyncProvider>
    </BusinessProvider>
  );
}