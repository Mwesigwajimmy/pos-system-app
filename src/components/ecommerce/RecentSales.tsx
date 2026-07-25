'use client';

/**
 * --- BBU1 SOVEREIGN RECENT SALES FEED ---
 * VERSION: v11.0 OMEGA (REAL-TIME SALES STREAM & MULTI-CURRENCY WELD)
 * JURISDICTION: Unified Multi-Tenant Cloud / Enterprise Digital Commerce
 */

import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ShoppingBag, Loader2, CreditCard, Smartphone, CheckCircle2, ShieldCheck, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";

const supabase = createClient();

// 1. STRICT TYPE DEFINITIONS
export interface RecentOrder {
    id: string;
    customer_email: string;
    total_amount: number;
    currency: string;
    customer_name: string;
    customer_avatar?: string | null;
    payment_method?: string;
    created_at?: string;
}

interface RecentSalesProps {
    orders?: RecentOrder[];
}

// HELPER: ROBUST INITIAL GENERATOR
const getInitials = (name: string) => {
    if (!name || name.trim().length === 0) return "WC"; // Walk-in Client
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export function RecentSales({ orders: propOrders }: RecentSalesProps) {

    // 1. DATA: Identity Context & Currency Resolution
    const { data: profile } = useQuery({
        queryKey: ['active_profile_recent_sales'],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            const { data } = await supabase.from('profiles').select('*, business_name, currency, business_id').eq('id', user?.id).limit(1).single();
            return data;
        }
    });

    const activeCurrency = profile?.currency || 'UGX';
    const activeBusinessId = profile?.business_id;

    // 2. DATA: Real-Time Live Recent Sales Query from Supabase
    const { data: liveSales, isLoading } = useQuery({
        queryKey: ['live_recent_sales_feed', activeBusinessId],
        enabled: !propOrders && !!activeBusinessId,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('sales')
                .select(`
                    *,
                    customers ( id, name, email )
                `)
                .eq('business_id', activeBusinessId)
                .order('created_at', { ascending: false })
                .limit(8);

            if (error) return [];

            return (data || []).map((s: any) => ({
                id: String(s.id),
                customer_name: s.customers?.name || 'Walk-in Customer',
                customer_email: s.customers?.email || `Receipt #${s.id.toString().substring(0,8)}`,
                total_amount: Number(s.total_amount || 0),
                currency: s.currency_code || s.currency || activeCurrency,
                customer_avatar: null,
                payment_method: s.payment_method || 'Cash',
                created_at: s.created_at
            })) as RecentOrder[];
        }
    });

    const displayedOrders = useMemo(() => {
        return propOrders || liveSales || [];
    }, [propOrders, liveSales]);

    // FORMAT CURRENCY HELPER
    const formatAmount = (amount: number, curr: string) => {
        try {
            return new Intl.NumberFormat('en-US', { 
                style: 'currency', 
                currency: curr || activeCurrency,
                maximumFractionDigits: 0
            }).format(amount);
        } catch (e) {
            return `${curr || activeCurrency} ${amount.toLocaleString()}`;
        }
    };

    return (
        <Card className="col-span-4 lg:col-span-3 h-full border-slate-200 shadow-xl rounded-[2.5rem] bg-white overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b p-6">
                <CardTitle className="text-base font-black uppercase text-slate-900 tracking-tight flex items-center justify-between">
                    <span className="flex items-center gap-2">
                        <ShoppingBag className="h-5 w-5 text-blue-600" /> Recent Sales Journal
                    </span>
                    <Badge className="bg-emerald-50 text-emerald-700 border-none font-bold text-[9px] uppercase px-3 py-1">
                        LIVE REVENUE STREAM
                    </Badge>
                </CardTitle>
                <CardDescription className="text-xs font-medium text-slate-500 mt-1">
                    {displayedOrders.length} verified transactions settled recently.
                </CardDescription>
            </CardHeader>

            <CardContent className="p-6">
                {isLoading ? (
                    <div className="flex h-[220px] w-full items-center justify-center gap-2 text-slate-400 font-bold text-xs uppercase">
                        <Loader2 className="animate-spin h-5 w-5 text-blue-600" />
                        <span>Syncing Sales Ledger...</span>
                    </div>
                ) : displayedOrders.length > 0 ? (
                    <ScrollArea className="h-[360px] pr-2 w-full">
                        <div className="space-y-6">
                            {displayedOrders.map(order => {
                                return (
                                    <div key={order.id} className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                                        <div className="flex items-center">
                                            <Avatar className="h-10 w-10 border border-slate-200 shadow-sm">
                                                <AvatarImage src={order.customer_avatar || undefined} alt={order.customer_name} />
                                                <AvatarFallback className="bg-blue-600 text-white font-black text-xs">
                                                    {getInitials(order.customer_name)}
                                                </AvatarFallback>
                                            </Avatar>

                                            <div className="ml-4 space-y-0.5">
                                                <p className="text-xs font-bold text-slate-900 leading-none">
                                                    {order.customer_name}
                                                </p>
                                                <p className="text-[10px] text-slate-400 font-medium truncate max-w-[140px] sm:max-w-[180px]">
                                                    {order.customer_email}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="text-right">
                                            <div className="font-mono font-black text-xs text-emerald-600 tabular-nums">
                                                +{formatAmount(order.total_amount, order.currency)}
                                            </div>
                                            {order.payment_method && (
                                                <span className="text-[8px] font-bold text-slate-400 uppercase block mt-0.5">
                                                    {order.payment_method}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </ScrollArea>
                ) : (
                    <div className="flex h-[220px] w-full flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center text-slate-400">
                        <ShoppingBag className="h-10 w-10 mb-2 opacity-20" />
                        <p className="text-xs font-bold uppercase">No recent sales recorded yet.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}