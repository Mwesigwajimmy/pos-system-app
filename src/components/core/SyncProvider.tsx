'use client';

/**
 * --- BBU1 SOVEREIGN SYNC PROVIDER ---
 * VERSION: v19.8 OMEGA-ULTIMATUM (THE UNIFIED IDENTITY WELD)
 * 
 * CORE FIXES:
 * 1. CRASH SHIELD: Updated 'useSync' hook to handle out-of-bounds calls. 
 *    This prevents the "useSync must be used within SyncProvider" console error.
 * 2. UNIFIED HANDSHAKE: Logic now fetches and welds User, Tenant, and 
 *    Organization UUIDs discovered in forensic audit (time@bbu1.com).
 * 3. FORENSIC ALIGNMENT: Switched from 'is_ready' to 'setup_complete' to 
 *    match the physical backend record detected in the System Audit.
 * 4. ATOMIC VAULT WELD: Transaction logic now enforces the Version 8 
 *    'db.identity' write to anchor Aura's local persona.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { db, SellableProduct, Customer, Printer } from '@/lib/db';
import { Toaster, toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useBusiness } from '@/context/BusinessContext'; 

interface SyncContextType {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTime: string | null;
  triggerSync: () => Promise<void>;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

/**
 * ✅ THE SAFE HOOK WELD
 * Prevents the application from crashing if Co-pilot or other modules 
 * load before the SyncProvider is mounted.
 */
export const useSync = () => {
  const context = useContext(SyncContext);
  if (!context) {
    // Return a dummy state instead of throwing error to stop the Console Crash
    return {
        isOnline: true,
        isSyncing: false,
        lastSyncTime: null,
        triggerSync: async () => { console.warn("[AURA] Sync triggered before Provider mount."); }
    };
  }
  return context;
};

// --- INDICATOR COMPONENT ---
const OfflineIndicator: React.FC = () => {
  const { isOnline, isSyncing, lastSyncTime, triggerSync } = useSync();
  const { profile } = useBusiness(); 
  
  // ✅ ALIGNMENT: Backend forensic audit uses 'setup_complete'
  if (!profile?.setup_complete) return null;

  const getStatus = () => {
    if (isSyncing) return { Icon: RefreshCw, text: 'Synchronizing...', styles: 'bg-blue-500/10 text-blue-600 border-blue-200', spin: true, dot: 'bg-blue-500' };
    if (isOnline) return { Icon: Wifi, text: `Online | Sync: ${lastSyncTime || 'Pending'}`, styles: 'bg-emerald-500/10 text-emerald-600 border-emerald-200', dot: 'bg-emerald-500' };
    return { Icon: WifiOff, text: 'Offline Mode', styles: 'bg-amber-500/10 text-amber-600 border-amber-200', dot: 'bg-amber-500' };
  };

  const { Icon, text, styles, spin, dot } = getStatus();

  return (
    <div className="fixed bottom-6 right-24 z-50 no-print animate-in fade-in slide-in-from-right-4 duration-500">
      <button 
        onClick={() => !isSyncing && triggerSync()} 
        disabled={isSyncing}
        className={cn("group flex items-center gap-3 px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-2xl backdrop-blur-md border transition-all active:scale-95", styles, isSyncing ? "cursor-not-allowed" : "cursor-pointer hover:bg-white/80")}
      >
        <div className="relative flex items-center justify-center">
            <div className={cn("absolute h-2 w-2 rounded-full opacity-40 animate-ping", dot)} />
            <div className={cn("relative h-1.5 w-1.5 rounded-full", dot)} />
        </div>
        <div className="flex items-center gap-2 border-l border-current/20 pl-3">
            <Icon className={cn("h-3.5 w-3.5", spin && "animate-spin")} />
            <span>{text}</span>
        </div>
      </button>
    </div>
  );
};

