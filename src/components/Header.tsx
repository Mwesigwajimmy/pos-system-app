'use client';

/**
 * --- BBU1 SOVEREIGN HEADER ---
 * VERSION: v20.0 OMEGA-ULTIMATUM (MOBILE OVERLAP FIX)
 * 
 * CORE ARCHITECTURAL UPGRADES:
 * 1. FLAT-WELD INTEGRITY: Removed the extra <header> and h-16 to merge directly 
 *    into the Global Layout bar, eliminating the "Double White Space".
 * 2. VERTICAL ALIGNMENT LOCK: Uses h-full and items-center to ensure icons 
 *    never "fall" into the dashboard content.
 * 3. NO-WRAP COMPRESSION: Forces identity and actions to stay on one single line 
 *    regardless of screen size.
 * 4. MOBILE CLARITY FIX: Hides operator text on small screens to prevent the 
 *    "Dashboard Overlap" issue you reported.
 */

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from './ui/button';
import {
    Bell, ShieldAlert, Zap, Activity, Trash2, CheckCircle2,
    Globe, ShieldCheck, Search as SearchIcon,
    Loader2, LogOut, ExternalLink
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
import { ModeToggle } from '@/components/ui/mode-toggle';

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
        const pending = data.filter((n: any) => n.priority === 'URGENT').length;
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
      }, (payload: any) => {
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
    <div className="flex-1 flex justify-between items-center gap-2 pl-16 pr-3 sm:pr-4 md:pr-6 lg:pl-6 lg:pr-6 h-full bg-transparent min-w-0">

      {/* --- LEFT: COMPANY IDENTITY — always visible, truncates instead of hiding --- */}
      <div className="flex items-center gap-2 sm:gap-3 md:gap-8 min-w-0 flex-1">
        <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-xs shrink-0 shadow-sm shadow-blue-600/30">
                {businessName.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col justify-center min-w-0">
                <div className="flex items-center gap-1.5 min-w-0">
                    <h1 className="text-xs sm:text-sm md:text-lg font-black tracking-tight text-slate-900 truncate leading-tight">
                        {businessName}
                    </h1>
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" title="Link Active" />
                </div>
                <div className="hidden sm:flex items-center gap-1.5 mt-0.5 overflow-hidden leading-none">
                    <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-blue-600 whitespace-nowrap opacity-90">
                        {profile?.full_name || "Authorized Operator"}
                    </span>
                    <span className="h-2 w-[1px] bg-slate-200 shrink-0" />
                    <span className="flex items-center gap-1 text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-tight truncate opacity-70">
                        {profile?.role || "Admin"}
                    </span>
                </div>
            </div>
        </div>

        {/* --- SEARCH TERMINAL (Desktop Only) --- */}
        <div className="relative hidden xl:block group shrink-0">
            <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
            <input
                type="text"
                placeholder="Search OS records..."
                className="pl-11 pr-6 py-2.5 w-[280px] 2xl:w-[400px] text-xs bg-slate-50 border border-slate-200/60 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:bg-white focus:border-blue-200 transition-all font-bold shadow-sm"
            />
        </div>
      </div>

      {/* --- RIGHT: ACTIONS & METRICS — never hidden, only shrinks --- */}
      <div className="flex items-center gap-1.5 md:gap-6 shrink-0 h-full">

        {/* Currency Node Display (Hidden on smaller screens to blend better) */}
        <div className="hidden lg:flex items-center gap-3 pr-4 md:pr-6 border-r border-slate-100 h-1/2">
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

        {/* --- ACTION ROW — Theme toggle + Bell + Logout, always shown --- */}
        <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 shrink-0">
            <ModeToggle />
            <Sheet>
                <SheetTrigger asChild>
                    <button className="relative p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-white border border-slate-200/80 hover:border-blue-200 hover:bg-blue-50/30 transition-all group active:scale-95 shadow-sm">
                        <Bell className={cn("w-4 h-4 sm:w-4 sm:h-4 md:w-5 md:h-5 transition-transform group-hover:rotate-12", urgentCount > 0 ? "text-blue-600" : "text-slate-400")} />
                        {urgentCount > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-red-500 rounded-full border-2 border-white shadow-sm text-[9px] text-white font-black flex items-center justify-center px-0.5 leading-none animate-bounce">
                                {urgentCount > 99 ? '99+' : urgentCount}
                            </span>
                        )}
                    </button>
                </SheetTrigger>
                <SheetContent className="w-full sm:w-[420px] p-0 flex flex-col shadow-2xl border-l border-slate-100 bg-white">
                    <SheetHeader className="p-6 border-b border-slate-50">
                        <div className="flex justify-between items-start">
                            <div>
                                <SheetTitle className="text-xl font-black text-slate-900 uppercase tracking-tighter">Notifications</SheetTitle>
                                <SheetDescription className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">
                                    Forensic Activity Stream
                                </SheetDescription>
                                {/* Link to full notifications tab */}
                                <a href="/activities/notifications" className="inline-flex items-center gap-1 mt-2 text-[10px] font-black text-blue-600 uppercase tracking-widest hover:text-blue-700 transition-colors">
                                    View All <ExternalLink size={10} />
                                </a>
                            </div>
                            <div className="flex items-center gap-2">
                                {urgentCount > 0 && (
                                    <span className="text-[10px] font-black text-red-500 bg-red-50 border border-red-100 px-2 py-1 rounded-lg uppercase tracking-wide">
                                        {urgentCount} Urgent
                                    </span>
                                )}
                                <Button variant="ghost" size="icon" onClick={clearNotifications} className="h-10 w-10 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                                    <Trash2 size={18} />
                                </Button>
                            </div>
                        </div>
                    </SheetHeader>

                    <ScrollArea className="flex-1 px-8 py-6 bg-slate-50/20">
                        <div className="space-y-4">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center py-20 opacity-30">
                                    <Loader2 className="animate-spin mb-4 h-8 w-8 text-blue-600" />
                                </div>
                            ) : notifications.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-32 text-center">
                                    <div className="w-16 h-16 bg-white border border-slate-100 rounded-2xl flex items-center justify-center text-emerald-500 mb-6 shadow-sm">
                                        <CheckCircle2 size={32} strokeWidth={3} />
                                    </div>
                                    <p className="text-xs font-black text-slate-900 uppercase tracking-widest">Protocol: Clean</p>
                                </div>
                            ) : (
                                notifications.map((n) => (
                                    <div key={n.id} className="p-5 bg-white rounded-2xl border border-slate-100 shadow-sm hover:border-blue-200 transition-all">
                                        <div className="flex justify-between items-start mb-3">
                                            <Badge variant={n.priority === 'URGENT' ? "destructive" : "secondary"} className="text-[8px] font-black rounded-lg uppercase tracking-widest">
                                                {n.priority === 'URGENT' ? "Urgent" : "Log"}
                                            </Badge>
                                            <div className="text-[8px] text-slate-400 font-bold uppercase tracking-tight">
                                                {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                                            </div>
                                        </div>
                                        <p className="text-[11px] text-slate-600 font-bold leading-relaxed">
                                            {n.body}
                                        </p>
                                    </div>
                                ))
                            )}
                        </div>
                    </ScrollArea>
                </SheetContent>
            </Sheet>

            {/* Logout — icon only on very small screens, icon+text on sm+ */}
            <Button
                onClick={handleLogout}
                className="bg-slate-900 hover:bg-red-600 text-white font-black uppercase tracking-widest px-2 sm:px-3 md:px-5 h-8 sm:h-9 md:h-10 rounded-lg sm:rounded-xl flex items-center gap-1.5 text-[10px] shadow-lg transition-all active:scale-95 group shrink-0 border-none"
            >
                <LogOut size={14} className="shrink-0 group-hover:translate-x-0.5 transition-transform" />
                <span className="hidden sm:inline-block whitespace-nowrap text-[10px]">Sign Out</span>
            </Button>
        </div>
      </div>
    </div>
  );
}