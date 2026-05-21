'use client';

/**
 * --- BBU1 SOVEREIGN DASHBOARD LAYOUT ---
 * VERSION: v17.5 OMEGA-ULTIMATUM (THE SOVEREIGN SHIELD)
 * JURISDICTION: Multi-Tenant / Multi-Sector / Global ERP
 * 
 * CORE UPGRADES:
 * 1. MOBILE SIDEBAR WELD: Physically fixed the "White Screen" bug on small screens. 
 *    The MobileSidebar now uses a 'force-visible' wrapper to override internal 
 *    hidden classes, ensuring the menu appears on all phones.
 * 2. IDENTITY GATEKEEPER: Hard-welded the v17.0 OMEGA 'is_ready' signal into the 
 *    DashboardGatekeeper. This prevents Aura from stalling by ensuring the UI 
 *    only renders when the Handshake is 100% physically complete.
 * 3. REAL-TIME FORENSICS: Maintained the SovereignLiveGuard to detect anomalies 
 *    for specific business nodes.
 * 4. PNL & BILLING INTEGRITY: 100% of the subscription logic for Samuel Oyat 
 *    is preserved and reinforced with the new context standard.
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

// ✅ MASTER CONTEXT IMPORTS
import { BusinessProvider, useBusiness } from '@/context/BusinessContext';
import { GlobalCopilotProvider, useCopilot } from '@/context/CopilotContext';

import { usePathname, useRouter } from 'next/navigation';

/**
 * SOVEREIGN LIVE GUARD
 * Monitors the vault for anomalies in real-time.
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
 * OMEGA COPILOT TRIGGER
 * Fully aligned with the v17.0 Sanctuary readiness.
 */
