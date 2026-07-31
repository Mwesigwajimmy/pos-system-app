'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from './ui/button';
import {
  Bell, ShieldAlert, Trash2, CheckCircle2,
  Globe, Search as SearchIcon,
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
    "Your business";

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
          toast.error("Urgent alert", {
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
    toast.success("Notifications cleared");
  };

  return (
    <div className="flex-1 flex justify-between items-center gap-2 pl-16 pr-3 sm:pr-4 md:pr-6 lg:pl-6 lg:pr-6 h-full bg-transparent min-w-0">

      {/* Business identity */}
      <div className="flex items-center gap-2 sm:gap-3 md:gap-8 min-w-0 flex-1">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-slate-900 flex items-center justify-center text-white font-semibold text-xs shrink-0">
            {businessName.charAt(0).toUpperCase()}
          </div>
          <div className="flex flex-col justify-center min-w-0">
            <h1 className="text-sm md:text-base font-semibold text-slate-900 truncate leading-tight">
              {businessName}
            </h1>
            <div className="hidden sm:flex items-center gap-1.5 mt-0.5 overflow-hidden leading-none">
              <span className="text-xs text-slate-500 whitespace-nowrap">
                {profile?.full_name || "Operator"}
              </span>
              <span className="h-2 w-[1px] bg-slate-200 shrink-0" />
              <span className="text-xs text-slate-400 truncate">
                {profile?.role || "Admin"}
              </span>
            </div>
          </div>
        </div>

        {/* Search (desktop only) */}
        <div className="relative hidden xl:block group shrink-0">
          <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-slate-600 transition-colors" />
          <input
            type="text"
            placeholder="Search..."
            className="pl-11 pr-6 py-2.5 w-[280px] 2xl:w-[400px] text-sm bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-200 focus:bg-white focus:border-slate-300 transition-all shadow-sm"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 md:gap-6 shrink-0 h-full">

        {/* Currency (hidden on smaller screens) */}
        <div className="hidden lg:flex items-center gap-3 pr-4 md:pr-6 border-r border-slate-100 h-1/2">
          <div className="text-right">
            <p className="text-xs text-slate-400 leading-none">Currency</p>
            <p className="text-sm font-medium text-slate-900 leading-none mt-1.5">
              {tenant?.reporting_currency || branding?.currency_code || "UGX"}
            </p>
          </div>
          <div className="h-9 w-9 rounded-md bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100">
            <Globe size={16} />
          </div>
        </div>

        {/* Theme toggle + notifications + logout */}
        <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 shrink-0">
          <ModeToggle />
          <Sheet>
            <SheetTrigger asChild>
              <button className="relative p-1.5 sm:p-2 rounded-md bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all active:scale-95">
                <Bell className={cn("w-4 h-4 md:w-5 md:h-5", urgentCount > 0 ? "text-slate-900" : "text-slate-400")} />
                {urgentCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-red-500 rounded-full border-2 border-white text-[10px] text-white font-semibold flex items-center justify-center px-0.5 leading-none">
                    {urgentCount > 99 ? '99+' : urgentCount}
                  </span>
                )}
              </button>
            </SheetTrigger>
            <SheetContent className="w-full sm:w-[420px] p-0 flex flex-col shadow-lg border-l border-slate-200 bg-white">
              <SheetHeader className="p-6 border-b border-slate-100">
                <div className="flex justify-between items-start">
                  <div>
                    <SheetTitle className="text-lg font-semibold text-slate-900">Notifications</SheetTitle>
                    <SheetDescription className="text-sm text-slate-500 mt-0.5">
                      Recent activity and alerts
                    </SheetDescription>
                    <a href="/activities/notifications" className="inline-flex items-center gap-1 mt-2 text-sm text-slate-600 hover:text-slate-900 transition-colors">
                      View all <ExternalLink size={12} />
                    </a>
                  </div>
                  <div className="flex items-center gap-2">
                    {urgentCount > 0 && (
                      <span className="text-xs font-medium text-red-600 bg-red-50 border border-red-100 px-2 py-1 rounded-md">
                        {urgentCount} urgent
                      </span>
                    )}
                    <Button variant="ghost" size="icon" onClick={clearNotifications} className="h-9 w-9 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md">
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              </SheetHeader>

              <ScrollArea className="flex-1 px-6 py-5 bg-slate-50/50">
                <div className="space-y-3">
                  {loading ? (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-300">
                      <Loader2 className="animate-spin h-6 w-6" />
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                      <div className="w-12 h-12 bg-white border border-slate-200 rounded-full flex items-center justify-center text-emerald-500 mb-4">
                        <CheckCircle2 size={22} />
                      </div>
                      <p className="text-sm text-slate-500">You're all caught up</p>
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div key={n.id} className="p-4 bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                          <Badge variant={n.priority === 'URGENT' ? "destructive" : "secondary"} className="text-xs font-medium rounded-md">
                            {n.priority === 'URGENT' ? "Urgent" : "Log"}
                          </Badge>
                          <span className="text-xs text-slate-400">
                            {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 leading-relaxed">
                          {n.body}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </SheetContent>
          </Sheet>

          <Button
            onClick={handleLogout}
            className="bg-slate-900 hover:bg-red-600 text-white px-2 sm:px-3 md:px-4 h-9 md:h-10 rounded-md flex items-center gap-1.5 text-sm font-medium transition-colors shrink-0 border-none"
          >
            <LogOut size={14} className="shrink-0" />
            <span className="hidden sm:inline-block whitespace-nowrap">Sign out</span>
          </Button>
        </div>
      </div>
    </div>
  );
}