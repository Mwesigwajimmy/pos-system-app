'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import {
    Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription
} from "@/components/ui/card";
import {
    ShieldCheck, Unlock, Lock, Landmark, Calculator,
    History, Fingerprint, ArrowUpRight, TrendingUp,
    Wallet, Scale, Activity, UserCheck, AlertCircle, RefreshCcw, Banknote, Coins
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';
import { cn, formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

import DailyRegisterTerminal from '@/components/accounting/DailyRegisterTerminal';
import { useTenant } from '@/hooks/useTenant';
import { useUserProfile } from '@/hooks/useUserProfile';

const supabase = createClient();

export default function DailyLedgerPage() {
    const queryClient = useQueryClient();
    const { data: tenant, isLoading: isTenantLoading } = useTenant();
    const { data: profile } = useUserProfile();

    const [isTerminalOpen, setIsTerminalOpen] = useState(false);
    const today = format(new Date(), 'yyyy-MM-dd');

    const { data: activeSession, isLoading: isSessionLoading } = useQuery({
        queryKey: ['active_ledger_session', today, tenant?.id],
        queryFn: async () => {
            if (!tenant?.id) return null;
            const { data, error } = await supabase
                .from('accounting_daily_ledger_sessions')
                .select('*')
                .eq('business_id', tenant.id)
                .filter('opened_at', 'gte', `${today}T00:00:00Z`)
                .filter('opened_at', 'lte', `${today}T23:59:59Z`)
                .maybeSingle();

            if (error) return null;
            return data;
        },
        enabled: !!tenant?.id
    });

    const { data: metrics } = useQuery({
        queryKey: ['ledger_metrics', activeSession?.id],
        queryFn: async () => {
            if (!activeSession?.id) return null;
            const { data } = await supabase.rpc('get_accounting_kpis', {
                p_business_id: tenant?.id,
                p_start_time: activeSession.opened_at
            });
            return data || { total_inflow: 0, total_outflow: 0, transaction_count: 0 };
        },
        enabled: !!activeSession?.id
    });

    const isLoading = isTenantLoading || isSessionLoading;
    const currency = tenant?.reporting_currency || 'UGX';
    const isOpen = activeSession?.status === 'OPEN';

    if (isLoading) {
        return (
            <div className="flex h-[80vh] flex-col items-center justify-center gap-3">
                <RefreshCcw className="h-6 w-6 animate-spin text-slate-400" />
                <p className="text-sm text-slate-500">Loading ledger…</p>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto py-10 px-6 space-y-8 bg-white min-h-screen">

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-slate-200">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900">
                        Daily Cash Ledger
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        {tenant?.business_display_name} · Reporting currency {currency}
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    <Badge
                        variant="outline"
                        className={cn(
                            "px-3 py-1 text-xs font-medium rounded-md border",
                            isOpen
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-slate-100 text-slate-600 border-slate-200"
                        )}
                    >
                        {isOpen ? 'Register open' : 'Register closed'}
                    </Badge>
                    <div className="text-right">
                        <p className="text-xs text-slate-400">Operator</p>
                        <p className="text-sm font-medium text-slate-900">{profile?.full_name}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                <Card className="lg:col-span-2 border border-slate-200 rounded-lg shadow-none">
                    <CardContent className="p-6 space-y-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="space-y-1.5 max-w-md">
                                <h2 className="text-base font-semibold text-slate-900">
                                    {isOpen ? 'Register opened for today' : 'Start today\'s shift'}
                                </h2>
                                <p className="text-sm text-slate-500 leading-relaxed">
                                    {isOpen
                                        ? `Opened at ${format(new Date(activeSession.opened_at), 'HH:mm:ss')}. All income and expenses are being recorded for this session.`
                                        : 'Confirm your opening cash and petty cash balances to open the ledger for today.'
                                    }
                                </p>
                            </div>

                            {!activeSession ? (
                                <Button
                                    onClick={() => setIsTerminalOpen(true)}
                                    className="h-10 px-5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-md"
                                >
                                    <Unlock size={16} className="mr-2" />
                                    Open register
                                </Button>
                            ) : (
                                <div className="flex items-center gap-2 text-emerald-700 text-sm font-medium">
                                    <ShieldCheck size={18} />
                                    Verified
                                </div>
                            )}
                        </div>

                        {activeSession && (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-slate-100">
                                <div className="p-4 rounded-md border border-slate-200">
                                    <p className="text-xs text-slate-400 mb-1">Opening cash</p>
                                    <p className="text-lg font-semibold text-slate-900 tabular-nums">
                                        {formatCurrency(activeSession.opening_cash_balance, currency)}
                                    </p>
                                </div>
                                <div className="p-4 rounded-md border border-slate-200">
                                    <p className="text-xs text-slate-400 mb-1">Total income</p>
                                    <p className="text-lg font-semibold text-emerald-600 tabular-nums">
                                        +{formatCurrency(metrics?.total_inflow || 0, currency)}
                                    </p>
                                </div>
                                <div className="p-4 rounded-md border border-slate-200">
                                    <p className="text-xs text-slate-400 mb-1">Total expenses</p>
                                    <p className="text-lg font-semibold text-red-600 tabular-nums">
                                        -{formatCurrency(metrics?.total_outflow || 0, currency)}
                                    </p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="border border-slate-200 rounded-lg shadow-none">
                    <CardContent className="p-6 space-y-5">
                        <div className="flex items-center gap-2 text-slate-900">
                            <Scale size={18} />
                            <h3 className="text-sm font-semibold">Compliance summary</h3>
                        </div>

                        <dl className="space-y-3 text-sm">
                            <div className="flex justify-between py-2 border-b border-slate-100">
                                <dt className="text-slate-500">Branch currency</dt>
                                <dd className="font-medium text-slate-900">{currency}</dd>
                            </div>
                            <div className="flex justify-between py-2 border-b border-slate-100">
                                <dt className="text-slate-500">System sync</dt>
                                <dd className="font-medium text-emerald-600">Active</dd>
                            </div>
                            <div className="flex justify-between py-2">
                                <dt className="text-slate-500">Audit review</dt>
                                <dd className="font-medium text-slate-900">Verified</dd>
                            </div>
                        </dl>

                        <p className="text-xs text-slate-400 pt-3 border-t border-slate-100">
                            Authorized financial record for {tenant?.business_display_name}
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h2 className="text-base font-semibold text-slate-900">Recent activity</h2>
                    <Button variant="ghost" className="text-sm text-slate-500 hover:text-slate-900">
                        View full cash book
                        <ArrowUpRight size={14} className="ml-1.5" />
                    </Button>
                </div>

                <Card className="border border-slate-200 rounded-lg shadow-none">
                    <CardContent className="min-h-[240px] flex items-center justify-center p-12">
                        <div className="text-center space-y-2">
                            <Activity size={32} className="mx-auto text-slate-300" />
                            <p className="text-sm text-slate-400">No activity recorded for this shift yet</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <DailyRegisterTerminal
                isOpen={isTerminalOpen}
                onOpenChange={setIsTerminalOpen}
            />

            <div className="text-center pt-8 border-t border-slate-200">
                <p className="text-xs text-slate-400">
                    © {new Date().getFullYear()} Litonu Business Systems Ltd
                </p>
            </div>

        </div>
    );
}