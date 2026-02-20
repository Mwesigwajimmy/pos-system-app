// src/components/Header.tsx
'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from './ui/button';
import { useEffect, useState } from 'react'; // Upgrade: For real-time state
import { Bell, ShieldAlert, Fingerprint, Activity } from 'lucide-react'; // Upgrade: Forensic Icons
import { toast } from 'sonner'; // Upgrade: For Tactical Alerts
import { Badge } from './ui/badge'; // Upgrade: Visual parity

export default function Header() {
  const router = useRouter();
  const supabase = createClient();
  
  // Upgrade: Tactical Alert State
  const [urgentCount, setUrgentCount] = useState(0);

  useEffect(() => {
    /**
     * TACTICAL MONITOR UPGRADE
     * Listens for the output of 'fn_forensic_anomaly_detection'
     * specifically for URGENT ledger drift alerts.
     */
    const channel = supabase
      .channel('tactical_comms_monitor')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'system_tactical_comms',
        filter: 'priority=eq.URGENT' 
      }, (payload) => {
        // Trigger high-priority UI notification
        toast.error("CRITICAL LEDGER DRIFT", {
          description: payload.new.body,
          duration: 10000,
          icon: <ShieldAlert className="text-red-500" />
        });
        setUrgentCount(prev => prev + 1);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <header className="flex justify-between items-center p-4 bg-white border-b w-full">
      <div className="flex items-center gap-4">
        <h2 className="text-xl font-semibold">Dashboard</h2>
        
        {/* Upgrade: Autonomous Status Indicator */}
        {urgentCount > 0 && (
          <Badge variant="destructive" className="animate-pulse flex items-center gap-1.5 font-bold px-3 py-1">
            <ShieldAlert size={14} />
            {urgentCount} FORENSIC ALERT{urgentCount > 1 ? 'S' : ''}
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Upgrade: Tactical Notification Hub */}
        <div className="relative group p-2 rounded-full hover:bg-slate-50 transition-colors cursor-pointer mr-2">
            <Bell className={`w-5 h-5 ${urgentCount > 0 ? "text-red-600 animate-bounce" : "text-slate-400"}`} />
            {urgentCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-600 rounded-full border-2 border-white" />
            )}
        </div>

        <Button onClick={handleLogout} variant="destructive">Logout</Button>
      </div>
    </header>
  );
}