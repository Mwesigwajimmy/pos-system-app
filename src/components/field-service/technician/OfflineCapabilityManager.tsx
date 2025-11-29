'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Wifi, WifiOff, RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react';
import { syncOfflineChanges, OfflineAction } from '@/lib/actions/technician';
import toast from 'react-hot-toast';

interface TenantContext {
  tenantId: string;
}

export default function OfflineCapabilityManager({ tenant }: { tenant: TenantContext }) {
  const [isOnline, setIsOnline] = useState(true);
  const [queueCount, setQueueCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  // Helper to read queue
  const getLocalQueue = (): OfflineAction[] => {
    try {
      const stored = localStorage.getItem('field_service_sync_queue');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  };

  // Helper to save queue
  const setLocalQueue = (queue: OfflineAction[]) => {
    localStorage.setItem('field_service_sync_queue', JSON.stringify(queue));
    setQueueCount(queue.length);
    // Dispatch event so other components know queue changed
    window.dispatchEvent(new Event('storage'));
  };

  // --- THE REAL SYNC LOGIC ---
  const performSync = async () => {
    const queue = getLocalQueue();
    if (queue.length === 0) return;

    setIsSyncing(true);
    const toastId = toast.loading('Syncing offline data...');

    try {
      // 1. Send entire queue to server
      const results = await syncOfflineChanges(queue, tenant.tenantId);

      // 2. Identify Successful IDs
      const successfulIds = new Set(
        results.filter(r => r.success).map(r => r.id)
      );

      // 3. Filter Queue: KEEP items that are NOT in the success list
      const remainingQueue = queue.filter(item => !successfulIds.has(item.id));

      // 4. Update Local Storage with only failed items
      setLocalQueue(remainingQueue);

      // 5. Reporting
      const successCount = successfulIds.size;
      const failCount = results.length - successCount;

      if (failCount === 0) {
        toast.success(`Synced ${successCount} items successfully!`, { id: toastId });
      } else {
        toast.error(
          `Synced ${successCount} items. ${failCount} failed and remain in queue. Check data.`, 
          { id: toastId, duration: 5000 }
        );
        console.error("Failed items:", results.filter(r => !r.success));
      }

    } catch (error) {
      toast.error("Critical Sync Error. Server unreachable.", { id: toastId });
    } finally {
      setIsSyncing(false);
    }
  };

  // Listeners for network status
  useEffect(() => {
    setIsOnline(typeof navigator !== 'undefined' ? navigator.onLine : true);
    setQueueCount(getLocalQueue().length);

    const handleOnline = () => {
      setIsOnline(true);
      toast.success("Connection restored. Attempting auto-sync...");
      performSync();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast('You are offline. Actions will be queued.', { icon: '📡' });
    };

    const handleStorageChange = () => {
      setQueueCount(getLocalQueue().length);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('storage', handleStorageChange); // Listen for queue updates from Dashboard

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  return (
    <Card className={`border-l-4 ${isOnline ? 'border-l-green-500' : 'border-l-red-500'} shadow-sm`}>
      <CardHeader className="pb-2 py-3">
        <CardTitle className="flex justify-between items-center text-sm font-semibold">
          <div className="flex items-center gap-2">
            {isOnline ? <Wifi className="h-4 w-4 text-green-600" /> : <WifiOff className="h-4 w-4 text-red-600" />}
            {isOnline ? "System Online" : "Offline Mode"}
          </div>
          <Badge variant={queueCount > 0 ? "secondary" : "outline"} className="text-xs">
            Queue: {queueCount}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="py-2 pb-3">
        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            {queueCount === 0 ? (
              <span className="flex items-center gap-1 text-green-600"><CheckCircle className="h-3 w-3" /> All data synced</span>
            ) : (
              <span className="flex items-center gap-1 text-orange-600 font-medium">
                <AlertTriangle className="h-3 w-3" /> {queueCount} actions pending upload
              </span>
            )}
          </div>

          {queueCount > 0 && isOnline && (
            <Button 
              size="sm" 
              variant="default" 
              className="h-7 text-xs"
              onClick={performSync} 
              disabled={isSyncing}
            >
              <RefreshCw className={`mr-2 h-3 w-3 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? "Syncing..." : "Sync Now"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}