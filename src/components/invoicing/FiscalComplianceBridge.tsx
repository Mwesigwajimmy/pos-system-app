'use client';

import React from 'react';
import { Landmark, ShieldAlert, CheckCircle2, QrCode, Globe } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function FiscalComplianceBridge() {
    return (
        <div className="bg-slate-50 rounded-[2.5rem] p-8 border border-slate-200 shadow-xl space-y-8">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-slate-950 rounded-xl text-white">
                        <Landmark size={22} />
                    </div>
                    <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-900">Statutory Compliance Node</h2>
                </div>
                <div className="flex gap-2">
                    <Badge className="bg-emerald-100 text-emerald-700 border-none font-bold uppercase text-[9px]">Server: ONLINE</Badge>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <div className="p-6 bg-white rounded-3xl shadow-sm border border-slate-100 flex items-center gap-5">
                        <div className="h-16 w-16 bg-slate-100 rounded-2xl flex items-center justify-center">
                            <QrCode size={32} className="text-slate-400" />
                        </div>
                        <div className="flex-1">
                            <p className="text-[10px] font-black uppercase text-slate-400">Government Validation ID</p>
                            <p className="text-lg font-mono font-black text-slate-900 tracking-tight">FDN-7742-99-BBU1</p>
                            <div className="flex items-center gap-2 mt-1">
                                <CheckCircle2 size={12} className="text-emerald-500" />
                                <span className="text-[10px] font-bold text-emerald-600 uppercase">Verified by National Revenue Authority</span>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 bg-white rounded-3xl shadow-sm border border-slate-100">
                        <p className="text-[10px] font-black uppercase text-slate-400 mb-4">Localized Tax Breakdown</p>
                        <div className="space-y-3">
                            <div className="flex justify-between text-xs font-bold">
                                <span className="text-slate-500 uppercase">Regional VAT (Rule: UG-01)</span>
                                <span className="text-slate-900">18.00%</span>
                            </div>
                            <div className="flex justify-between text-xs font-bold">
                                <span className="text-slate-500 uppercase">Infrastructure Levy</span>
                                <span className="text-slate-900">1.50%</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-950 rounded-3xl p-6 flex flex-col justify-between text-white">
                    <Globe size={32} className="text-emerald-400 opacity-20" />
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Market Sovereignty</p>
                        <p className="text-[11px] text-slate-400 mt-2 italic leading-relaxed">
                            "Aura has localized the tax logic for this invoice based on the destination HS-Code. No manual adjustments required."
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}