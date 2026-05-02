'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from './ui/button';
import { 
    Bell, ShieldAlert, Zap, Activity, Clock, Trash2, CheckCircle2,
    Building2, MapPin, Globe, ShieldCheck, Search as SearchIcon, Plus,
    Wifi
} from 'lucide-react'; 
import { toast } from 'sonner';
import { Badge } from './ui/badge';
import { 
    Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription 
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from 'date-fns';
import { useBusiness } from '@/context/BusinessContext'; 
import { useBranding } from '@/components/core/BrandingProvider'; 
import { useTenant } from '@/hooks/useTenant';

export default function Header() {
  const router = useRouter();
  const supabase = createClient();
  
  const { profile } = useBusiness();
  const { branding } = useBranding();
  const { data: tenant } = useTenant();

  const businessName = tenant?.business_display_name || 
                       branding?.company_name_display || 
                       profile?.business_name || 
                       "Sovereign Node";

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
            toast.error("Urgent System Alert", {
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
    toast.success("Notification feed cleared.");
  };

  return (
    <header className="flex justify-between items-center px-10 h-24 bg-white border-b border-slate-100 w-full sticky top-0 z-50 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.03)]">
      
      {/* --- LEFT: DYNAMIC OPERATOR IDENTITY --- */}
      <div className="flex items-center gap-12">
        <div className="flex flex-col min-w-[240px]">
            <div className="flex items-center gap-3">
                <h1 className="text-xl font-black tracking-tighter text-slate-900 uppercase">
                    {profile?.full_name || "Authorized Operator"}
                </h1>
                <div className="flex items-center gap-1.5 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[8px] font-black text-emerald-700 uppercase tracking-widest">Active</span>
                </div>
            </div>
            
            <div className="flex items-center gap-3 mt-1.5">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                    {profile?.role || "System Admin"}
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight flex items-center gap-1">
                    <Building2 size={12} className="text-slate-300" /> 
                    {businessName}
                </span>
            </div>
        </div>

        {/* --- SEARCH BAR TERMINAL --- */}
        <div className="relative hidden xl:block group">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
            <input 
                type="text" 
                placeholder="Query system records or node identifiers..."
                className="pl-12 pr-6 py-3 w-[450px] text-xs bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:bg-white focus:border-blue-200 transition-all font-bold uppercase tracking-wider shadow-inner"
            />
        </div>
      </div>

      {/* --- RIGHT: ACTIONS & METRICS --- */}
      <div className="flex items-center gap-6">
        
        {/* Reporting Currency Node */}
        <div className="hidden lg:flex items-center gap-4 pr-8 border-r border-slate-100">
            <div className="text-right">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">Accounting Node</p>
                <p className="text-sm font-black text-slate-900 tabular-nums tracking-tighter mt-1">
                    {tenant?.reporting_currency || branding?.currency_code || "UGX"} ISO-4217
                </p>
            </div>
            <div className="h-12 w-12 rounded-[1.25rem] bg-slate-900 flex items-center justify-center text-blue-400 shadow-xl shadow-slate-200 border border-slate-800">
                <Globe size={20} />
            </div>
        </div>

        {/* --- NOTIFICATION CENTER --- */}
        <div className="flex items-center gap-2">
            <Sheet>
            <SheetTrigger asChild>
                <button className="relative p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200/50 transition-all cursor-pointer group active:scale-95 shadow-sm">
                    <Bell className={`w-5 h-5 transition-transform group-hover:rotate-12 ${urgentCount > 0 ? "text-blue-600 animate-pulse" : "text-slate-400"}`} />
                    {urgentCount > 0 && (
                    <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
                    )}
                </button>
            </SheetTrigger>
            <SheetContent className="w-[480px] p-0 flex flex-col shadow-2xl border-l border-slate-200 bg-white">
                <SheetHeader className="p-10 border-b border-slate-50">
                <div className="flex justify-between items-center">
                    <div>
                        <SheetTitle className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Command Feed</SheetTitle>
                        <SheetDescription className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-2">
                            Tactical System Communications
                        </SheetDescription>
                    </div>
                    <Button variant="ghost" size="icon" onClick={clearNotifications} className="h-12 w-12 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all">
                        <Trash2 size={22} />
                    </Button>
                </div>
                </SheetHeader>

                <ScrollArea className="flex-1 px-10 py-8 bg-slate-50/30">
                <div className="space-y-6">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-24 text-slate-300">
                            <Activity className="animate-spin mb-6 h-10 w-10 text-blue-600" />
                            <span className="text-[10px] font-black uppercase tracking-[0.5em] animate-pulse">Syncing Communication Hub...</span>
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-40 text-center">
                            <div className="w-20 h-20 bg-white border border-slate-100 rounded-[2.5rem] flex items-center justify-center text-emerald-500 mb-8 shadow-xl shadow-slate-200/50">
                                <CheckCircle2 size={40} />
                            </div>
                            <p className="text-sm font-black text-slate-900 uppercase tracking-widest">Nodes Operational: Normal</p>
                            <p className="text-[11px] text-slate-400 font-bold mt-3 uppercase tracking-tighter">No telemetry alerts in the current buffer.</p>
                        </div>
                    ) : (
                        notifications.map((n) => (
                            <div key={n.id} className="p-6 bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:border-blue-100 transition-all duration-300 group">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`h-2 w-2 rounded-full ${n.priority === 'URGENT' ? 'bg-red-500 animate-ping' : 'bg-blue-400'}`} />
                                        <Badge variant={n.priority === 'URGENT' ? "destructive" : "secondary"} className="text-[9px] px-3 py-1 font-black rounded-lg uppercase tracking-widest border-none">
                                            {n.priority === 'URGENT' ? "CRITICAL ALERT" : "LOG ENTRY"}
                                        </Badge>
                                    </div>
                                    <div className="text-[9px] text-slate-300 font-black uppercase tracking-widest group-hover:text-blue-400 transition-colors">
                                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                                    </div>
                                </div>
                                <p className="text-[13px] text-slate-600 font-bold leading-relaxed">
                                    {n.body}
                                </p>
                            </div>
                        ))
                    )}
                </div>
                </ScrollArea>
                
                <div className="p-8 bg-white border-t border-slate-50 flex flex-col items-center gap-4">
                    <div className="flex items-center gap-4 text-slate-400">
                        <ShieldCheck size={18} className="text-blue-600/40" />
                        <span className="text-[10px] font-black uppercase tracking-[0.4em]">
                            Authoritative End-to-End Encryption
                        </span>
                    </div>
                    <p className="text-[8px] font-bold text-slate-300 uppercase tracking-widest">Engine Version 10.5.24-Stable</p>
                </div>
            </SheetContent>
            </Sheet>

            {/* --- AUTHORITATIVE SIGN OUT --- */}
            <Button 
                onClick={handleLogout} 
                className="bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-[0.2em] px-10 h-14 rounded-2xl flex items-center gap-4 text-[10px] shadow-2xl shadow-blue-600/30 transition-all active:scale-95 border border-blue-500"
            >
                <Zap size={16} className="fill-white" />
                Kill Session
            </Button>
        </div>
      </div>
    </header>
  );
}