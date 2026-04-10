'use client';

import React from 'react';
import { CalendarDays, Clock, CheckCircle2, ArrowRight, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface Schedule {
    schedule_id: string;
    plan_name: string;
    billing_frequency: string;
    days_until_next_run: number;
    confidence_score: number;
    is_active_status: boolean;
}

export default function RecurringBillingSchedules({ schedules, activeCount }: { schedules: Schedule[], activeCount: number }) {
    return (
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex flex-col h-full animate-in fade-in duration-500">
            {/* Header section */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg">
                        <CalendarDays className="text-blue-600" size={20} />
                    </div>
                    <div>
                        <h2 className="text-base font-bold text-slate-900">Automated Billing</h2>
                        <p className="text-[10px] text-slate-500 font-medium uppercase tracking-tight">Recurring Schedules</p>
                    </div>
                </div>
                <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100 font-bold text-[10px] px-2.5 py-0.5 uppercase">
                    {activeCount} Active
                </Badge>
            </div>

            {/* List of Schedules - Dynamic Mapping */}
            <div className="space-y-3 flex-1">
                {schedules.length === 0 ? (
                    <div className="text-center py-10 border-2 border-dashed border-slate-100 rounded-xl">
                        <p className="text-xs text-slate-400 font-medium">No active revenue streams detected.</p>
                    </div>
                ) : (
                    schedules.map((item) => (
                        <div key={item.schedule_id} className="p-4 bg-slate-50 rounded-lg border border-slate-100 hover:border-blue-400 hover:bg-white transition-all cursor-pointer group">
                            <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                    <h4 className="font-bold text-slate-800 text-sm">{item.plan_name}</h4>
                                    <div className="flex items-center gap-2">
                                        <Clock size={12} className="text-slate-400" />
                                        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                                            Frequency: {item.billing_frequency}
                                        </span>
                                    </div>
                                </div>
                                <ArrowRight size={14} className="text-slate-300 opacity-0 group-hover:opacity-100 group-hover:text-blue-600 transition-all -translate-x-2 group-hover:translate-x-0" />
                            </div>
                            
                            <div className="mt-4 pt-3 border-t border-slate-200/50">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                        <TrendingUp size={10} className="text-emerald-500" />
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                                            Est. Collection: {item.days_until_next_run <= 0 ? 'Today' : `in ${item.days_until_next_run} days`}
                                        </span>
                                    </div>
                                    <span className={`text-[10px] font-black uppercase ${Number(item.confidence_score) > 90 ? 'text-emerald-600' : 'text-amber-600'}`}>
                                        {Number(item.confidence_score)}% Confidence
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <Button className="mt-6 h-11 w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold uppercase text-[11px] tracking-widest shadow-sm transition-all active:scale-95">
                New Billing Schedule
            </Button>

            {/* Verified status footer */}
            <div className="mt-4 pt-4 border-t border-slate-100 text-center">
                <div className="flex items-center justify-center gap-2 text-[9px] font-bold text-slate-300 uppercase tracking-widest">
                    <CheckCircle2 size={10} className="text-emerald-500" /> Predictive Ledger Active
                </div>
            </div>
        </div>
    );
}