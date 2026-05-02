'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from './ui/button';
import { 
    Bell, ShieldAlert, Zap, Activity, Clock, Trash2, CheckCircle2,
    Building2, MapPin, Globe, ShieldCheck, Search as SearchIcon, Plus
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
// DEEP SYNC: Importing the authoritative tenant hook
import { useTenant } from '@/hooks/useTenant';

/**
 * LITONU BUSINESS BASE UNIVERSE LTD - AUTHORITATIVE HEADER
 * 
 * UPGRADE: Dynamically resolves the Operator Identity and Business Context.
 * Replaces "Business Manager" with the real human name and job role.
 */
export default function Header() {
  const router = useRouter();
  const supabase = createClient();
  
  // DEEP SYNC: Pulling live context from all identity pillars
  const { profile } = useBusiness();
  const { branding } = useBranding();
  const { data: tenant } = useTenant();

  // --- AUTHORITATIVE IDENTITY RESOLUTION ---
  // Matches the logic in the Sidebar to ensure 100% UI consistency
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
    <header className="flex justify-between items-center px-8 h-20 bg-white border-b w-full sticky top-0 z-50">
      
      {/* --- LEFT: DYNAMIC OPERATOR IDENTITY --- */}
      <div className="flex items-center gap-8">
        <div className="flex flex-col overflow-hidden">
            {/* 
                DEEP FIX: Operator's Full Name from Profile Context.
            */}
            <h1 className="text-xl font-black tracking-tight text-slate-900 truncate max-w-[300px]">
                {profile?.full_name || "Authorized Operator"}
            </h1>
            
            <div className="flex items-center gap-2 mt-0.5">
                {/* Dynamically displays the specific Job Role (e.g. Admin, Accountant) */}
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">
                    {profile?.role || "System Admin"}
                </span>
                <span className="h-1 w-1 rounded-full bg-slate-300" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight flex items-center gap-1">
                    <MapPin size={10} className="text-slate-400" /> 
                    {/* DEEP FIX: Replaced static "Main Office" with dynamic Business Name */}
                    {businessName}
                </span>
            </div>
        </div>

        {/* --- SEARCH BAR (MATCHING IMAGE STYLE) --- */}
        <div className="relative hidden xl:block group">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
                type="text" 
                placeholder="Search accounts, records, or nodes..."
                className="pl-10 pr-4 py-2 w-80 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium"
            />
        </div>
      </div>

      {/* --- RIGHT: ACTIONS & NOTIFICATIONS --- */}
      <div className="flex items-center gap-4">
        
        {/* Reporting Currency Display (Multi-Currency Support) */}
        <div className="hidden lg:flex items-center gap-3 pr-6 border-r border-slate-100">
            <div className="text-right">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Reporting Currency</p>
                <p className="text-sm font-black text-slate-900 leading-none mt-1">
                    {tenant?.reporting_currency || branding?.currency_code || "UGX"}
                </p>
            </div>
            <div className="h-10 w-10 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 shadow-sm shadow-blue-100 border border-blue-100">
                <Globe size={18} />
            </div>
        </div>

        {/* --- NOTIFICATION CENTER --- */}
        <Sheet>
          <SheetTrigger asChild>
            <div className="relative p-2.5 rounded-xl hover:bg-slate-50 transition-all cursor-pointer border border-transparent active:scale-95">
                <Bell className={`w-5 h-5 ${urgentCount > 0 ? "text-blue-600 animate-pulse" : "text-slate-400"}`} />
                {urgentCount > 0 && (
                  <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white shadow-sm" />
                )}
            </div>
          </SheetTrigger>
          <SheetContent className="w-[440px] p-0 flex flex-col shadow-2xl border-l border-slate-200">
            <SheetHeader className="p-8 border-b bg-white">
              <div className="flex justify-between items-center">
                <div>
                    <SheetTitle className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">Command Feed</SheetTitle>
                    <SheetDescription className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                        Forensic Logs & Tactical Alerts
                    </SheetDescription>
                </div>
                <Button variant="ghost" size="icon" onClick={clearNotifications} className="text-slate-300 hover:text-red-500 rounded-xl">
                    <Trash2 size={20} />
                </Button>
              </div>
            </SheetHeader>

            <ScrollArea className="flex-1 px-8 py-6 bg-slate-50/50">
              <div className="space-y-5">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-300">
                        <Activity className="animate-spin mb-4 h-8 w-8 text-blue-600" />
                        <span className="text-[10px] font-black uppercase tracking-widest animate-pulse">Syncing Hub...</span>
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-32 text-center">
                        <div className="w-16 h-16 bg-white border border-slate-100 rounded-3xl flex items-center justify-center text-emerald-500 mb-6 shadow-sm">
                            <CheckCircle2 size={32} />
                        </div>
                        <p className="text-sm font-black text-slate-900 uppercase">Operational Status: Clear</p>
                        <p className="text-[11px] text-slate-400 font-bold mt-2">No anomalies detected in this session.</p>
                    </div>
                ) : (
                    notifications.map((n) => (
                        <div key={n.id} className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-2">
                                    <Badge variant={n.priority === 'URGENT' ? "destructive" : "secondary"} className="text-[9px] px-3 py-1 font-black rounded-full uppercase tracking-widest">
                                        {n.priority === 'URGENT' ? "CRITICAL" : "ACTIVITY"}
                                    </Badge>
                                </div>
                                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                                </div>
                            </div>
                            <p className="text-[13px] text-slate-700 font-semibold leading-relaxed">
                                {n.body}
                            </p>
                        </div>
                    ))
                )}
              </div>
            </ScrollArea>
            
            <div className="p-6 bg-white border-t flex justify-center shadow-[0_-10px_40px_rgba(0,0,0,0.02)]">
                <div className="flex items-center gap-3 text-slate-300">
                    <ShieldCheck size={16} className="text-blue-600/30" />
                    <span className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">
                        Sovereign Node Integrity Verified
                    </span>
                </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* --- AUTHORITATIVE SIGN OUT (STYLE FROM IMAGE) --- */}
        <Button 
            onClick={handleLogout} 
            className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-black uppercase tracking-[0.1em] px-8 h-12 rounded-2xl flex items-center gap-3 text-xs shadow-lg shadow-blue-600/20 transition-all active:scale-95"
        >
            <Zap size={14} className="fill-white" />
            Sign Out
        </Button>
      </div>
    </header>
  );
}