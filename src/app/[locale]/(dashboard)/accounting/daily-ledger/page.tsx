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

// --- CORE BUSINESS COMPONENTS ---
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

    // 1. DATA: Session Check (Determines if the register is open for today)
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

    // 2. DATA: Live Financial KPI Summary
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

    if (isLoading) {
        return (
            <div className="flex h-[80vh] flex-col items-center justify-center gap-4">
                <RefreshCcw className="h-10 w-10 animate-spin text-blue-600 opacity-20" />
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 animate-pulse">
                    Synchronizing Financial Data...
                </p>
            </div>
        );
    }

    return (
        <div className="max-w-[1600px] mx-auto py-8 px-6 space-y-10 animate-in fade-in duration-700 bg-white min-h-screen">
            
            {/* --- DASHBOARD HEADER --- */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 border-b border-slate-100 pb-10">
                <div className="space-y-2">
                    <div className="flex items-center gap-4">
                        <div className="h-14 w-14 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-xl">
                            <Banknote size={28} />
                        </div>
                        <h1 className="text-4xl font-bold tracking-tight text-slate-900 uppercase">
                            Daily Cash Ledger
                        </h1>
                    </div>
                    <div className="flex items-center gap-4 ml-1">
                        <p className="text-slate-500 font-semibold text-sm">
                            Business Unit: <span className="text-blue-600 uppercase">{tenant?.business_display_name}</span>
                        </p>
                        <div className="h-1 w-1 rounded-full bg-slate-200" />
                        <p className="text-slate-400 font-medium text-sm">
                            Active Currency: <span className="uppercase">{tenant?.reporting_currency || 'UGX'}</span>
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-5">
                    <Badge className={cn(
                        "h-11 px-8 font-bold uppercase tracking-widest text-[10px] border-none shadow-sm rounded-xl",
                        activeSession?.status === 'OPEN' ? "bg-emerald-500 text-white" : "bg-red-500 text-white"
                    )}>
                        {activeSession?.status === 'OPEN' ? 'Register Active' : 'Register Closed'}
                    </Badge>
                    <div className="text-right px-5 border-l border-slate-200">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Operator Name</p>
                        <p className="text-base font-bold text-slate-900 tracking-tight">{profile?.full_name}</p>
                    </div>
                </div>
            </div>

            {/* --- MAIN OPERATIONAL PANEL --- */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                
                {/* Status & Session Control Card */}
                <Card className="xl:col-span-2 border-none shadow-xl shadow-slate-200/40 rounded-[2.5rem] bg-white overflow-hidden">
                    <div className={cn(
                        "p-1.5 h-2 bg-gradient-to-r",
                        activeSession?.status === 'OPEN' ? "from-emerald-400 to-teal-500" : "from-slate-200 to-slate-300"
                    )} />
                    <CardContent className="p-10 md:p-12 space-y-12">
                        <div className="flex flex-col md:flex-row justify-between items-start gap-10">
                            <div className="space-y-4 max-w-lg">
                                <h2 className="text-2xl font-bold text-slate-900 uppercase tracking-tight">
                                    {activeSession?.status === 'OPEN' ? 'Register Successfully Opened' : 'Start Daily Business Shift'}
                                </h2>
                                <p className="text-slate-500 font-medium leading-relaxed">
                                    {activeSession?.status === 'OPEN' 
                                        ? `The business register was started at ${format(new Date(activeSession.opened_at), 'HH:mm:ss')}. All income and expenses are now being tracked for this shift.`
                                        : "To begin financial entries for today, please verify your starting cash and petty cash funds to open the daily ledger."
                                    }
                                </p>
                            </div>
                            
                            {!activeSession ? (
                                <Button 
                                    onClick={() => setIsTerminalOpen(true)}
                                    className="h-20 px-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold uppercase tracking-widest rounded-3xl shadow-lg transition-all active:scale-95 group"
                                >
                                    <Unlock size={24} className="mr-4 group-hover:rotate-12 transition-transform" />
                                    <span>Open Register</span>
                                </Button>
                            ) : (
                                <div className="flex flex-col items-center gap-3">
                                     <div className="h-20 w-20 rounded-3xl bg-emerald-50 flex items-center justify-center text-emerald-500 border border-emerald-100 shadow-inner">
                                        <ShieldCheck size={40} />
                                     </div>
                                     <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-widest">Register Verified</span>
                                </div>
                            )}
                        </div>

                        {/* Summary Totals */}
                        {activeSession && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8 border-t border-slate-100">
                                <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100 shadow-inner">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Opening Cash</p>
                                    <p className="text-2xl font-bold text-slate-900 tabular-nums">
                                        {formatCurrency(activeSession.opening_cash_balance, tenant?.reporting_currency || 'UGX')}
                                    </p>
                                </div>
                                <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100 shadow-inner">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Total Income</p>
                                    <p className="text-2xl font-bold text-emerald-600 tabular-nums">
                                        +{formatCurrency(metrics?.total_inflow || 0, tenant?.reporting_currency || 'UGX')}
                                    </p>
                                </div>
                                <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100 shadow-inner text-right">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Total Expenses</p>
                                    <p className="text-2xl font-bold text-red-600 tabular-nums">
                                        -{formatCurrency(metrics?.total_outflow || 0, tenant?.reporting_currency || 'UGX')}
                                    </p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* BUSINESS COMPLIANCE WIDGET */}
                <Card className="border-none shadow-xl shadow-slate-200/40 rounded-[2.5rem] bg-slate-900 text-white p-10 flex flex-col justify-between overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-8 opacity-5">
                        <Scale size={200} />
                    </div>
                    
                    <div className="relative z-10 space-y-8">
                        <div className="h-14 w-14 bg-white/10 rounded-2xl flex items-center justify-center text-emerald-400 shadow-inner">
                            <Scale size={28} />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-2xl font-bold uppercase tracking-tight">Business Audit</h3>
                            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Standards Protocol V13.0</p>
                        </div>
                        
                        <div className="space-y-5 pt-6 border-t border-white/10 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                            <div className="flex justify-between border-b border-white/5 pb-3">
                                <span>Branch Currency</span>
                                <span className="text-white">{tenant?.reporting_currency}</span>
                            </div>
                            <div className="flex justify-between border-b border-white/5 pb-3">
                                <span>System Sync</span>
                                <span className="text-emerald-400">ACTIVE</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Audit Review</span>
                                <span className="text-blue-400 font-mono text-[10px]">VERIFIED</span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-12 flex items-center gap-4 relative z-10">
                        <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-500 border border-white/10">
                            <Fingerprint size={20} />
                        </div>
                        <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest leading-tight">
                            Authorized Financial Record for {tenant?.business_display_name}
                        </p>
                    </div>
                </Card>
            </div>

            {/* --- ACTIVITY LOG OVERVIEW --- */}
            <div className="space-y-6">
                <div className="flex items-center justify-between px-4">
                    <div className="flex items-center gap-3">
                        <History size={20} className="text-blue-600" />
                        <h2 className="text-xl font-bold text-slate-900 uppercase tracking-tight">Recent Activity Log</h2>
                    </div>
                    <Button variant="ghost" className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-blue-600 transition-colors">
                        View Full Cash Book <ArrowUpRight size={16} className="ml-2" />
                    </Button>
                </div>
                
                <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-lg overflow-hidden min-h-[350px] flex items-center justify-center text-center p-20">
                     <div className="space-y-4 opacity-30">
                        <Activity size={56} className="mx-auto text-slate-300" />
                        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Waiting for shift activities...</p>
                     </div>
                </div>
            </div>

            {/* Register Terminal Dialog */}
            <DailyRegisterTerminal 
                isOpen={isTerminalOpen} 
                onOpenChange={setIsTerminalOpen} 
            />

            {/* COPYRIGHT FOOTER */}
            <div className="flex justify-center items-center gap-6 py-12 opacity-30">
                <div className="h-[1px] w-24 bg-slate-200" />
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    &copy; {new Date().getFullYear()} LITONU BUSINESS SYSTEMS LTD
                </p>
                <div className="h-[1px] w-24 bg-slate-200" />
            </div>

        </div>
    );
}