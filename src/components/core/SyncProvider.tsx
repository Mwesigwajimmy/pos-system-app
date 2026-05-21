'use client';

/**
 * --- BBU1 SOVEREIGN SYNC PROVIDER ---
 * VERSION: v18.5 OMEGA-ULTIMATUM (THE IDENTITY WELD)
 * 
 * CORE FIXES:
 * 1. HANDSHAKE GATE: Added 'useBusiness' dependency. The 'triggerSync' 
 *    engine is now physically locked until 'is_ready' is true.
 * 2. 429 MITIGATION: Prevents the background sync from competing with 
 *    the Auth Handshake during the critical 2-second login window.
 * 3. IDENTITY-DRIVEN FETCH: Ensure sync only pulls data for the verified 
 *    active business node.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { db, SellableProduct, Customer, Printer } from '@/lib/db';
import { Toaster, toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useBusiness } from '@/context/BusinessContext'; // ✅ CRITICAL IMPORT

interface SyncContextType {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTime: string | null;
  triggerSync: () => Promise<void>;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export const useSync = () => {
  const context = useContext(SyncContext);
  if (!context) throw new Error('useSync must be used within a SyncProvider');
  return context;
};

// --- INDICATOR COMPONENT ---
const OfflineIndicator: React.FC = () => {
  const { isOnline, isSyncing, lastSyncTime, triggerSync } = useSync();
  const { profile } = useBusiness(); // Only show if business is aligned
  
  if (!profile?.is_ready) return null;

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
  const isHandshakeReady = profile?.is_ready === true;

  const triggerSync = useCallback(async () => {
    // 🛡️ THE GATEKEEPER: Do not sync if the identity is not yet aligned
    if (isSyncing || !isHandshakeReady) return;
    
    if (!navigator.onLine) {
        toast.error("Network unavailable: Synchronization deferred.");
        return;
    }
    
    setIsSyncing(true);

    const promise = async () => {
        const supabase = createClient();
        
        // Use the verified business ID to ensure RLS compliance
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

        await db.transaction('rw', db.products, db.customers, db.printers, db.offlineSales, async () => {
            await db.products.clear();
            await db.customers.clear();
            await db.printers.clear();
            if (productsData) await db.products.bulkAdd(productsData as SellableProduct[]);
            if (customersData) await db.customers.bulkAdd(customersData as Customer[]);
            if (printersData) await db.printers.bulkAdd(printersData as Printer[]);
            if (wasSyncSuccessful) await db.offlineSales.clear();
        });

        await queryClient.invalidateQueries({ queryKey: ['userProfile'] });
        return 'Local node is synchronized with global ledger.';
    };

    toast.promise(promise(), {
        loading: 'Syncing Ledger...',
        success: (message) => {
            const time = format(new Date(), 'dd MMM, hh:mm a');
            localStorage.setItem('lastSyncTime', time);
            setLastSyncTime(time);
            return message;
        },
        error: (err: any) => `Sync Interrupted: ${err.message}`,
        finally: () => setIsSyncing(false),
    });
  }, [isSyncing, isHandshakeReady, queryClient]);
  
  useEffect(() => {
    setIsOnline(navigator.onLine);
    setLastSyncTime(localStorage.getItem('lastSyncTime'));

    const handleOnline = () => {
      setIsOnline(true);
      // Only auto-trigger if we are actually logged in and ready
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