'use client';

import React from 'react';
import { TrendingUp, RefreshCw, CheckCircle2, DollarSign, Activity, FileText } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export default function FXGainLossAudit() {
    return (
        <div className="p-6 md:p-8 space-y-6 bg-white rounded-xl shadow-sm border border-slate-200 animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Exchange Rate Analytics</p>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight uppercase">
                        Currency <span className="text-blue-600">Valuation Audit</span>
                    </h1>
                </div>
                <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-200 font-mono text-[10px] px-3 py-1 uppercase font-bold">
                    System Logic v2.0
                </Badge>
            </div>

            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Unrealized Gain Card */}
                <div className="p-5 bg-emerald-50 rounded-xl border border-emerald-100 flex justify-between items-center">
                    <div>
                        <p className="text-[10px] font-bold uppercase text-emerald-600 tracking-wider">Unrealized Gain</p>
                        <p className="text-2xl font-bold text-slate-900 mt-1">+$4,120.50</p>
                    </div>
                    <div className="p-2 bg-white rounded-lg shadow-sm">
                        <TrendingUp className="text-emerald-500" size={24} />
                    </div>
                </div>

                {/* Sync Status Card */}
                <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
                    <div>
                        <p className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Market Rate Sync</p>
                        <p className="text-2xl font-bold text-blue-600 mt-1">Live Status</p>
                    </div>
                    <div className="p-2 bg-white rounded-lg shadow-sm">
                        <RefreshCw className="text-blue-400" size={24} />
                    </div>
                </div>
            </div>

            {/* Variance Table */}
            <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm">
                <Table>
                    <TableHeader className="bg-slate-50">
                        <TableRow className="border-none">
                            <TableHead className="text-[10px] font-bold uppercase py-3 pl-6">Reference</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase">Rate at Issue</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase">Current Rate</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase text-right pr-6">Net Variance</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        <TableRow className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                            <TableCell className="font-bold text-xs pl-6 py-4">INV-8821-USD</TableCell>
                            <TableCell className="text-xs font-medium text-slate-600">1 USD = 3,750 UGX</TableCell>
                            <TableCell className="text-xs font-medium text-slate-600">1 USD = 3,820 UGX</TableCell>
                            <TableCell className="text-right pr-6 text-emerald-600 font-bold text-xs uppercase">
                                +70.00 / USD
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </div>

            {/* AI Insight Box */}
            <div className="p-5 bg-blue-50 rounded-xl border border-blue-100 flex items-start gap-4 shadow-sm">
                <div className="p-1.5 bg-white rounded-md border border-blue-200 shadow-sm">
                    <Activity className="text-blue-600 shrink-0" size={16} />
                </div>
                <div>
                    <p className="text-[10px] font-bold uppercase text-blue-700 tracking-wider mb-1">Accounting Insight</p>
                    <p className="text-xs text-blue-800 leading-relaxed font-medium">
                        Your dollar-denominated receivables have increased by 1.8% due to favorable exchange rate movement. We recommend finalizing collection on outstanding USD invoices to lock in these realized gains.
                    </p>
                </div>
            </div>

            {/* Footer verification */}
            <div className="pt-2 border-t border-slate-100 text-center">
                <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest flex items-center justify-center gap-2">
                   <CheckCircle2 size={10} /> Mathematical Parity Verified • Secure System Link
                </p>
            </div>
        </div>
    );
}