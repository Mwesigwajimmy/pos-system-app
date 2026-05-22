'use client';

/**
 * --- BBU1 SOVEREIGN HEADER ---
 * VERSION: v19.5 OMEGA-ULTIMATUM (THE IDENTITY WELD)
 * 
 * CORE ARCHITECTURAL UPGRADES:
 * 1. ZERO-OVERLAP WELD: Eliminated redundant height and positioning logic 
 *    that caused identity collisions on small screens.
 * 2. RESPONSIVE ACTION BAR: Dynamically collapses the Sign-Out button 
 *    to preserve UI integrity on narrow viewports.
 * 3. IDENTITY TRUNCATION: Authoritatively constrains text widths to 
 *    prevent the "Crowded Node" bug.
 */

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from './ui/button';
import { 
    Bell, ShieldAlert, Zap, Activity, Trash2, CheckCircle2,
    Building2, Globe, ShieldCheck, Search as SearchIcon,
    Loader2
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
                       "AUTHORIZED NODE";

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
    <div className="flex-1 flex justify-between items-center px-4 md:px-8 h-full bg-transparent w-full min-w-0">
      
      {/* --- LEFT: OPERATOR IDENTITY --- */}
      <div className="flex items-center gap-3 md:gap-8 min-w-0">
        <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
                {/* IDENTITY WELD: Strict max-width prevents text from pushing icons */}
                <h1 className="text-xs md:text-lg font-black tracking-tighter text-slate-900 truncate max-w-[100px] sm:max-w-[180px] md:max-w-none leading-none">
                    {profile?.full_name || "Authorized Operator"}
                </h1>
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" title="Link Active" />
            </div>
            
            <div className="flex items-center gap-1.5 mt-1 overflow-hidden">
                <span className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.15em] text-blue-600 whitespace-nowrap opacity-90">
                    {profile?.role || "System Admin"}
                </span>
                <span className="h-2.5 w-[1px] bg-slate-200 shrink-0" />
                <span className="text-[8px] md:text-[10px] font-bold text-slate-400 uppercase tracking-tight flex items-center gap-1 truncate opacity-70">
                    <Building2 size={10} className="shrink-0" /> 
                    <span className="truncate max-w-[80px] sm:max-w-[150px]">{businessName}</span>
                </span>
            </div>
        </div>

        {/* --- SEARCH TERMINAL (Desktop Only) --- */}
        <div className="relative hidden xl:block group">
            <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
            <input 
                type="text" 
                placeholder="Search OS records..."
                className="pl-11 pr-6 py-2.5 w-[280px] 2xl:w-[400px] text-xs bg-slate-50 border border-slate-200/60 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:bg-white focus:border-blue-200 transition-all font-bold shadow-sm"
            />
        </div>
      </div>

      {/* --- RIGHT: ACTIONS & METRICS --- */}
      <div className="flex items-center gap-2 md:gap-6 shrink-0">
        
        {/* Currency Node Display (Hides on smaller screens to prevent clutter) */}
        <div className="hidden sm:flex items-center gap-3 pr-4 md:pr-6 border-r border-slate-100">
            <div className="text-right">
                <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest leading-none">Global Unit</p>
                <p className="text-xs md:text-sm font-black text-slate-900 leading-none mt-1.5">
                    {tenant?.reporting_currency || branding?.currency_code || "UGX"}
                </p>
            </div>
            <div className="h-9 w-9 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100 shadow-inner">
                <Globe size={16} />
            </div>
        </div>

        {/* --- NOTIFICATION CENTER --- */}
        <div className="flex items-center gap-2 md:gap-3">
            <Sheet>
                <SheetTrigger asChild>
                    <button className="relative p-2.5 rounded-xl bg-white border border-slate-200/80 hover:border-blue-200 hover:bg-blue-50/30 transition-all cursor-pointer group active:scale-95 shadow-sm">
                        <Bell className={cn("w-5 h-5 transition-transform group-hover:rotate-12", urgentCount > 0 ? "text-blue-600" : "text-slate-400")} />
                        {urgentCount > 0 && (
                            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white shadow-sm animate-bounce" />
                        )}
                    </button>
                </SheetTrigger>
                <SheetContent className="w-full sm:w-[420px] p-0 flex flex-col shadow-2xl border-l border-slate-100 bg-white">
                    <SheetHeader className="p-8 border-b border-slate-50">
                        <div className="flex justify-between items-center">
                            <div>
                                <SheetTitle className="text-xl font-black text-slate-900 uppercase tracking-tighter">Tactical Comms</SheetTitle>
                                <SheetDescription className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">
                                    Forensic Activity Stream
                                </SheetDescription>
                            </div>
                            <Button variant="ghost" size="icon" onClick={clearNotifications} className="h-10 w-10 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                                <Trash2 size={18} />
                            </Button>
                        </div>
                    </SheetHeader>

                    <ScrollArea className="flex-1 px-8 py-6 bg-slate-50/20">
                        <div className="space-y-4">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center py-20 opacity-30">
                                    <Loader2 className="animate-spin mb-4 h-8 w-8 text-blue-600" />
                                    <span className="text-[9px] font-black uppercase tracking-widest">Warping Data...</span>
                                </div>
                            ) : notifications.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-32 text-center">
                                    <div className="w-16 h-16 bg-white border border-slate-100 rounded-2xl flex items-center justify-center text-emerald-500 mb-6 shadow-sm">
                                        <CheckCircle2 size={32} strokeWidth={3} />
                                    </div>
                                    <p className="text-xs font-black text-slate-900 uppercase tracking-widest">Protocol: Clean</p>
                                    <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-tight">No anomalies detected in segment.</p>
                                </div>
                            ) : (
                                notifications.map((n) => (
                                    <div key={n.id} className="p-5 bg-white rounded-2xl border border-slate-100 shadow-[0_4px_20px_-12px_rgba(0,0,0,0.05)] transition-all hover:border-blue-200 group">
                                        <div className="flex justify-between items-start mb-3">
                                            <Badge variant={n.priority === 'URGENT' ? "destructive" : "secondary"} className="text-[8px] px-2 py-0.5 font-black rounded-lg uppercase tracking-widest">
                                                {n.priority === 'URGENT' ? "Urgent" : "Log"}
                                            </Badge>
                                            <div className="text-[8px] text-slate-400 font-bold uppercase tracking-tight">
                                                {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                                            </div>
                                        </div>
                                        <p className="text-[11px] text-slate-600 font-bold leading-relaxed group-hover:text-slate-900 transition-colors">
                                            {n.body}
                                        </p>
                                    </div>
                                ))
                            )}
                        </div>
                    </ScrollArea>
                    
                    <div className="p-6 bg-white border-t border-slate-50 flex justify-center">
                        <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-full border border-slate-100">
                            <ShieldCheck size={12} className="text-blue-600" />
                            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-400">
                                Sovereign Guard Enabled
                            </span>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>

            {/* --- ACTION: SIGN OUT --- */}
            <Button 
                onClick={handleLogout} 
                className="bg-slate-900 hover:bg-blue-600 text-white font-black uppercase tracking-[0.15em] px-3 sm:px-6 h-10 sm:h-11 rounded-xl flex items-center gap-2.5 text-[9px] sm:text-[10px] shadow-xl shadow-slate-900/10 transition-all active:scale-95 group border-none"
            >
                <Zap size={14} className="fill-white group-hover:scale-125 transition-transform shrink-0" />
                <span className="hidden sm:inline">Terminate Session</span>
            </Button>
        </div>
      </div>
    </div>
  );
}