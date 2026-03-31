'use client';

import React from 'react';
import { CalendarDays, Timer, Zap, BarChart3 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function RecurringBillingSchedules() {
    return (
        <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl border border-slate-100 flex flex-col h-full">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <CalendarDays className="text-blue-600" size={24} />
                    <h2 className="text-sm font-black uppercase tracking-widest text-slate-900">Revenue Automation</h2>
                </div>
                <Badge className="bg-blue-50 text-blue-600 border-none font-black text-[9px] uppercase">6 Active Subscriptions</Badge>
            </div>

            <div className="space-y-4 flex-1">
                {[1, 2].map((i) => (
                    <div key={i} className="p-5 bg-slate-50 rounded-2xl border border-slate-100 hover:border-blue-600 transition-all cursor-pointer group">
                        <div className="flex justify-between items-start">
                            <div>
                                <h4 className="font-black text-slate-900 text-sm">Enterprise Service Pack</h4>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Monthly | Cycle: Day 01</p>
                            </div>
                            <Zap size={16} className="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div className="mt-4 flex items-center gap-4">
                            <div className="flex flex-col">
                                <span className="text-[9px] font-black text-slate-400 uppercase">Aura Collection Forecast</span>
                                <span className="text-xs font-bold text-emerald-600">Expect Settlement: 04-05 Days</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <Button className="mt-8 h-14 w-full bg-slate-950 text-white rounded-2xl font-black uppercase text-[11px] tracking-widest hover:bg-slate-900 transition-all active:scale-95">
                Initialize New Revenue Stream
            </Button>
        </div>
    );
}