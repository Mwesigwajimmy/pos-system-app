'use client';

import React from 'react';
import { 
  ShieldAlert, FileSearch, ArrowUpRight, 
  Fingerprint, Landmark, Globe, Scale,
  CheckCircle2, AlertCircle
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// Mock Data representing what your smart system pulls from the DB
const CUSTOMS_DATA = [
    {
        id: "AWB-7742-KLA",
        origin: "Dubai (DXB)",
        destination: "Uganda (EBB)",
        hsCode: "8471.30.00", // Portable Data Processing Power
        declaredValue: 14500.00,
        currency: "USD",
        localCurrency: "UGX",
        taxName: "VAT + Import Duty",
        taxRate: "18% + 10%", 
        calculatedTax: "9,657,000",
        status: "ASYCUDA_PREP",
        auditScore: 98
    },
    {
        id: "EXP-9921-NRB",
        origin: "Kampala (KLA)",
        destination: "Kenya (NRB)",
        hsCode: "0901.11.00", // Coffee, not roasted
        declaredValue: 22800.00,
        currency: "USD",
        localCurrency: "KES",
        taxName: "EAC Levy",
        taxRate: "1.5%", 
        calculatedTax: "44,200",
        status: "EXIT_GRANTED",
        auditScore: 100
    }
];

export default function ForensicCustomsHub() {
    return (
        <div className="bg-white rounded-[2rem] p-8 shadow-2xl border border-slate-100 overflow-hidden relative">
            {/* Background Branding for Sovereignty */}
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
                <Landmark size={150} />
            </div>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-slate-950 rounded-xl text-white shadow-lg shadow-slate-950/20">
                            <Fingerprint size={22} />
                        </div>
                        <h2 className="text-base font-black uppercase tracking-tighter text-slate-900">
                            Customs & ASYCUDA <span className="text-blue-600">Forensic Bridge</span>
                        </h2>
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-12">
                        Cross-Border Compliance & Tax Localization Engine
                    </p>
                </div>
                <div className="flex gap-2">
                    <Badge className="bg-blue-50 text-blue-700 border border-blue-100 font-black text-[10px] px-3">
                        REAL-TIME TARIFF SYNC
                    </Badge>
                    <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-100 font-black text-[10px] px-3">
                        100% COMPLIANT
                    </Badge>
                </div>
            </div>

            <div className="rounded-2xl border border-slate-100 overflow-hidden">
                <Table>
                    <TableHeader className="bg-slate-50/50">
                        <TableRow className="border-b border-slate-100 hover:bg-transparent">
                            <TableHead className="text-[10px] font-black uppercase text-slate-500 py-4">Manifest / HS Code</TableHead>
                            <TableHead className="text-[10px] font-black uppercase text-slate-500">Route</TableHead>
                            <TableHead className="text-[10px] font-black uppercase text-slate-500">Declared Value</TableHead>
                            <TableHead className="text-[10px] font-black uppercase text-slate-500 text-right">Smart Tax Calculation</TableHead>
                            <TableHead className="text-[10px] font-black uppercase text-slate-500 text-center">Aura Score</TableHead>
                            <TableHead className="text-[10px] font-black uppercase text-slate-500 text-right">ASYCUDA Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {CUSTOMS_DATA.map((row) => (
                            <TableRow key={row.id} className="border-b border-slate-50 hover:bg-slate-50/30 transition-colors">
                                <TableCell className="py-4">
                                    <div className="flex flex-col">
                                        <span className="font-mono text-xs font-black text-slate-900">{row.id}</span>
                                        <span className="text-[9px] font-bold text-blue-500 uppercase mt-1">HS: {row.hsCode}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2 text-[11px] font-bold text-slate-600">
                                        <Globe size={12} className="text-slate-400" />
                                        {row.origin} <ArrowUpRight size={10} className="text-slate-300" /> {row.destination}
                                    </div>
                                </TableCell>
                                <TableCell className="font-bold text-xs text-slate-700">
                                    {row.currency} {row.declaredValue.toLocaleString()}
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex flex-col items-end">
                                        <span className="font-black text-xs text-emerald-600">
                                            {row.localCurrency} {row.calculatedTax}
                                        </span>
                                        <span className="text-[9px] font-bold text-slate-400 uppercase">
                                            {row.taxName} ({row.taxRate})
                                        </span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-center">
                                    <div className="inline-flex items-center justify-center h-8 w-8 rounded-full border-2 border-emerald-100 bg-emerald-50 text-[10px] font-black text-emerald-700">
                                        {row.auditScore}%
                                    </div>
                                </TableCell>
                                <TableCell className="text-right">
                                    <Badge 
                                        variant="outline" 
                                        className={cn(
                                            "text-[9px] font-black uppercase px-2 py-0.5",
                                            row.status === 'ASYCUDA_PREP' ? "border-amber-500/20 text-amber-600 bg-amber-50" : "border-emerald-500/20 text-emerald-600 bg-emerald-50"
                                        )}
                                    >
                                        {row.status}
                                    </Badge>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {/* --- SMART AI FORENSIC INSIGHTS --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                <div className="p-5 bg-slate-950 rounded-2xl border border-white/10 flex items-start gap-4">
                    <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shrink-0">
                        <Scale size={20} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase text-blue-400 tracking-widest">Aura Tariff Intelligence</p>
                        <p className="text-[11px] text-slate-300 mt-1 leading-relaxed font-medium">
                            "I have cross-referenced the HS Code <span className="text-white font-bold">8471.30</span> with current EAC Gazettes. Tax calculation includes the latest 0.5% infrastructure levy."
                        </p>
                    </div>
                </div>

                <div className="p-5 bg-orange-50/50 rounded-2xl border border-orange-100 flex items-start gap-4">
                    <div className="h-10 w-10 rounded-xl bg-orange-500 flex items-center justify-center text-white shrink-0">
                        <ShieldAlert size={20} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase text-orange-700 tracking-widest">Forensic Drift Alert</p>
                        <p className="text-[11px] text-orange-800 mt-1 leading-relaxed font-medium">
                            "Detected 1.2% variation in freight-on-board (FOB) vs last manifest. Adjusted valuation in local ledger to prevent customs penalty."
                        </p>
                    </div>
                </div>
            </div>

            {/* --- FOOTER STATUS --- */}
            <div className="mt-8 pt-6 border-t border-slate-100 flex justify-between items-center">
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase">
                    <CheckCircle2 size={14} className="text-emerald-500" /> 
                    Encrypted Connection to National Customs Server (V3.2)
                </div>
                <button className="text-[10px] font-black text-blue-600 uppercase hover:underline flex items-center gap-1">
                    View Full Audit Trail <ArrowUpRight size={12} />
                </button>
            </div>
        </div>
    );
}