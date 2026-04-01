'use client';

import React from 'react';
import { CalendarDays, Clock, CheckCircle2, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function RecurringBillingSchedules() {
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
                    6 Active
                </Badge>
            </div>

            {/* List of Schedules */}
            <div className="space-y-3 flex-1">
                {[1, 2].map((i) => (
                    <div key={i} className="p-4 bg-slate-50 rounded-lg border border-slate-100 hover:border-blue-400 hover:bg-white transition-all cursor-pointer group">
                        <div className="flex justify-between items-start">
                            <div className="space-y-1">
                                <h4 className="font-bold text-slate-800 text-sm">Monthly Service Plan</h4>
                                <div className="flex items-center gap-2">
                                    <Clock size={12} className="text-slate-400" />
                                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Frequency: Monthly (1st)</span>
                                </div>
                            </div>
                            <ArrowRight size={14} className="text-slate-300 opacity-0 group-hover:opacity-100 group-hover:text-blue-600 transition-all -translate-x-2 group-hover:translate-x-0" />
                        </div>
                        
                        <div className="mt-4 pt-3 border-t border-slate-200/50">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Estimated Collection</span>
                                <span className="text-xs font-bold text-emerald-600">Within 3-5 Days</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Action Button */}
            <Button className="mt-6 h-11 w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold uppercase text-[11px] tracking-widest shadow-sm transition-all active:scale-95">
                New Billing Schedule
            </Button>

            {/* Verified status footer */}
            <div className="mt-4 pt-4 border-t border-slate-100 text-center">
                <div className="flex items-center justify-center gap-2 text-[9px] font-bold text-slate-300 uppercase tracking-widest">
                    <CheckCircle2 size={10} className="text-emerald-500" /> System Managed Automation
                </div>
            </div>
        </div>
    );
}