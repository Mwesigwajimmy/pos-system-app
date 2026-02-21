'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from './ui/button';
import { 
    Bell, ShieldAlert, Zap, Activity, Clock, Trash2, CheckCircle2 
} from 'lucide-react'; 
import { toast } from 'sonner';
import { Badge } from './ui/badge';
import { 
    Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription 
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from 'date-fns';

export default function Header() {
  const router = useRouter();
  const supabase = createClient();
  
  const [urgentCount, setUrgentCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. Initial Load: Fetch existing alerts from the Tactical Comms table
  const fetchAlerts = async () => {
    const { data } = await supabase
      .from('system_tactical_comms')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (data) {
        setNotifications(data);
        const pending = data.filter(n => n.priority === 'URGENT').length;
        setUrgentCount(pending);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAlerts();

    // 2. Real-time Monitor: Listens for forensic triggers (trg_ledger_forensics)
    const channel = supabase
      .channel('tactical_comms_monitor')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'system_tactical_comms'
      }, (payload) => {
        // Immediate UI Toast
        if (payload.new.priority === 'URGENT') {
            toast.error("CRITICAL FORENSIC ALERT", {
              description: payload.new.body,
              duration: 8000,
              icon: <ShieldAlert className="text-red-500" />
            });
            setUrgentCount(prev => prev + 1);
        }
        
        // Update local list
        setNotifications(prev => [payload.new, ...prev]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const clearNotifications = async () => {
    // Logic for marking all as read or deleting
    setNotifications([]);
    setUrgentCount(0);
    toast.success("Intelligence feed cleared.");
  };

  return (
    <header className="flex justify-between items-center p-4 bg-white border-b w-full sticky top-0 z-50">
      <div className="flex items-center gap-4">
        <h2 className="text-xl font-bold tracking-tight text-slate-800">Dashboard</h2>
        
        {urgentCount > 0 && (
          <Badge variant="destructive" className="animate-pulse flex items-center gap-1.5 font-black px-3 py-1 text-[10px] uppercase tracking-widest">
            <ShieldAlert size={12} />
            {urgentCount} Forensic Breach Detected
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-3">
        
        {/* --- SYSTEM INTELLIGENCE FEED (The Bell Fix) --- */}
        <Sheet>
          <SheetTrigger asChild>
            <div className="relative group p-2 rounded-full hover:bg-slate-50 transition-all cursor-pointer mr-2 border border-transparent hover:border-slate-200">
                <Bell className={`w-5 h-5 transition-colors ${urgentCount > 0 ? "text-red-600 animate-bounce" : "text-slate-400"}`} />
                {urgentCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-600 rounded-full border-2 border-white shadow-sm" />
                )}
            </div>
          </SheetTrigger>
          <SheetContent className="w-[400px] sm:w-[540px] p-0 flex flex-col border-l-4 border-l-primary/20">
            <SheetHeader className="p-6 bg-slate-900 text-white">
              <div className="flex justify-between items-center">
                <div className="space-y-1">
                    <SheetTitle className="text-white flex items-center gap-2 uppercase tracking-tighter text-xl">
                        <Zap className="h-5 w-5 text-emerald-400 fill-current" />
                        System Intelligence
                    </SheetTitle>
                    <SheetDescription className="text-slate-400 text-xs font-mono uppercase">
                        Live Sovereign Guard Telemetry
                    </SheetDescription>
                </div>
                <Button variant="ghost" size="icon" onClick={clearNotifications} className="text-slate-400 hover:text-white hover:bg-white/10">
                    <Trash2 size={18} />
                </Button>
              </div>
            </SheetHeader>

            <ScrollArea className="flex-1 px-6 py-4">
              <div className="space-y-4">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-40 text-slate-400 animate-pulse">
                        <Activity className="animate-spin mb-2" />
                        <span className="text-[10px] font-bold uppercase">Syncing Neural Core...</span>
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-center opacity-30">
                        <CheckCircle2 size={48} className="mb-4 text-emerald-500" />
                        <p className="text-sm font-bold uppercase tracking-widest">No Active Threats</p>
                        <p className="text-[10px]">Your ledger is mathematically sealed.</p>
                    </div>
                ) : (
                    notifications.map((n) => (
                        <div key={n.id} className={`p-4 rounded-xl border-l-4 transition-all hover:shadow-md ${
                            n.priority === 'URGENT' ? "bg-red-50 border-red-500" : "bg-slate-50 border-slate-300"
                        }`}>
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2">
                                    {n.priority === 'URGENT' ? <ShieldAlert size={14} className="text-red-600" /> : <Activity size={14} className="text-slate-500" />}
                                    <span className={`text-[10px] font-black uppercase tracking-widest ${n.priority === 'URGENT' ? "text-red-700" : "text-slate-500"}`}>
                                        {n.priority === 'URGENT' ? "Forensic Violation" : "System Event"}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1 text-[9px] text-slate-400 font-mono">
                                    <Clock size={10} />
                                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                                </div>
                            </div>
                            <p className="text-sm font-medium text-slate-800 leading-tight">
                                {n.body}
                            </p>
                        </div>
                    ))
                )}
              </div>
            </ScrollArea>
            
            <div className="p-4 bg-slate-50 border-t flex justify-center">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.3em]">
                   ISA-700 Certified Monitoring
                </span>
            </div>
          </SheetContent>
        </Sheet>

        <Button onClick={handleLogout} variant="destructive" className="font-bold shadow-lg shadow-red-100">
            Logout
        </Button>
      </div>
    </header>
  );
}