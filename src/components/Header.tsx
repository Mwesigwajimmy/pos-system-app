'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from './ui/button';
import { 
    Bell, ShieldAlert, Zap, Activity, Clock, Trash2, CheckCircle2,
    Building2, MapPin, Globe, ShieldCheck, Search as SearchIcon
} from 'lucide-react'; 
import { toast } from 'sonner';
import { Badge } from './ui/badge';
import { 
    Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription 
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from 'date-fns';
import { useBusiness } from '@/context/BusinessContext'; // UPGRADE: Identity Handshake
import { useBranding } from '@/components/core/BrandingProvider'; // UPGRADE: Identity Handshake

export default function Header() {
  const router = useRouter();
  const supabase = createClient();
  
  // --- UPGRADE: CONSUME SOVEREIGN IDENTITY ---
  const { profile } = useBusiness();
  const { branding } = useBranding();
  // -------------------------------------------

  const [urgentCount, setUrgentCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

    const channel = supabase
      .channel('tactical_comms_monitor')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'system_tactical_comms'
      }, (payload) => {
        if (payload.new.priority === 'URGENT') {
            toast.error("CRITICAL FORENSIC ALERT", {
              description: payload.new.body,
              duration: 8000,
              icon: <ShieldAlert className="text-red-500" />
            });
            setUrgentCount(prev => prev + 1);
        }
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
    setNotifications([]);
    setUrgentCount(0);
    toast.success("Intelligence feed cleared.");
  };

  return (
    <header className="flex justify-between items-center px-8 h-16 bg-white border-b w-full sticky top-0 z-50 shadow-sm">
      
      {/* --- LEFT: BROADCAST IDENTITY --- */}
      <div className="flex items-center gap-6">
        <div className="flex flex-col">
            <h2 className="text-xl font-black tracking-tighter text-slate-900 uppercase italic leading-none">
                {branding?.company_name_display || "Sovereign OS"}
            </h2>
            <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest px-2 py-0 border-blue-100 text-blue-600 bg-blue-50/50">
                    {profile?.role || "Administrator"}
                </Badge>
                <div className="h-1 w-1 rounded-full bg-slate-300" />
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                    <MapPin size={10} className="text-red-500" /> HQ / Entebbe
                </span>
            </div>
        </div>
        
        {urgentCount > 0 && (
          <Badge variant="destructive" className="animate-pulse flex items-center gap-2 font-black px-4 py-1.5 text-[10px] uppercase tracking-[0.2em] rounded-full shadow-lg shadow-red-100">
            <ShieldAlert size={14} />
            {urgentCount} FORENSIC BREACH DETECTED
          </Badge>
        )}
      </div>

      {/* --- RIGHT: COMMAND & INTEL --- */}
      <div className="flex items-center gap-4">
        
        {/* Quick System Status */}
        <div className="hidden lg:flex items-center gap-4 mr-4 border-r pr-6 border-slate-100">
            <div className="text-right">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Global Currency</p>
                <p className="text-xs font-black text-slate-800 uppercase tracking-tighter tabular-nums">
                    {branding?.currency_code || "UGX"}
                </p>
            </div>
            <div className="h-8 w-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:text-blue-600 transition-colors cursor-help">
                <Globe size={16} />
            </div>
        </div>

        {/* --- SYSTEM INTELLIGENCE FEED --- */}
        <Sheet>
          <SheetTrigger asChild>
            <div className="relative group p-2.5 rounded-2xl bg-slate-50 hover:bg-white transition-all cursor-pointer border border-transparent hover:border-slate-200 hover:shadow-xl">
                <Bell className={`w-5 h-5 transition-colors ${urgentCount > 0 ? "text-red-600 animate-bounce" : "text-slate-500"}`} />
                {urgentCount > 0 && (
                  <span className="absolute top-2 right-2 w-3 h-3 bg-red-600 rounded-full border-2 border-white shadow-sm" />
                )}
            </div>
          </SheetTrigger>
          <SheetContent className="w-[400px] sm:w-[540px] p-0 flex flex-col border-l-8 border-l-slate-900 shadow-2xl">
            <SheetHeader className="p-8 bg-slate-900 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5 rotate-12">
                  <ShieldAlert size={120} />
              </div>
              <div className="flex justify-between items-center relative z-10">
                <div className="space-y-1.5">
                    <SheetTitle className="text-white flex items-center gap-3 uppercase tracking-tighter text-2xl font-black italic">
                        <Zap className="h-6 w-6 text-emerald-400 fill-current" />
                        System Intelligence
                    </SheetTitle>
                    <SheetDescription className="text-blue-400 text-[10px] font-black uppercase tracking-[0.3em]">
                        Live Sovereign Guard Telemetry Node
                    </SheetDescription>
                </div>
                <Button variant="ghost" size="icon" onClick={clearNotifications} className="text-slate-400 hover:text-red-400 hover:bg-white/10 rounded-full h-10 w-10">
                    <Trash2 size={20} />
                </Button>
              </div>
            </SheetHeader>

            <ScrollArea className="flex-1 px-8 py-6 bg-white">
              <div className="space-y-6">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-40 text-slate-400 animate-pulse">
                        <Activity className="animate-spin mb-3 h-8 w-8" />
                        <span className="text-[11px] font-black uppercase tracking-[0.4em]">Syncing Neural Core...</span>
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-center">
                        <div className="w-20 h-20 bg-emerald-50 rounded-[2rem] flex items-center justify-center text-emerald-500 mb-6">
                            <CheckCircle2 size={40} />
                        </div>
                        <p className="text-sm font-black text-slate-900 uppercase tracking-[0.2em]">Zero Threat Protocol</p>
                        <p className="text-[11px] text-slate-400 mt-1 font-medium">The master ledger is mathematically sealed and compliant.</p>
                    </div>
                ) : (
                    notifications.map((n) => (
                        <div key={n.id} className={`p-5 rounded-[2rem] border-l-8 transition-all hover:translate-x-1 ${
                            n.priority === 'URGENT' ? "bg-red-50/50 border-red-500 shadow-md shadow-red-100/50" : "bg-slate-50 border-slate-300"
                        }`}>
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-2.5">
                                    {n.priority === 'URGENT' ? <ShieldAlert size={16} className="text-red-600" /> : <Activity size={16} className="text-slate-500" />}
                                    <span className={`text-[10px] font-black uppercase tracking-widest ${n.priority === 'URGENT' ? "text-red-700" : "text-slate-500"}`}>
                                        {n.priority === 'URGENT' ? "Forensic Violation" : "System Event"}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                                    <Clock size={12} />
                                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                                </div>
                            </div>
                            <p className="text-sm font-black text-slate-800 leading-snug">
                                {n.body}
                            </p>
                            <div className="mt-4 flex gap-2">
                                <Badge className="bg-white border-slate-200 text-[8px] font-black text-slate-400 uppercase">Audit_Locked</Badge>
                            </div>
                        </div>
                    ))
                )}
              </div>
            </ScrollArea>
            
            <div className="p-6 bg-slate-50 border-t flex justify-center border-dashed">
                <div className="flex items-center gap-3">
                    <ShieldCheck size={14} className="text-blue-600" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">
                        ISA-700 Certified Monitoring Node
                    </span>
                </div>
            </div>
          </SheetContent>
        </Sheet>

        <Button 
            onClick={handleLogout} 
            variant="outline" 
            className="font-black px-8 h-12 rounded-2xl border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all text-xs uppercase tracking-widest shadow-sm"
        >
            Terminate Session
        </Button>
      </div>
    </header>
  );
}