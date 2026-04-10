'use client';

import React from 'react';
import { Landmark, CheckCircle2, QrCode, Globe, ShieldCheck, Activity, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface AppliedRule {
    label: string;
    value: number;
}

interface ComplianceBridgeProps {
    fiscalId?: string;
    status: string; // 'VERIFIED' | 'PENDING_HANDSHAKE'
    jurisdiction?: string;
    authorityStandard?: string;
    isOnline: boolean;
    rules: AppliedRule[];
}

export default function FiscalComplianceBridge({ 
    fiscalId, 
    status, 
    jurisdiction, 
    authorityStandard, 
    isOnline, 
    rules 
}: ComplianceBridgeProps) {
    const isVerified = status === 'VERIFIED';

    return (
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-6 animate-in fade-in duration-500">
            {/* Header section - Fully Dynamic */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-600 rounded-lg text-white shadow-sm">
                        <Landmark size={20} />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                            {authorityStandard || 'Compliance'} Bridge
                        </h2>
                        <p className="text-[10px] text-slate-500 font-medium uppercase tracking-tight">
                            Active Connection: {jurisdiction || 'Global Registry'}
                        </p>
                    </div>
                </div>
                <Badge variant="secondary" className={`${isOnline ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'} font-bold uppercase text-[9px] px-2 py-1`}>
                    <Activity size={10} className="mr-1.5" /> Service: {isOnline ? 'Online' : 'Interrupted'}
                </Badge>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                    {/* Validation ID Card - Conditional Logic */}
                    <div className={`p-5 rounded-xl border flex items-center gap-5 transition-all ${isVerified ? 'bg-slate-50 border-slate-200' : 'bg-amber-50/30 border-amber-100 border-dashed'}`}>
                        <div className="h-14 w-14 bg-white border border-slate-200 rounded-lg flex items-center justify-center shadow-sm">
                            {isVerified ? (
                                <QrCode size={28} className="text-slate-900" />
                            ) : (
                                <AlertCircle size={28} className="text-amber-500" />
                            )}
                        </div>
                        <div className="flex-1">
                            <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Validation Identifier</p>
                            <p className="text-lg font-mono font-bold text-slate-900 tracking-tight">
                                {fiscalId || 'AWA_SYNC_PROTOCOL'}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                                {isVerified ? (
                                    <>
                                        <CheckCircle2 size={12} className="text-emerald-500" />
                                        <span className="text-[10px] font-semibold text-emerald-600 uppercase tracking-tight">Verified by {authorityStandard || 'Authority'}</span>
                                    </>
                                ) : (
                                    <span className="text-[10px] font-semibold text-amber-600 uppercase tracking-tight animate-pulse italic">
                                        Handshake in progress...
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Tax Breakdown Card - Mapping Real Database Rules */}
                    <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm">
                        <p className="text-[10px] font-bold uppercase text-slate-400 mb-4 tracking-wider">Applied Compliance Rules ({jurisdiction})</p>
                        <div className="space-y-3">
                            {rules.length > 0 ? rules.map((rule, index) => (
                                <div key={index} className="flex justify-between items-center text-xs">
                                    <span className="text-slate-500 font-semibold uppercase tracking-tight">{rule.label}</span>
                                    <span className="font-bold text-slate-900">{rule.value.toFixed(2)}%</span>
                                </div>
                            )) : (
                                <p className="text-[10px] text-slate-400 font-medium italic">Resolving regional tax blueprint...</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Automation Intelligence Card - Dynamic Status */}
                <div className="bg-slate-900 rounded-xl p-6 flex flex-col justify-between text-white shadow-lg border-none relative overflow-hidden">
                    <Globe size={48} className="absolute -right-4 -top-4 text-blue-500 opacity-10 rotate-12" />
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-4">
                            <ShieldCheck size={16} className="text-blue-400" />
                            <p className="text-[10px] font-bold uppercase tracking-widest text-blue-400">System Localization</p>
                        </div>
                        <p className="text-xs text-slate-300 font-medium leading-relaxed">
                            Tax logic for <strong>{jurisdiction || 'Global'}</strong> has been applied automatically based on destination identifiers. No manual calculation required.
                        </p>
                    </div>
                    <div className="mt-8 pt-4 border-t border-white/5">
                        <p className="text-[9px] font-bold uppercase text-slate-500 tracking-widest">
                            Protocol Version: {isVerified ? '10.2' : 'DRAFT'}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}