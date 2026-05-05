'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { db, SellableProduct, Customer, Printer } from '@/lib/db';
import { Toaster, toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { Wifi, WifiOff, RefreshCw, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface SyncContextType {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTime: string | null;
  triggerSync: () => Promise<void>;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export const useSync = () => {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSync must be used within a SyncProvider');
  }
  return context;
};

/**
 * --- UPGRADE: PROFESSIONAL ENTERPRISE INDICATOR ---
 * Moved to sit alongside the AI button without overlapping.
 * Features dynamic color switching and high-end styling.
 */
const OfflineIndicator: React.FC = () => {
  const { isOnline, isSyncing, lastSyncTime, triggerSync } = useSync();
  
  const getStatus = () => {
    if (isSyncing) return { 
        Icon: RefreshCw, 
        text: 'Synchronizing...', 
        styles: 'bg-blue-500/10 text-blue-600 border-blue-200', 
        spin: true,
        dot: 'bg-blue-500'
    };
    if (isOnline) return { 
        Icon: Wifi, 
        text: `Online | Sync: ${lastSyncTime || 'Pending'}`, 
        styles: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
        dot: 'bg-emerald-500'
    };
    return { 
        Icon: WifiOff, 
        text: 'Offline Mode', 
        styles: 'bg-amber-500/10 text-amber-600 border-amber-200',
        dot: 'bg-amber-500'
    };
  };

  const { Icon, text, styles, spin, dot } = getStatus();

  return (
    // THE FIX: Positioned bottom-right but with 'right-24' to stay clear of the AI button
    <div className="fixed bottom-6 right-24 z-50 no-print animate-in fade-in slide-in-from-right-4 duration-500">
      <button 
        onClick={() => !isSyncing && triggerSync()} 
        disabled={isSyncing}
        className={cn(
            "group flex items-center gap-3 px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-2xl backdrop-blur-md border transition-all active:scale-95", 
            styles, 
            isSyncing ? "cursor-not-allowed" : "cursor-pointer hover:bg-white/80"
        )}
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

  const triggerSync = useCallback(async () => {
    if (isSyncing) return;
    if (!navigator.onLine) {
        toast.error("Network unavailable: Synchronization deferred.");
        return;
    }
    setIsSyncing(true);

    const promise = async () => {
        const supabase = createClient();
        
        const { data: productsData, error: pError } = await supabase.rpc('get_sellable_products');
        if (pError) throw new Error(`Products sync failed: ${pError.message}`);
        const { data: customersData, error: cError } = await supabase.from('customers').select('*');
        if (cError) throw new Error(`Customers sync failed: ${cError.message}`);
        const { data: printersData, error: prError } = await supabase.from('printers').select('*');
        if (prError) throw new Error(`Printers sync failed: ${prError.message}`);
        
        const offlineSales = await db.offlineSales.toArray();
        let salesSynced = 0;
        let wasSyncSuccessful = false;

        if (offlineSales.length > 0) {
            const { error: syncError } = await supabase.rpc('sync_offline_sales', { sales_data: offlineSales });
            if (syncError) throw new Error(`Failed to sync sales: ${syncError.message}`);
            salesSynced = offlineSales.length;
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

        if (salesSynced > 0) return `${salesSynced} local transactions successfully verified and pushed.`;
        return 'Local node is synchronized with global ledger.';
    };

    toast.promise(promise(), {
        loading: 'Verifying data integrity and syncing ledger...',
        success: (message) => {
            const time = format(new Date(), 'dd MMM, hh:mm a');
            localStorage.setItem('lastSyncTime', time);
            setLastSyncTime(time);
            return message;
        },
        error: (err: any) => `Sync Interrupted: ${err.message}. Data remains secured locally.`,
        finally: () => setIsSyncing(false),
    });
  }, [isSyncing, queryClient]);
  
  useEffect(() => {
    setIsOnline(navigator.onLine);
    setLastSyncTime(localStorage.getItem('lastSyncTime'));
    const handleOnline = () => {
      toast.success("Identity Link Restored: Initiating automatic sync.");
      setIsOnline(true);
      triggerSync(); 
    };
    const handleOffline = () => {
      toast.warning("Network Link Severed: Local cache mode active.", { duration: 5000 });
      setIsOnline(false);
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [triggerSync]);

  return (
    <SyncContext.Provider value={{ isOnline, isSyncing, lastSyncTime, triggerSync }}>
      <Toaster richColors position="top-center" />
      {children}
      <OfflineIndicator />
    </SyncContext.Provider>
  );
};