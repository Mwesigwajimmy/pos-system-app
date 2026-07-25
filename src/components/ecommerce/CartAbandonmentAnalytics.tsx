'use client';

/**
 * --- BBU1 SOVEREIGN CART ABANDONMENT & RECOVERY HUB ---
 * VERSION: v11.0 OMEGA (REALTIME RECOVERY NUDGE & MULTI-CURRENCY WELD)
 * JURISDICTION: Unified Multi-Tenant Cloud / Enterprise Digital Commerce
 */

import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

import { 
  AlertCircle, MessageSquare, Mail, Send, 
  Clock, CheckCircle2, DollarSign, ShoppingBag, 
  Loader2, Eye, Share2, ExternalLink, BellRing, 
  RefreshCw, Sparkles, ShieldAlert
} from "lucide-react";
import { cn } from "@/lib/utils";

const supabase = createClient();

// 1. STRICT TYPE DEFINITION
export interface CartAbandonmentEntry {
  id: string;
  sessionId: string;
  user: string; // Email or Customer Name
  timestamp: string;
  items: number;
  value: number;
  notified: boolean;
  region: string;
  tenantId: string;
  phone?: string;
  email?: string;
}

interface CartAbandonmentAnalyticsProps {
  entries?: CartAbandonmentEntry[];
}

