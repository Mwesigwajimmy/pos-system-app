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

export default function Header() {
  const router = useRouter();
  const supabase = createClient();
  
  const { profile } = useBusiness();
  const { branding } = useBranding();

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
      
      {/* --- LEFT: BRANDING & IDENTITY --- */}
      <div className="flex items-center gap-8">
        <div className="flex flex-col">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
                {branding?.company_name_display || "Business Manager"}
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs font-medium text-slate-500">
                    {profile?.role || "Account Administrator"}
                </span>
                <span className="h-1 w-1 rounded-full bg-slate-300" />
                <span className="text-xs text-slate-400 flex items-center gap-1">
                    <MapPin size={12} className="text-slate-400" /> Main Office
                </span>
            </div>
        </div>

        {/* --- SEARCH BAR (MATCHING IMAGE STYLE) --- */}
        <div className="relative hidden md:block group">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
                type="text" 
                placeholder="Search accounts or records..."
                className="pl-10 pr-4 py-2 w-64 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
        </div>
      </div>

      {/* --- RIGHT: ACTIONS & NOTIFICATIONS --- */}
      <div className="flex items-center gap-4">
        
        {/* Currency Display */}
        <div className="hidden lg:flex items-center gap-3 pr-4 border-r border-slate-100">
            <div className="text-right">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Reporting Currency</p>
                <p className="text-sm font-bold text-slate-700">
                    {branding?.currency_code || "USD"}
                </p>
            </div>
            <div className="h-9 w-9 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
                <Globe size={18} />
            </div>
        </div>

        {/* --- NOTIFICATION CENTER --- */}
        <Sheet>
          <SheetTrigger asChild>
            <div className="relative p-2 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer border border-transparent">
                <Bell className={`w-5 h-5 ${urgentCount > 0 ? "text-blue-600" : "text-slate-500"}`} />
                {urgentCount > 0 && (
                  <span className="absolute top-2 right-2 w-2 h-2 bg-blue-600 rounded-full border-2 border-white" />
                )}
            </div>
          </SheetTrigger>
          <SheetContent className="w-[400px] p-0 flex flex-col shadow-xl border-l border-slate-200">
            <SheetHeader className="p-6 border-b bg-white">
              <div className="flex justify-between items-center">
                <div>
                    <SheetTitle className="text-lg font-bold text-slate-900">Notifications</SheetTitle>
                    <SheetDescription className="text-xs font-medium text-slate-500 uppercase tracking-tight">
                        Account activity and alerts
                    </SheetDescription>
                </div>
                <Button variant="ghost" size="icon" onClick={clearNotifications} className="text-slate-400 hover:text-red-500">
                    <Trash2 size={18} />
                </Button>
              </div>
            </SheetHeader>

            <ScrollArea className="flex-1 px-6 py-4 bg-slate-50/30">
              <div className="space-y-4">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                        <Activity className="animate-spin mb-2 h-6 w-6" />
                        <span className="text-xs font-medium">Syncing data...</span>
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-500 mb-4">
                            <CheckCircle2 size={24} />
                        </div>
                        <p className="text-sm font-semibold text-slate-800">All caught up</p>
                        <p className="text-xs text-slate-400 mt-1">No new alerts or activities found.</p>
                    </div>
                ) : (
                    notifications.map((n) => (
                        <div key={n.id} className="p-4 bg-white rounded-lg border border-slate-200 shadow-sm">
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2">
                                    <Badge variant={n.priority === 'URGENT' ? "destructive" : "secondary"} className="text-[10px] px-2 py-0">
                                        {n.priority === 'URGENT' ? "Attention Required" : "Activity"}
                                    </Badge>
                                </div>
                                <div className="text-[10px] text-slate-400 font-medium">
                                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                                </div>
                            </div>
                            <p className="text-sm text-slate-700 font-medium leading-relaxed">
                                {n.body}
                            </p>
                        </div>
                    ))
                )}
              </div>
            </ScrollArea>
            
            <div className="p-4 bg-white border-t flex justify-center">
                <div className="flex items-center gap-2 text-slate-400">
                    <ShieldCheck size={14} />
                    <span className="text-[10px] font-semibold uppercase tracking-wider">
                        Secure Session Active
                    </span>
                </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* --- PRIMARY BUTTON (STYLE FROM IMAGE) --- */}
        <Button 
            onClick={handleLogout} 
            className="bg-[#2557D6] hover:bg-[#1a44b1] text-white font-semibold px-6 h-10 rounded-lg flex items-center gap-2 text-sm transition-all"
        >
            Sign Out
        </Button>
      </div>
    </header>
  );
}