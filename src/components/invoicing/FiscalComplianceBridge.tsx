'use client';

import React from 'react';
import { Landmark, CheckCircle2, QrCode, Globe, ShieldCheck, Activity } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function FiscalComplianceBridge() {
    return (
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-6">
            {/* Header section */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-600 rounded-lg text-white shadow-sm">
                        <Landmark size={20} />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">Tax Compliance Bridge</h2>
                        <p className="text-[10px] text-slate-500 font-medium uppercase tracking-tight">Active Connection</p>
                    </div>
                </div>
                <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-100 font-bold uppercase text-[9px] px-2 py-1">
                    <Activity size={10} className="mr-1.5" /> Service: Online
                </Badge>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                    {/* Validation ID Card */}
                    <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-5">
                        <div className="h-14 w-14 bg-white border border-slate-200 rounded-lg flex items-center justify-center shadow-sm">
                            <QrCode size={28} className="text-slate-400" />
                        </div>
                        <div className="flex-1">
                            <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Validation Identifier</p>
                            <p className="text-lg font-mono font-bold text-slate-900 tracking-tight">FDN-7742-99-BBU1</p>
                            <div className="flex items-center gap-2 mt-1">
                                <CheckCircle2 size={12} className="text-emerald-500" />
                                <span className="text-[10px] font-semibold text-emerald-600 uppercase tracking-tight">Verified by Revenue Authority</span>
                            </div>
                        </div>
                    </div>

                    {/* Tax Breakdown Card */}
                    <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm">
                        <p className="text-[10px] font-bold uppercase text-slate-400 mb-4 tracking-wider">Current Tax Rules</p>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-500 font-semibold uppercase tracking-tight">Regional VAT (UG-01)</span>
                                <span className="font-bold text-slate-900">18.00%</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-500 font-semibold uppercase tracking-tight">Standard Levy</span>
                                <span className="font-bold text-slate-900">1.50%</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Automation Intelligence Card */}
                <div className="bg-slate-900 rounded-xl p-6 flex flex-col justify-between text-white shadow-lg border-none relative overflow-hidden">
                    <Globe size={48} className="absolute -right-4 -top-4 text-blue-500 opacity-10 rotate-12" />
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-4">
                            <ShieldCheck size={16} className="text-blue-400" />
                            <p className="text-[10px] font-bold uppercase tracking-widest text-blue-400">System Localization</p>
                        </div>
                        <p className="text-xs text-slate-300 font-medium leading-relaxed">
                            Tax logic has been applied automatically based on the destination identifiers. No manual calculation is required.
                        </p>
                    </div>
                    <div className="mt-8 pt-4 border-t border-white/5">
                        <p className="text-[9px] font-bold uppercase text-slate-500 tracking-widest">Protocol Version: 10.2</p>
                    </div>
                </div>
            </div>
        </div>
    );
}