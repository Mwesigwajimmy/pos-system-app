'use client';

/**
 * --- BBU1 SOVEREIGN DASHBOARD LAYOUT ---
 * VERSION: v29.3 OMEGA-ULTIMATUM (ENTERPRISE MASTER)
 * JURISDICTION: Multi-Tenant / Multi-Sector / Global ERP
 * 
 * CORE ARCHITECTURAL FIXES:
 * 1. FORENSIC LOADER WELD: Professional enterprise logo (80px) with 
 *    full signal breathing animation and 32-tagline rotating registry.
 * 2. REDIRECT STABILIZATION: Hardened the Gatekeeper to prevent accidental 
 *    logouts during data re-hydration.
 * 3. NETWORK GUARD: Integrated real-time offline listeners to trigger 
 *    public/offline.html overlay instantly.
 * 4. STRUCTURE PRESERVATION: 100% maintenance of existing logic and providers.
 */

import React, { memo, ReactNode, useEffect, useMemo, useState, useCallback } from 'react';
import { 
  Menu, X, Sparkles, Loader2, 
  ShieldAlert, Activity, Wifi, Globe
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
 * --- PROFESSIONAL BBU1 FORENSIC LOADER ---
 * Logic: Cycles through the full 32-point enterprise tagline registry.
 * Aesthetic: Professional 80px footprint for enterprise standard.
 */
const BBU1ForensicLoader = ({ businessId }: { businessId?: string }) => {
    const [taglineIndex, setTaglineIndex] = useState(0);
    const [opacity, setTaglineOpacity] = useState(1);

    const taglines = [
        "Preparing your all-in-one business OS...",
        "Unifying accounting, CRM, HR and inventory in one place.",
        "Aura AI is warming up to watch your cash flow 24/7.",
        "Tip: Aura can flag anomalies before they become problems.",
        "Bank-level encryption keeps every transaction locked down.",
        "Your data stays safe with row-level, multi-tenant security.",
        "Tip: BBU1 keeps working even when the internet doesn't.",
        "Offline mode syncs automatically the moment you're back online.",
        "From a single shop to a global enterprise, BBU1 scales with you.",
        "Tip: Ask Aura 'What were my best sellers last week?'",
        "Multi-currency accounting for businesses without borders.",
        "Automated invoicing means you get paid faster.",
        "Tip: Set reorder points and never run out of stock again.",
        "Real-time dashboards turn your data into decisions.",
        "One login. Every department. Zero spreadsheets.",
        "Tip: Aura automates up to 90% of your bookkeeping.",
        "Payroll, leave, and recruitment, all handled in one HR suite.",
        "Tip: Build custom workflows without writing a line of code.",
        "Track every shilling, dollar, or euro across every branch.",
        "Tip: Barcode scanning speeds up receiving and dispatch.",
        "Your sales pipeline, support tickets, and campaigns, unified.",
        "Tip: Generate a full Profit & Loss statement in one click.",
        "Compliance built in, from GDPR to local tax authorities.",
        "Tip: Role-based access keeps sensitive data need-to-know.",
        "Point of Sale that keeps selling, even offline.",
        "Tip: Reconcile bank transactions automatically, no spreadsheets.",
        "Manufacturing, retail, healthcare, or NGOs, BBU1 fits your industry.",
        "Tip: Track batches and serial numbers for full traceability.",
        "Aura predicts revenue trends before they happen.",
        "Tip: Client portals keep your customers in the loop.",
        "Almost there, your business command center is loading...",
        "Good things take a moment, great insights are worth the wait."
    ];

    useEffect(() => {
        const interval = setInterval(() => {
            setTaglineOpacity(0);
            setTimeout(() => {
                setTaglineIndex((prev) => (prev + 1) % taglines.length);
                setTaglineOpacity(1);
            }, 500);
        }, 3200);
        return () => clearInterval(interval);
    }, [taglines.length]);

    return (
        <div className="flex h-screen w-screen flex-col items-center justify-center bg-white z-[9999] fixed inset-0">
            <style jsx>{`
                .loader-container { 
                    position: relative; 
                    width: 160px; 
                    height: 160px; 
                    display: flex; 
                    justify-content: center; 
                    align-items: center; 
                }
                .logo-img { 
                    width: 80px; /* Reduced to professional enterprise proportions */
                    height: 80px; 
                    object-fit: contain; 
                    z-index: 10; 
                    animation: breathe 2.4s infinite ease-in-out; 
                    user-select: none;
                }
                .signal-ring { 
                    position: absolute; 
                    width: 80px; 
                    height: 80px; 
                    border: 2px solid rgba(0, 0, 255, 0.4); 
                    border-radius: 50%; 
                    z-index: 1; 
                    animation: signalOut 2.4s infinite cubic-bezier(0.25, 0.1, 0.25, 1); 
                }
                .delay-1 { animation-delay: 0.8s; }
                .delay-2 { animation-delay: 1.6s; }

                @keyframes breathe { 
                    0%, 100% { transform: scale(1); } 
                    50% { transform: scale(1.06); } 
                }
                @keyframes signalOut { 
                    0% { transform: scale(0.8); opacity: 0.8; } 
                    100% { transform: scale(2.8); opacity: 0; } 
                }
            `}</style>

            <div className="loader-container">
                <div className="signal-ring"></div>
                <div className="signal-ring delay-1"></div>
                <div className="signal-ring delay-2"></div>
                <img src="/logo.png" alt="BBU1 Logo" className="logo-img" />
            </div>

            <p className="mt-14 text-[9px] font-black uppercase tracking-[0.6em] text-blue-600/30 animate-pulse">
                System Syncing
            </p>

            <div className="mt-6 min-h-[40px] max-w-md px-10 text-center transition-all duration-500" style={{ opacity }}>
                <p className="text-sm font-semibold text-[#0b6c89] leading-relaxed">
                    {taglines[taglineIndex]}
                </p>
            </div>

            <div className="absolute bottom-10 opacity-20 flex flex-col items-center gap-2">
                <div className="h-0.5 w-8 bg-slate-400 rounded-full" />
                <span className="text-[8px] font-black uppercase tracking-widest text-slate-900">
                    Vault: {businessId?.substring(0, 12) || 'Handshake'}
                </span>
            </div>
        </div>
    );
}

/**
 * --- SOVEREIGN LIVE GUARD ---
 * 🛡️ The Sentinel: Now equipped with the Global Edge Bridge & Offline Monitor
 */
const SovereignLiveGuard = () => {
    const supabase = useMemo(() => createClient(), []); 
    const { branding } = useBranding();
    const activeBizId = branding?.business_id;
    const [isEdgeActive, setIsEdgeActive] = useState(false);
    const [isOffline, setIsOffline] = useState(false);

    /**
     * 🔐 APEX EDGE HANDSHAKE
     */
    const performEdgeSync = useCallback(async (anomalyData: any) => {
        try {
            const forensicSignature = btoa(`bbu1-handshake-${Date.now()}`);
            const { data, error } = await supabase.functions.invoke('sovereign-global-gatekeeper', {
                body: {
                    action: 'SECURE_SYNC',
                    internalKey: 'BBU1_OMEGA_PROTOCOL_99',
                    payload: anomalyData
                },
                headers: {
                    'x-sovereign-signature': forensicSignature
                }
            });
            if (error) throw error;
        } catch (err) {
            console.error("[SOVEREIGN ERROR]: Edge Tunnel instability detected.");
        }
    }, [supabase]);

    useEffect(() => {
        // --- 📡 NETWORK STATE HANDLERS ---
        const handleOffline = () => setIsOffline(true);
        const handleOnline = () => setIsOffline(false);

        window.addEventListener('offline', handleOffline);
        window.addEventListener('online', handleOnline);

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
            .subscribe(async (status) => {
                if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                    setIsEdgeActive(true);
                    await performEdgeSync({
                        anomaly_type: 'CONNECTIVITY_FAILOVER',
                        description: `Regional firewall detected. Edge tunnel established for biz: ${activeBizId}`,
                        severity: 'LOW'
                    });
                }
                if (status === 'SUBSCRIBED') {
                    setIsEdgeActive(false);
                }
            });

        return () => { 
            supabase.removeChannel(channel); 
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('online', handleOnline);
        };
    }, [supabase, activeBizId, performEdgeSync]);

    if (isOffline) {
        return (
            <div className="fixed inset-0 z-[10000] bg-white">
                <iframe src="/offline.html" className="w-full h-full border-none" title="Offline" />
            </div>
        );
    }

    return isEdgeActive ? (
        <div className="fixed top-2 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none">
            <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full backdrop-blur-xl animate-pulse">
                <Globe className="h-3 w-3 text-emerald-500" />
                <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">Edge Bridge Active</span>
            </div>
        </div>
    ) : null;
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
 * 🛡️ The Structural Frame (Clean Version)
 */
const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const { toggleSidebar } = useSidebar();
  const { branding } = useBranding(); 
  const primaryColor = branding?.primary_color || '#1D4ED8'; 

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden" style={{ '--brand-primary': primaryColor } as React.CSSProperties}>
      <SovereignLiveGuard />
      
      <Sidebar />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <header className="relative z-[50] flex-shrink-0 flex items-center h-16 bg-white/80 backdrop-blur-md border-b border-slate-200/60 shadow-sm overflow-hidden">
          <button 
            type="button" 
            className="relative z-[110] h-full px-4 border-r border-slate-100 text-slate-500 lg:hidden hover:bg-slate-50 transition-all cursor-pointer flex items-center justify-center shrink-0" 
            onClick={(e) => { 
                e.preventDefault(); 
                e.stopPropagation(); 
                toggleSidebar();
            }}
          >
            <Menu className="h-6 w-6" />
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
 * 🛡️ The Identity Sentinel (STRICT JURISDICTION)
 */
const DashboardGatekeeper = ({ children }: { children: ReactNode }) => {
    const { profile, isLoading: isBusinessLoading, error } = useBusiness();
    const { isLoading: isBrandingLoading } = useBranding();
    const pathname = usePathname();
    const router = useRouter();
    const [isClient, setIsClient] = useState(false);

    useEffect(() => { setIsClient(true); }, []);

    // HYDRATION GUARD: waits for profile data to be definitively loaded or failed
    const identityIsVerified = !!profile?.business_id && profile?.is_active === true;

    useEffect(() => {
        // Redirection stabilization: ensure we only redirect when data is ready
        if (!isClient || !profile || isBusinessLoading || isBrandingLoading || !profile.is_active) return;
            
        const segments = pathname.split('/').filter(Boolean);
        const firstSegment = segments[0] || 'en';
        
        const systemSegments = ['dashboard', 'welcome', 'auth', 'api', 'command-center', 'settings', 'billing'];
        const locale = systemSegments.includes(firstSegment) ? 'en' : firstSegment;

        const isOnWelcome = segments.includes('welcome');
        const isOnBilling = segments.includes('billing') || segments.includes('settings'); 
        const isOnCommandCenter = segments.includes('command-center');
        
        const isArchitect = profile.user_role === 'architect' || profile.user_role === 'commander';
        const homeTarget = isArchitect ? `/${locale}/command-center` : `/${locale}/dashboard`;
        const welcomeTarget = `/${locale}/welcome`;

        if (isOnBilling || (isArchitect && isOnCommandCenter)) {
            return; 
        }

        if (profile.setup_complete === false && !isOnWelcome) {
            if (pathname !== welcomeTarget) {
                router.replace(welcomeTarget);
            }
        } else if (profile.setup_complete === true && isOnWelcome) {
            if (pathname !== homeTarget) {
                router.replace(homeTarget);
            }
        }
        
    }, [profile, isBusinessLoading, isBrandingLoading, pathname, router, isClient]);

    // ✅ INTEGRATED PROFESSIONAL LOADER (v18.7 OMEGA)
    if (!isClient || isBusinessLoading || isBrandingLoading || !identityIsVerified) {
        return <BBU1ForensicLoader businessId={profile?.business_id} />;
    }

    if (error || !profile) {
        return (
            <div className="flex h-screen w-screen items-center justify-center bg-[#F8FAFC] p-4 text-center">
                <div className="p-12 bg-white border border-slate-100 rounded-[4rem] shadow-2xl max-w-lg">
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