export function CartAbandonmentAnalytics({ entries: propEntries }: CartAbandonmentAnalyticsProps) {
  const queryClient = useQueryClient();
  const [selectedCart, setSelectedCart] = useState<CartAbandonmentEntry | null>(null);

  // 1. DATA: Identity Context & Currency Resolution
  const { data: profile } = useQuery({
    queryKey: ['active_profile_cart_abandonment'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data } = await supabase.from('profiles').select('*, business_name, currency, business_id, active_organization_slug, whatsapp_number').eq('id', user?.id).limit(1).single();
      return data;
    }
  });

  const activeCurrency = profile?.currency || 'UGX';
  const activeBusinessId = profile?.business_id;

  // 2. DATA: Real-Time Abandoned Carts Query from Supabase
  const { data: liveCarts, isLoading } = useQuery({
    queryKey: ['live_abandoned_carts_analytics', activeBusinessId],
    enabled: !propEntries && !!activeBusinessId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('carts')
        .select(`
          *,
          customers ( id, name, email, phone )
        `)
        .eq('business_id', activeBusinessId)
        .order('created_at', { ascending: false });

      if (error) return [];

      return (data || []).map((c: any) => ({
        id: String(c.id),
        sessionId: c.session_id || `SESS-${c.id.substring(0, 6).toUpperCase()}`,
        user: c.customers?.name || c.customers?.email || c.customer_email || 'Guest Store Visitor',
        timestamp: new Date(c.created_at).toLocaleString(),
        items: Number(c.item_count || 1),
        value: Number(c.total_value || c.total_amount || 0),
        notified: !!c.notified_at,
        region: c.region || 'East Africa',
        tenantId: activeBusinessId || '',
        phone: c.customers?.phone || c.customer_phone || '',
        email: c.customers?.email || c.customer_email || ''
      })) as CartAbandonmentEntry[];
    }
  });

  const cartEntriesList = useMemo(() => {
    return propEntries || liveCarts || [];
  }, [propEntries, liveCarts]);

  // COMPUTED ABANDONMENT METRICS
  const metrics = useMemo(() => {
    if (!cartEntriesList) return { totalValue: 0, totalCount: 0, notifiedCount: 0 };
    
    const totalValue = cartEntriesList.reduce((acc, curr) => acc + curr.value, 0);
    const notifiedCount = cartEntriesList.filter(c => c.notified).length;

    return {
      totalValue,
      totalCount: cartEntriesList.length,
      notifiedCount
    };
  }, [cartEntriesList]);

  // MUTATION: Send Recovery Message & Mark as Notified
  const sendRecoveryNudgeMutation = useMutation({
    mutationFn: async (cart: CartAbandonmentEntry) => {
      // 1. Update cart status to notified
      await supabase
        .from('carts')
        .update({ notified_at: new Date().toISOString() })
        .eq('id', cart.id);

      // 2. Record telemetry event
      await supabase.from('system_global_telemetry').insert([{
        event_category: 'ECOMMERCE_RECOVERY',
        event_name: 'RECOVERY_NUDGE_SENT',
        tenant_id: activeBusinessId,
        metadata: { cart_id: cart.id, user: cart.user, value: cart.value }
      }]);
    },
    onSuccess: (_, cart) => {
      toast.success(`Recovery Nudge Dispatched to ${cart.user}!`);
      
      // WhatsApp Share Bridge
      const storeSlug = profile?.active_organization_slug || 'store';
      const checkoutLink = `https://www.bbu1.com/store/${storeSlug}/checkout?cart=${cart.sessionId}`;
      const msg = encodeURIComponent(`Hello ${cart.user}! You left items in your shopping cart at ${profile?.business_name || 'our store'}. Complete your purchase here: ${checkoutLink}`);
      
      if (cart.phone) {
        window.open(`https://wa.me/${cart.phone.replace(/[^0-9]/g, '')}?text=${msg}`, '_blank');
      }

      queryClient.invalidateQueries({ queryKey: ['live_abandoned_carts_analytics'] });
    },
    onError: (err: any) => toast.error(`Nudge Failed: ${err.message}`)
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* ABANDONED CARTS RECOVERY SUMMARY STRIP */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border border-slate-200 rounded-3xl p-6 bg-white shadow-sm">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Abandonment Potential Value</span>
          <h3 className="text-3xl font-black text-rose-600 mt-2">{activeCurrency} {metrics.totalValue.toLocaleString()}</h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Pending Unchecked Inflow</p>
        </Card>

        <Card className="border border-slate-200 rounded-3xl p-6 bg-white shadow-sm">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Incomplete Sessions</span>
          <h3 className="text-3xl font-black text-slate-900 mt-2">{metrics.totalCount}</h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Abandoned Baskets</p>
        </Card>

        <Card className="border border-slate-200 rounded-3xl p-6 bg-white shadow-sm">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Recovery Nudges Dispatched</span>
          <h3 className="text-3xl font-black text-emerald-600 mt-2">{metrics.notifiedCount}</h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Re-engagement Messages Sent</p>
        </Card>
      </div>

      {/* MAIN TABLE CARD */}
      <Card className="h-full border-slate-200 shadow-xl rounded-[2.5rem] bg-white overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b p-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-3 text-xl font-black text-slate-900 uppercase tracking-tight">
              <AlertCircle className="h-6 w-6 text-orange-500" />
              Cart Abandonment Analytics & Recovery Engine
            </CardTitle>
            <CardDescription className="text-xs font-medium text-slate-500 mt-1">
              View incomplete sessions, trigger automated recovery prompts, and isolate regional drop-off patterns.
            </CardDescription>
          </div>

          <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200 font-bold px-3 py-1 text-[10px] uppercase w-fit">
            {metrics.totalCount} Incomplete Sessions
          </Badge>
        </CardHeader>

        <CardContent className="p-0">
          <ScrollArea className="h-[450px] w-full">
            <Table>
              <TableHeader className="bg-slate-50 sticky top-0 z-10 border-b">
                <TableRow className="h-12">
                  <TableHead className="pl-8 font-bold text-[10px] uppercase text-slate-500">Session ID</TableHead>
                  <TableHead className="font-bold text-[10px] uppercase text-slate-500">User Identity</TableHead>
                  <TableHead className="font-bold text-[10px] uppercase text-slate-500">Date / Time</TableHead>
                  <TableHead className="text-right font-bold text-[10px] uppercase text-slate-500">Items</TableHead>
                  <TableHead className="text-right font-bold text-[10px] uppercase text-slate-500">Cart Value ({activeCurrency})</TableHead>
                  <TableHead className="font-bold text-[10px] uppercase text-slate-500">Region</TableHead>
                  <TableHead className="text-center font-bold text-[10px] uppercase text-slate-500">Nudge Sent</TableHead>
                  <TableHead className="text-right pr-8 font-bold text-[10px] uppercase text-slate-500">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={8} className="h-32 text-center"><Loader2 className="animate-spin inline mr-2 text-orange-500"/> Synchronizing Abandoned Carts...</TableCell></TableRow>
                ) : cartEntriesList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center">
                        <ShoppingBag className="h-8 w-8 mb-2 opacity-20" />
                        <p className="text-xs font-bold uppercase">No abandoned carts found in this period.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  cartEntriesList.map((c) => (
                    <TableRow key={c.id} className="h-16 hover:bg-slate-50/50">
                      <TableCell className="pl-8 font-mono text-xs font-bold text-blue-600">{c.sessionId}</TableCell>
                      <TableCell className="font-bold text-slate-900 text-xs">{c.user}</TableCell>
                      <TableCell className="text-xs font-medium text-slate-500 whitespace-nowrap">{c.timestamp}</TableCell>
                      <TableCell className="text-right font-mono font-bold text-xs">{c.items}</TableCell>
                      <TableCell className="text-right font-black text-sm text-rose-600 tabular-nums">
                        {c.value.toLocaleString()}
                      </TableCell>
                      <TableCell><Badge variant="outline" className="text-[9px] font-bold uppercase border-slate-200">{c.region}</Badge></TableCell>
                      <TableCell className="text-center">
                        {c.notified ? (
                          <Badge className="bg-emerald-50 text-emerald-700 border-none text-[9px] font-bold uppercase px-3 py-1">
                            <CheckCircle2 className="w-3 h-3 mr-1"/> Sent
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 text-[9px] font-bold uppercase px-3 py-1">
                            Pending
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right pr-8">
                        <Button 
                          onClick={() => sendRecoveryNudgeMutation.mutate(c)}
                          disabled={sendRecoveryNudgeMutation.isPending}
                          size="sm" 
                          className="h-9 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md"
                        >
                          <MessageSquare className="h-3.5 w-3.5 mr-1.5" /> Nudge
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardContent>
      </Card>

    </div>
  );
}