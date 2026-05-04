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
import { cn } from '@/lib/utils';

export default function Header() {
  const router = useRouter();
  const supabase = createClient();
  
  const { profile } = useBusiness();
  const { branding } = useBranding();
  const { data: tenant } = useTenant();

  const businessName = tenant?.business_display_name || 
                       branding?.company_name_display || 
                       profile?.business_name || 
                       "Primary Business Unit";

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
    <header className="flex justify-between items-center px-4 md:px-8 h-16 md:h-20 bg-white border-b border-slate-100 w-full sticky top-0 z-40 shadow-sm">
      
      {/* --- LEFT: OPERATOR IDENTITY --- */}
      <div className="flex items-center gap-3 md:gap-10 min-w-0">
        {/* Mobile Spacer: Provides breathing space for the sidebar toggle button on small screens */}
        <div className="lg:hidden w-10 shrink-0" aria-hidden="true" />

        <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
                <h1 className="text-sm md:text-lg font-bold tracking-tight text-slate-900 truncate max-w-[120px] md:max-w-none">
                    {profile?.full_name || "Authorized Operator"}
                </h1>
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" title="System Connected" />
            </div>
            
            <div className="flex items-center gap-2 mt-0.5 overflow-hidden">
                <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-wider text-blue-600 whitespace-nowrap">
                    {profile?.role || "System Admin"}
                </span>
                <span className="h-3 w-[1px] bg-slate-200 shrink-0" />
                <span className="text-[9px] md:text-[10px] font-medium text-slate-500 uppercase tracking-tight flex items-center gap-1 truncate">
                    <Building2 size={10} className="text-slate-400 shrink-0" /> 
                    <span className="truncate">{businessName}</span>
                </span>
            </div>
        </div>

        {/* --- SEARCH TERMINAL (Hides on mobile/tablet to prevent overlapping) --- */}
        <div className="relative hidden xl:block group">
            <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
            <input 
                type="text" 
                placeholder="Search records, accounts, or node identifiers..."
                className="pl-11 pr-6 py-2.5 w-[300px] 2xl:w-[400px] text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:bg-white focus:border-blue-200 transition-all font-medium shadow-inner"
            />
        </div>
      </div>

      {/* --- RIGHT: ACTIONS & METRICS --- */}
      <div className="flex items-center gap-2 md:gap-4 shrink-0">
        
        {/* Currency Display Node (Hides on mobile) */}
        <div className="hidden lg:flex items-center gap-3 pr-6 border-r border-slate-100">
            <div className="text-right">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Currency Node</p>
                <p className="text-sm font-bold text-slate-900 leading-none mt-1.5">
                    {tenant?.reporting_currency || branding?.currency_code || "UGX"}
                </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-500 border border-slate-200">
                <Globe size={18} />
            </div>
        </div>

        {/* --- NOTIFICATION CENTER --- */}
        <div className="flex items-center gap-2">
            <Sheet>
            <SheetTrigger asChild>
                <button className="relative p-2 md:p-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 transition-all cursor-pointer group active:scale-95">
                    <Bell className={cn("w-5 h-5", urgentCount > 0 ? "text-blue-600 animate-pulse" : "text-slate-400")} />
                    {urgentCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 md:top-2 md:right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white shadow-sm" />
                    )}
                </button>
            </SheetTrigger>
            <SheetContent className="w-full sm:w-[420px] p-0 flex flex-col shadow-2xl border-l border-slate-200 bg-white">
                <SheetHeader className="p-6 md:p-8 border-b border-slate-50">
                <div className="flex justify-between items-center">
                    <div>
                        <SheetTitle className="text-lg md:text-xl font-bold text-slate-900 uppercase tracking-tight">Notifications</SheetTitle>
                        <SheetDescription className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                            Live Telemetry & Activity Logs
                        </SheetDescription>
                    </div>
                    <Button variant="ghost" size="icon" onClick={clearNotifications} className="h-10 w-10 text-slate-300 hover:text-red-500 rounded-lg">
                        <Trash2 size={18} />
                    </Button>
                </div>
                </SheetHeader>

                <ScrollArea className="flex-1 px-6 md:px-8 py-6 bg-slate-50/30">
                <div className="space-y-4">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-300">
                            <Activity className="animate-spin mb-4 h-8 w-8 text-blue-600" />
                            <span className="text-[10px] font-bold uppercase tracking-widest">Synchronizing Hub...</span>
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-32 text-center">
                            <div className="w-16 h-16 bg-white border border-slate-200 rounded-2xl flex items-center justify-center text-emerald-500 mb-4 shadow-sm">
                                <CheckCircle2 size={28} />
                            </div>
                            <p className="text-sm font-bold text-slate-900 uppercase">Status: Nominal</p>
                            <p className="text-[11px] text-slate-500 mt-1">No alerts detected in current session.</p>
                        </div>
                    ) : (
                        notifications.map((n) => (
                            <div key={n.id} className="p-5 bg-white rounded-xl border border-slate-100 shadow-sm transition-all hover:border-blue-100">
                                <div className="flex justify-between items-start mb-3">
                                    <Badge variant={n.priority === 'URGENT' ? "destructive" : "secondary"} className="text-[8px] px-2 py-0.5 font-bold rounded-md uppercase tracking-wider">
                                        {n.priority === 'URGENT' ? "Urgent" : "Log"}
                                    </Badge>
                                    <div className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">
                                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                                    </div>
                                </div>
                                <p className="text-xs text-slate-600 font-semibold leading-relaxed">
                                    {n.body}
                                </p>
                            </div>
                        ))
                    )}
                </div>
                </ScrollArea>
                
                <div className="p-6 bg-white border-t border-slate-50 flex flex-col items-center gap-3">
                    <div className="flex items-center gap-2 text-slate-400">
                        <ShieldCheck size={14} className="text-blue-600/40" />
                        <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                            Encrypted System Node
                        </span>
                    </div>
                </div>
            </SheetContent>
            </Sheet>

            {/* --- SIGN OUT (Responsive: text hides on mobile, icon remains) --- */}
            <Button 
                onClick={handleLogout} 
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase tracking-widest px-3 md:px-6 h-10 md:h-11 rounded-xl flex items-center gap-2.5 text-[9px] md:text-[10px] shadow-md transition-all active:scale-95"
            >
                <Zap size={14} className="fill-white shrink-0" />
                <span className="hidden sm:inline">Sign Out</span>
            </Button>
        </div>
      </div>
    </header>
  );
}