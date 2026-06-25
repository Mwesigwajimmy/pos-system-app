'use client';

/**
 * --- BBU1 SOVEREIGN DASHBOARD LAYOUT ---
 * VERSION: v29.1 OMEGA-ULTIMATUM (CLEAN ARCHITECTURE)
 * JURISDICTION: Multi-Tenant / Multi-Sector / Global ERP
 * 
 * CORE ARCHITECTURAL FIXES:
 * 1. CLEAN-STATE WELD: Removed redundant mobile effects. The Sidebar component 
 *    is now "Self-Aware" and manages its own viewport logic.
 * 2. COMMAND CENTER PROTECTION: Explicitly preserved segments for Architects
 *    to prevent locale-stacking loops.
 * 3. BILLING NEUTRALITY: Maintained total "Redirect Silence" for active billing 
 *    sessions to allow Middleware priority.
 * 4. HYDRATION GUARD: Unified state management within the SidebarProvider to 
 *    prevent the "White Space" flash.
 */

import React, { memo, ReactNode, useEffect, useMemo, useState } from 'react';
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
import { GlobalCopilotProvider, useCopilot } from '@/context/CopilotContext'; // RESTORED: Corrected import path
import { SidebarProvider, useSidebar } from '@/context/SidebarContext'; 

// REDIRECTION & ROUTING
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

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
 * 🛡️ The Structural Frame (Clean Version)
 */
const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const { toggleSidebar } = useSidebar();
  const { branding } = useBranding(); 
  const primaryColor = branding?.primary_color || '#1D4ED8'; 

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden" style={{ '--brand-primary': primaryColor } as React.CSSProperties}>
      <SovereignLiveGuard />
      
      {/* 
          CLEAN WELD: Only one Sidebar is rendered. 
          The Sidebar component internally handles its 'fixed' vs 'sticky' positioning.
      */}
      <Sidebar />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* 
            FIX: Added overflow-hidden to prevent header items from spilling into the dashboard.
            FIX: Adjusted z-index to [50] so Sidebar (z-100) overlays it correctly on mobile.
        */}
        <header className="relative z-[50] flex-shrink-0 flex items-center h-16 bg-white/80 backdrop-blur-md border-b border-slate-200/60 shadow-sm overflow-hidden">
          {/* MOBILE TRIGGER FIX: Reduced padding and locked to h-full for vertical alignment */}
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
          
          {/* THE HEADER CONTENT: Now properly positioned inside the layout row */}
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

    /**
     * ✅ DEEP HANDSHAKE VERIFICATION
     */
    const identityIsVerified = !!profile?.business_id && profile?.is_active === true;

    useEffect(() => {
        if (!isClient || !profile || isBusinessLoading || isBrandingLoading || !profile.is_active) return;
            
        // 1. HARDENED LOCALE DETECTION
        const segments = pathname.split('/').filter(Boolean);
        const firstSegment = segments[0] || 'en';
        
        const systemSegments = ['dashboard', 'welcome', 'auth', 'api', 'command-center', 'settings', 'billing'];
        const locale = systemSegments.includes(firstSegment) ? 'en' : firstSegment;

        // 2. PATH STATUS MAP
        const isOnWelcome = segments.includes('welcome');
        
        // FIX: Broadened billing detection to ensure total neutrality for both root-level and nested billing paths
        const isOnBilling = segments.includes('billing') || segments.includes('settings'); 
        
        const isOnCommandCenter = segments.includes('command-center');
        
        // 3. ARCHITECT DETECTION
        const isArchitect = profile.user_role === 'architect' || profile.user_role === 'commander';
        const homeTarget = isArchitect ? `/${locale}/command-center` : `/${locale}/dashboard`;
        const welcomeTarget = `/${locale}/welcome`;

        /**
         * 🛡️ THE DEEP REDIRECT LOCK
         * APEX FIX: Strictly enforce absolute silence if the user is in a billing flow
         * to prevent the "Ping-Pong" loop with the Middleware.
         */
        if (isOnBilling || (isArchitect && isOnCommandCenter)) {
            return; 
        }

        // 4. SETUP ENFORCEMENT
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

    // Handle Loading
    if (!isClient || isBusinessLoading || isBrandingLoading || !identityIsVerified) {
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

    // Handle Errors
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