const CopilotToggleButton = ({ brandColor }: { brandColor: string }) => {
    const { toggleCopilot, isOpen, isReady } = useCopilot();

    // Physically hide button if Identity is not yet Saturated
    if (!isReady) return null;

    return (
        <Button
            onClick={toggleCopilot}
            size="icon"
            style={{ backgroundColor: brandColor }} 
            className="fixed bottom-6 right-6 h-16 w-16 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.4)] z-50 transition-all hover:scale-110 active:scale-95 text-white border-none group"
            aria-label={isOpen ? "Close AI Co-Pilot" : "Open AI Co-Pilot"}
        >
            <div className="relative">
                <Sparkles className="h-7 w-7 group-hover:rotate-12 transition-transform" />
                <div className="absolute inset-0 bg-white blur-xl opacity-0 group-hover:opacity-20 transition-opacity" />
            </div>
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

  /**
   * ✅ MOBILE SIDEBAR WELD (The Fix for the White Screen)
   * We wrap the Sidebar in a div that forces 'block' display to ensure 
   * internal media queries in the Sidebar component don't hide it.
   */
  const MobileSidebar = memo(({ isOpen, onClose }: { isOpen: boolean; onClose: () => void; }) => {
    if (!isOpen) return null;
    return (
      <div className="fixed inset-0 z-[100] flex md:hidden" role="dialog" aria-modal="true">
        {/* Backdrop */}
        <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm" 
            onClick={onClose} 
        />
        
        {/* Sidebar Container */}
        <motion.div 
            initial={{ x: '-100%' }} 
            animate={{ x: 0 }} 
            className="relative flex-1 flex flex-col max-w-[280px] w-full bg-white shadow-2xl overflow-hidden"
        >
          <div className="absolute top-2 right-2 z-50">
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl" onClick={onClose}>
              <X className="h-6 w-6 text-slate-400" />
            </Button>
          </div>
          
          {/* ✅ FORCE VISIBILITY WELD */}
          <div className="flex-1 overflow-y-auto [&>div]:!flex">
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
      
      {/* Desktop Sidebar */}
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
 * UPGRADE: v17.0 OMEGA (IDENTITY HANDSHAKE GUARD)
 */
const DashboardGatekeeper = ({ children }: { children: ReactNode }) => {
    const { profile, isLoading: isBusinessLoading, error } = useBusiness();
    const { isLoading: isBrandingLoading } = useBranding();
    const pathname = usePathname();
    const router = useRouter();

    // --- AUTOMATED SUBSCRIPTION ENFORCEMENT ---
    useEffect(() => {
        if (profile && !isBusinessLoading && !isBrandingLoading) {
            
            const rawStatus = profile.subscription_status || '';
            const status = rawStatus.toLowerCase().trim();
            
            // Wait for physical DB value
            if (status === "" && !profile.is_ready) return;

            const isAuthorized = ['trial', 'active', 'free', 'completed', 'lifetime'].includes(status);
            
            const locale = pathname.split('/')[1] || 'en';
            const isOnBillingPath = pathname.includes('/settings/billing');
            const isCallbackPage = pathname.includes('/settings/billing/callback');
            const isOnWelcomePage = pathname.includes('/welcome');
            const isSetupComplete = profile.setup_complete;
            
            // THE SMART REDIRECTION ENGINE (v17.0 WELDED)
            if (!isAuthorized && !isOnBillingPath && !isCallbackPage) {
                router.push(`/${locale}/settings/billing`);
            } 
            else if (isAuthorized && isOnBillingPath && !isCallbackPage) {
                const target = isSetupComplete ? `/${locale}/dashboard` : `/${locale}/welcome`;
                router.push(target);
            }
            else if (isAuthorized && isSetupComplete && isOnWelcomePage) {
                router.push(`/${locale}/dashboard`);
            }
            else if (isAuthorized && !isSetupComplete && !isOnWelcomePage && !isCallbackPage && !isOnBillingPath) {
                router.push(`/${locale}/welcome`);
            }
        }
    }, [profile, isBusinessLoading, isBrandingLoading, pathname, router]);

    // --- THE STABILITY SHIELD (Handshake Awareness) ---
    if (isBusinessLoading || isBrandingLoading || (!profile?.is_ready && !error)) {
        return (
            <div className="flex h-screen w-screen flex-col items-center justify-center bg-white">
                <div className="relative">
                    <div className="absolute inset-0 rounded-full bg-emerald-500/10 blur-2xl animate-pulse" />
                    <Loader2 className="h-16 w-16 animate-spin text-emerald-500 relative z-10" />
                </div>
                <div className="text-center mt-8 space-y-2">
                    <p className="text-[11px] font-black uppercase tracking-[0.5em] text-slate-800 animate-pulse">
                        Authenticating Sovereign Node...
                    </p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                       Elite 1024-dim Identity Handshake
                    </p>
                </div>
            </div>
        );
    }

    // --- ERROR RECOVERY UI ---
    if (error || !profile) {
        return (
            <div className="flex h-screen w-screen items-center justify-center bg-slate-50 p-6">
                <div className="text-center p-12 bg-white border border-slate-100 rounded-[4rem] shadow-2xl max-w-lg">
                    <div className="w-24 h-24 bg-rose-50 rounded-[2rem] flex items-center justify-center mx-auto mb-10 shadow-inner">
                        <ShieldAlert className="text-rose-500 h-12 w-12" />
                    </div>
                    <h1 className="text-3xl font-black uppercase tracking-tighter text-slate-950 leading-none">Identity Desync Detected</h1>
                    <p className="text-slate-500 mt-6 font-medium leading-relaxed text-sm">
                        The Sovereign Gate was unable to verify your Director ID for this vault. This usually happens during high-speed sector transitions.
                    </p>
                    <div className="flex flex-col gap-4 mt-12">
                        <Button onClick={() => window.location.reload()} variant="outline" className="h-14 rounded-3xl font-black uppercase tracking-[0.2em] text-[10px] border-slate-200 hover:bg-slate-50">
                            Force Neural Re-Sync
                        </Button>
                        <Button onClick={() => window.location.href = '/login'} className="h-14 bg-slate-950 hover:bg-black text-white rounded-3xl font-black uppercase tracking-[0.2em] text-[10px] shadow-xl">
                            Authorize New Session
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