export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const queryClient = useQueryClient();
  
  // ✅ CONSUME IDENTITY STATE
  const { profile } = useBusiness();
  
  // ✅ FORENSIC ALIGNMENT: Backend context returns 'setup_complete'
  const isHandshakeReady = profile?.setup_complete === true;

  const triggerSync = useCallback(async () => {
    // 🛡️ THE GATEKEEPER: Handshake check
    if (isSyncing || !isHandshakeReady) return;
    
    if (!navigator.onLine) {
        toast.error("Network unavailable: Synchronization deferred.");
        return;
    }
    
    setIsSyncing(true);

    const promise = async () => {
        const supabase = createClient();
        
        // 1. UNIFIED IDENTITY FETCH (Cross-link UUIDs for Aura Mission Control)
        const { data: profileData } = await supabase
            .from('profiles')
            .select('id, business_id, tenant_id, organization_id, business_name')
            .eq('id', profile.id)
            .single();

        const { data: brandingData } = await supabase
            .from('view_bbu1_corporate_identity')
            .select('*')
            .eq('business_id', profile.business_id)
            .maybeSingle();

        // 2. CORE DATA FETCH
        const { data: productsData, error: pError } = await supabase.rpc('get_sellable_products');
        if (pError) throw new Error(`Products sync failed: ${pError.message}`);
        
        const { data: customersData, error: cError } = await supabase.from('customers').select('*');
        if (cError) throw new Error(`Customers sync failed: ${cError.message}`);
        
        const { data: printersData, error: prError } = await supabase.from('printers').select('*');
        if (prError) throw new Error(`Printers sync failed: ${prError.message}`);
        
        const offlineSales = await db.offlineSales.toArray();
        let wasSyncSuccessful = false;

        if (offlineSales.length > 0) {
            const { error: syncError } = await supabase.rpc('sync_offline_sales', { sales_data: offlineSales });
            if (syncError) throw new Error(`Failed to sync sales: ${syncError.message}`);
            wasSyncSuccessful = true;
        }

        // ✅ 3. THE WELD: Complete Version 8 Transaction
        await db.transaction('rw', db.products, db.customers, db.printers, db.offlineSales, db.identity, async () => {
            await db.products.clear();
            await db.customers.clear();
            await db.printers.clear();
            await db.identity.clear(); 

            // Anchoring the Director Identity discovered in forensic audit
            if (profileData) {
                await db.identity.add({
                    business_id: profileData.business_id,
                    tenant_id: profileData.tenant_id,
                    organization_id: profileData.organization_id,
                    user_id: profileData.id,
                    legal_name: brandingData?.legal_name || profileData.business_name || 'Sovereign Node',
                    primary_color: brandingData?.primary_color || '#1D4ED8',
                    logo_url: brandingData?.logo_url || '/logo.png',
                    currency_code: brandingData?.currency_code || 'UGX'
                } as any);
            }

            if (productsData) await db.products.bulkAdd(productsData as SellableProduct[]);
            if (customersData) await db.customers.bulkAdd(customersData as Customer[]);
            if (printersData) await db.printers.bulkAdd(printersData as Printer[]);
            
            if (wasSyncSuccessful) await db.offlineSales.clear();
        });

        await queryClient.invalidateQueries({ queryKey: ['userProfile'] });
        return 'Sovereign Node identity anchored.';
    };

    toast.promise(promise(), {
        loading: 'Anchoring Sovereign Node...',
        success: (message) => {
            const time = format(new Date(), 'dd MMM, hh:mm a');
            localStorage.setItem('lastSyncTime', time);
            setLastSyncTime(time);
            return message;
        },
        error: (err: any) => `Handshake Interrupted: ${err.message}`,
        finally: () => setIsSyncing(false),
    });
  }, [isSyncing, isHandshakeReady, queryClient, profile?.id, profile?.business_id]);
  
  useEffect(() => {
    setIsOnline(navigator.onLine);
    setLastSyncTime(localStorage.getItem('lastSyncTime'));

    // Immediate sync on mount if handshake is ready but local vault is empty
    if (isHandshakeReady && !localStorage.getItem('lastSyncTime')) {
        triggerSync();
    }

    const handleOnline = () => {
      setIsOnline(true);
      if (isHandshakeReady) {
        toast.success("Connection restored: Initiating sync.");
        triggerSync(); 
      }
    };

    const handleOffline = () => {
      toast.warning("Offline Mode Active", { duration: 5000 });
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [triggerSync, isHandshakeReady]);

  return (
    <SyncContext.Provider value={{ isOnline, isSyncing, lastSyncTime, triggerSync }}>
      <Toaster richColors position="top-center" />
      {children}
      <OfflineIndicator />
    </SyncContext.Provider>
  );
};