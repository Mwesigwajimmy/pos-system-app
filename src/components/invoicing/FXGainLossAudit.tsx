'use client';

import React from 'react';
import { TrendingUp, TrendingDown, RefreshCcw, ShieldCheck, Landmark } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export default function FXGainLossAudit() {
    return (
        <div className="p-8 space-y-8 bg-white rounded-[2.5rem] shadow-2xl border border-slate-100">
            <div className="flex justify-between items-start">
                <div className="space-y-1">
                    <h2 className="text-sm font-black uppercase tracking-[0.3em] text-slate-400">Forensic Currency Audit</h2>
                    <h1 className="text-4xl font-black italic uppercase text-slate-900 tracking-tighter">
                        Realized <span className="text-blue-600">FX Variance</span>
                    </h1>
                </div>
                <Badge className="bg-slate-950 text-white font-mono text-[10px] px-4 py-1.5">
                    SOVEREIGN_FX_ENGINE_V2
                </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 bg-emerald-50 rounded-3xl border border-emerald-100 flex justify-between items-center">
                    <div>
                        <p className="text-[10px] font-black uppercase text-emerald-600 tracking-widest">Unrealized Gain</p>
                        <p className="text-3xl font-black text-slate-900 mt-1">+$4,120.50</p>
                    </div>
                    <TrendingUp className="text-emerald-500" size={40} />
                </div>
                <div className="p-6 bg-slate-950 rounded-3xl flex justify-between items-center text-white">
                    <div>
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Aura Mid-Rate Sync</p>
                        <p className="text-3xl font-black text-emerald-400 mt-1">Live</p>
                    </div>
                    <RefreshCcw className="text-blue-500 animate-spin-slow" size={40} />
                </div>
            </div>

            <Table>
                <TableHeader className="bg-slate-50/50">
                    <TableRow className="border-none">
                        <TableHead className="text-[10px] font-black uppercase py-4">Invoice Ref</TableHead>
                        <TableHead className="text-[10px] font-black uppercase">Rate at Issue</TableHead>
                        <TableHead className="text-[10px] font-black uppercase">Current Rate</TableHead>
                        <TableHead className="text-[10px] font-black uppercase text-right">Variance (Forensic)</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <TableRow className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                        <TableCell className="font-bold text-xs">INV-8821-USD</TableCell>
                        <TableCell className="text-xs font-medium">1 USD = 3,750 UGX</TableCell>
                        <TableCell className="text-xs font-medium">1 USD = 3,820 UGX</TableCell>
                        <TableCell className="text-right text-emerald-600 font-black text-xs">
                            +70.00 / USD
                        </TableCell>
                    </TableRow>
                </TableBody>
            </Table>

            <div className="p-5 bg-blue-50 rounded-2xl border border-blue-100 flex items-start gap-4">
                <ShieldCheck className="text-blue-600 shrink-0" size={20} />
                <div>
                    <p className="text-[10px] font-black uppercase text-blue-700">Aura-CFO Insight</p>
                    <p className="text-[11px] text-blue-800 mt-1 leading-relaxed font-medium">
                        "Your dollar-denominated receivables have gained 1.8% in value due to recent currency drift. I recommend prioritizing collection on INV-8821 before the next central bank announcement."
                    </p>
                </div>
            </div>
        </div>
    );
}