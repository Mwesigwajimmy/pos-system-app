'use client';

/**
 * --- BBU1 SOVEREIGN DASHBOARD LAYOUT ---
 * VERSION: v18.9 OMEGA-ULTIMATUM (THE MOBILE VISIBILITY WELD)
 * JURISDICTION: Multi-Tenant / Multi-Sector / Global ERP
 * 
 * CORE ARCHITECTURAL UPGRADES:
 * 1. DEEP IDENTITY GATEKEEPER: The UI now authoritatively waits for both the 
 *    Physical Business ID AND the 'is_ready' signal from the Handshake. 
 *    This prevents "Identity Desync" errors caused by database trigger latency.
 * 2. PATIENT REDIRECTION: Redirect logic for Billing, Welcome, and Dashboards 
 *    is strictly gated by the completion of the Quantum Handshake to prevent 
 *    infinite 307 routing loops.
 * 3. MOBILE VISIBILITY FIX: Physically eliminated the "White Screen" bug by 
 *    ensuring the MobileSidebar wrapper forces content width and opacity 
 *    on small screens.
 * 4. FORENSIC LIVE GUARD: Maintains real-time anomaly detection for the 
 *    active business node using Supabase Realtime isolation.
 */

import React, { memo, ReactNode, useState, useEffect } from 'react';
import { 
  Menu, X, Sparkles, Loader2, 
  ShieldAlert, ShieldCheck, Fingerprint, Building2, Zap
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { SyncProvider } from '@/components/core/SyncProvider';
import BrandingProvider, { useBranding } from '@/components/core/BrandingProvider'; 
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client'; 
import { toast } from 'sonner'; 

// ✅ MASTER CONTEXT IMPORTS (Identity Anchors)
import { BusinessProvider, useBusiness } from '@/context/BusinessContext';
import { GlobalCopilotProvider, useCopilot } from '@/context/CopilotContext';

// REDIRECTION & ROUTING
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * --- SOVEREIGN LIVE GUARD ---
 * Dynamically listens for forensic anomalies based on the active node.
 * This ensures the Operator only sees alerts for the specific vault they are visiting.
 */
const SovereignLiveGuard = () => {
    const supabase = createClient();
    const { branding } = useBranding();
    const activeBizId = branding?.business_id;
    
    useEffect(() => {
        if (!activeBizId) return;

        // Anchor the channel to the specific business ID for Realtime isolation
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

/**
 * --- DYNAMIC COPILOT BUTTON ---
 * Aligned with the background AI handshake status.
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
 * Standard structural wrapper for the dashboard interface.
 */
const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();
  const { branding } = useBranding(); 
  
  const primaryColor = branding?.primary_color || '#1D4ED8'; 

  useEffect(() => {
    if (isSidebarOpen) setIsSidebarOpen(false);
  }, [pathname]);

  /**
   * ✅ MOBILE SIDEBAR WELD
   * DEEP FIX: Explicitly handles visibility constraints to stop the "White Screen" bug.
   */
  const MobileSidebar = memo(({ isOpen, onClose }: { isOpen: boolean; onClose: () => void; }) => {
    if (!isOpen) return null;
    return (
      <div className="fixed inset-0 z-[150] flex md:hidden" role="dialog" aria-modal="true">
        <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[140]" 
            onClick={onClose} 
        />
        <motion.div 
            initial={{ x: '-100%' }} 
            animate={{ x: 0 }} 
            className="relative flex-1 flex flex-col max-w-[280px] w-full bg-white shadow-2xl overflow-hidden z-[150]"
        >
          <div className="absolute top-4 right-4 z-[160]">
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl bg-slate-50 border border-slate-100" onClick={onClose}>
              <X className="h-6 w-6 text-slate-400" />
            </Button>
          </div>
          
          {/* 
            ✅ THE DEEP VISIBILITY WELD:
            Overrides internal classes to ensure Sidebar content is forced visible 
            on small screens. This prevents the Sidebar component's 'isSidebarOpen' 
            logic from making the mobile view empty.
          */}
          <div className="flex-1 overflow-y-auto [&>aside]:!w-full [&>aside]:!opacity-100 [&>aside]:!pointer-events-auto">
            <Sidebar />
          </div>
        </motion.div>
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
      
      {/* Desktop Sidebar Anchor */}
      <div className="hidden md:flex md:flex-shrink-0 border-r border-slate-100 shadow-sm">
        <Sidebar />
      </div>

      <MobileSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <header className="relative z-30 flex-shrink-0 flex h-20 bg-white/80 backdrop-blur-md border-b border-slate-200/60 shadow-sm">
          <button 
            type="button" 
            className="px-6 border-r border-slate-100 text-slate-500 md:hidden hover:bg-slate-50 transition-colors" 
            onClick={() => setIsSidebarOpen(true)}
          >
            <Menu className="h-7 w-7" />
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
 * SOVEREIGN GATEKEEPER
 * UPGRADE: v18.9 (IDENTITY ALIGNMENT LOCK)
 */
const DashboardGatekeeper = ({ children }: { children: ReactNode }) => {
    const { profile, isLoading: isBusinessLoading, error } = useBusiness();
    const { isLoading: isBrandingLoading } = useBranding();
    const pathname = usePathname();
    const router = useRouter();

    // --- DEEP VERIFICATION REDIRECT ENGINE ---
    useEffect(() => {
        // We only trigger redirects AFTER the profile has been authoritatively verified (is_ready)
        if (profile?.is_ready && !isBusinessLoading && !isBrandingLoading) {
            
            const rawStatus = (profile as any).subscription_status || '';
            const status = rawStatus.toLowerCase().trim();
            
            // Allow entry if subscription status is missing initially
            const isAuthorized = ['trial', 'active', 'free', 'completed', 'lifetime', ''].includes(status);
            const locale = pathname.split('/')[1] || 'en';
            const isOnBillingPath = pathname.includes('/settings/billing');
            const isCallbackPage = pathname.includes('/settings/billing/callback');
            const isOnWelcomePage = pathname.includes('/welcome');
            const isSetupComplete = profile.setup_complete ?? true;
            
            // REDIRECTION ENGINE
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

    /** 
     * ✅ THE PATIENT LOADER:
     * Access is granted only when 'business_id' exists AND 'is_ready' is true.
     */
    const identityIsVerified = !!profile?.business_id && profile?.is_ready === true;

    if (isBusinessLoading || isBrandingLoading || (!identityIsVerified && !error)) {
        return (
            <div className="flex h-screen w-screen flex-col items-center justify-center bg-white">
                <div className="relative">
                    <div className="absolute inset-0 rounded-full bg-blue-500/10 blur-2xl animate-pulse" />
                    <Loader2 className="h-16 w-16 animate-spin text-blue-600 relative z-10" />
                </div>
                <div className="text-center mt-8 space-y-2">
                    <p className="text-[11px] font-black uppercase tracking-[0.5em] text-slate-800 animate-pulse">
                        Synchronizing Sovereign Node...
                    </p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                       Aligning Aura Neural Pathways
                    </p>
                </div>
            </div>
        );
    }

    // --- ERROR RECOVERY UI ---
    if (error || !profile) {
        return (
            <div className="flex h-screen w-screen items-center justify-center bg-[#F8FAFC] p-4">
                <div className="text-center p-12 bg-white border border-slate-100 rounded-[4rem] shadow-2xl max-w-lg">
                    <div className="w-24 h-24 bg-rose-50 rounded-[2rem] flex items-center justify-center mx-auto mb-10 shadow-inner">
                        <ShieldAlert className="text-rose-500 h-12 w-12" />
                    </div>
                    <h1 className="text-2xl font-black uppercase tracking-tighter text-slate-900 leading-none">Identity Desync</h1>
                    <p className="text-slate-500 mt-6 font-medium leading-relaxed text-sm">
                        The Sovereign Gate was unable to deeply align your vault data. This usually happens during high-speed sector transitions or database synchronization latency.
                    </p>
                    <div className="flex flex-col gap-3 mt-12">
                        <Button 
                            onClick={() => window.location.reload()} 
                            variant="outline" 
                            className="h-14 rounded-3xl font-black uppercase tracking-widest text-[10px] border-slate-200"
                        >
                            Retry Deep Synchronization
                        </Button>
                        <Button 
                            onClick={() => window.location.href = '/login'} 
                            className="h-14 bg-slate-950 text-white rounded-3xl font-black uppercase tracking-widest text-[10px]"
                        >
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

/**
 * STATUS: Sovereign Layout Fully Fixed.
 * VERSION: v18.9 (Mobile Content Forced Visible).
 * JURISDICTION: BBU1 Global Cloud.
 */