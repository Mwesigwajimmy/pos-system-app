'use client';

// 1. FIXED: Correctly import named exports from React
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { db, SellableProduct, Customer, Printer } from '@/lib/db';
import { Toaster, toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
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

const OfflineIndicator: React.FC = () => {
  const { isOnline, isSyncing, lastSyncTime, triggerSync } = useSync();
  const getStatus = () => {
    if (isSyncing) return { Icon: RefreshCw, text: 'Syncing...', color: 'text-blue-500 bg-blue-50', spin: true };
    if (isOnline) return { Icon: Wifi, text: `Online | Sync: ${lastSyncTime || 'never'}`, color: 'text-green-600 bg-green-50' };
    return { Icon: WifiOff, text: 'Offline Mode', color: 'text-orange-600 bg-orange-50' };
  };
  const { Icon, text, color, spin } = getStatus();
  return (
    <div className="fixed bottom-4 right-4 z-[100] no-print">
      <button 
        onClick={() => !isSyncing && triggerSync()} 
        disabled={isSyncing}
        className={cn("flex items-center gap-2 px-3 py-2 rounded-full text-sm font-semibold shadow-lg border transition-colors", color, isSyncing ? "cursor-not-allowed" : "cursor-pointer hover:bg-opacity-80")}
      >
        <Icon className={cn("h-4 w-4", spin && "animate-spin")} />
        <span>{text}</span>
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
        toast.error("Cannot sync while offline.");
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

        if (salesSynced > 0) return `${salesSynced} offline sale(s) were synced successfully!`;
        return 'Data is up to date!';
    };

    toast.promise(promise(), {
        loading: 'Performing a full data sync...',
        success: (message) => {
            const time = format(new Date(), 'dd MMM, hh:mm a');
            localStorage.setItem('lastSyncTime', time);
            setLastSyncTime(time);
            return message;
        },
        error: (err: any) => `Sync failed: ${err.message}. Data remains saved locally.`,
        finally: () => setIsSyncing(false),
    });
  }, [isSyncing, queryClient]);
  
  useEffect(() => {
    setIsOnline(navigator.onLine);
    setLastSyncTime(localStorage.getItem('lastSyncTime'));
    const handleOnline = () => {
      toast.success("Connection restored. Syncing data...");
      setIsOnline(true);
      triggerSync(); 
    };
    const handleOffline = () => {
      toast.warning("You are offline. Sales will be saved locally.", { duration: 5000 });
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