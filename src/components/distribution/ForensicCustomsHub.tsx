'use client';

import React from 'react';
import { 
  ShieldCheck, 
  FileSearch, 
  ArrowUpRight, 
  Building2, 
  Globe2, 
  Scale,
  CheckCircle2, 
  AlertCircle,
  Activity,
  ArrowRight
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// Data preserved from original logic
const CUSTOMS_DATA = [
    {
        id: "AWB-7742-KLA",
        origin: "Dubai (DXB)",
        destination: "Uganda (EBB)",
        hsCode: "8471.30.00", 
        declaredValue: 14500.00,
        currency: "USD",
        localCurrency: "UGX",
        taxName: "VAT + Import Duty",
        taxRate: "18% + 10%", 
        calculatedTax: "9,657,000",
        status: "PREPARING",
        auditScore: 98
    },
    {
        id: "EXP-9921-NRB",
        origin: "Kampala (KLA)",
        destination: "Kenya (NRB)",
        hsCode: "0901.11.00", 
        declaredValue: 22800.00,
        currency: "USD",
        localCurrency: "KES",
        taxName: "EAC Levy",
        taxRate: "1.5%", 
        calculatedTax: "44,200",
        status: "GRANTED",
        auditScore: 100
    }
];

export default function ForensicCustomsHub() {
    return (
        <div className="bg-white rounded-xl p-6 md:p-8 shadow-sm border border-slate-200 overflow-hidden relative animate-in fade-in duration-500">
            
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-blue-600 rounded-lg text-white shadow-sm">
                            <ShieldCheck size={20} />
                        </div>
                        <h2 className="text-lg font-bold tracking-tight text-slate-900 uppercase">
                            Customs & <span className="text-blue-600">Compliance Hub</span>
                        </h2>
                    </div>
                    <p className="text-xs text-slate-500 font-medium ml-1">
                        Cross-border trade validation and tax localization
                    </p>
                </div>
                <div className="flex gap-2">
                    <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100 font-bold text-[10px] px-3 py-1 uppercase tracking-wider">
                        Tariff Sync: Active
                    </Badge>
                    <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-100 font-bold text-[10px] px-3 py-1 uppercase tracking-wider">
                        Status: Compliant
                    </Badge>
                </div>
            </div>

            {/* Main Data Table */}
            <div className="rounded-lg border border-slate-200 overflow-hidden bg-white shadow-sm">
                <Table>
                    <TableHeader className="bg-slate-50/80">
                        <TableRow className="hover:bg-transparent">
                            <TableHead className="text-[10px] font-bold uppercase text-slate-500 py-4 pl-6">Reference / HS Code</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase text-slate-500">Route</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase text-slate-500">Value (USD)</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase text-slate-500 text-right">Tax Calculation</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase text-slate-500 text-center">Score</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase text-slate-500 text-right pr-6">Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {CUSTOMS_DATA.map((row) => (
                            <TableRow key={row.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                                <TableCell className="py-4 pl-6">
                                    <div className="flex flex-col">
                                        <span className="font-mono text-xs font-bold text-slate-900 uppercase">{row.id}</span>
                                        <span className="text-[10px] font-semibold text-blue-600 uppercase mt-0.5">HS: {row.hsCode}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 uppercase tracking-tight">
                                        <Globe2 size={12} className="text-slate-400" />
                                        {row.origin} <ArrowRight size={10} className="text-slate-300" /> {row.destination}
                                    </div>
                                </TableCell>
                                <TableCell className="font-bold text-xs text-slate-700">
                                    {row.currency} {row.declaredValue.toLocaleString()}
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex flex-col items-end">
                                        <span className="font-bold text-xs text-emerald-600">
                                            {row.localCurrency} {row.calculatedTax}
                                        </span>
                                        <span className="text-[9px] font-semibold text-slate-400 uppercase">
                                            {row.taxName} ({row.taxRate})
                                        </span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-center">
                                    <div className="inline-flex items-center justify-center h-8 w-8 rounded-full border border-slate-200 bg-slate-50 text-[10px] font-bold text-slate-700">
                                        {row.auditScore}%
                                    </div>
                                </TableCell>
                                <TableCell className="text-right pr-6">
                                    <Badge 
                                        variant="outline" 
                                        className={cn(
                                            "text-[9px] font-bold uppercase px-2 py-0.5 rounded",
                                            row.status === 'PREPARING' ? "border-amber-200 text-amber-700 bg-amber-50" : "border-emerald-200 text-emerald-700 bg-emerald-50"
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

            {/* System Advisory Insights */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                <div className="p-5 bg-blue-50/50 rounded-xl border border-blue-100 flex items-start gap-4">
                    <div className="p-2 bg-white rounded-lg border border-blue-200 shadow-sm text-blue-600 shrink-0">
                        <Scale size={18} />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold uppercase text-blue-700 tracking-wider">Tariff Intelligence</p>
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed font-medium">
                            System has verified HS Code <span className="font-bold text-slate-900">8471.30</span> with current regional gazettes. Calculations include the latest infrastructure levy updates.
                        </p>
                    </div>
                </div>

                <div className="p-5 bg-amber-50/50 rounded-xl border border-amber-100 flex items-start gap-4">
                    <div className="p-2 bg-white rounded-lg border border-amber-200 shadow-sm text-amber-600 shrink-0">
                        <AlertCircle size={18} />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold uppercase text-amber-700 tracking-wider">Valuation Alert</p>
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed font-medium">
                            Detected a 1.2% variation in FOB value compared to the previous manifest. Local ledger adjusted to ensure alignment and prevent customs penalties.
                        </p>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="mt-8 pt-6 border-t border-slate-100 flex justify-between items-center">
                <div className="flex items-center gap-2 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                    <CheckCircle2 size={14} className="text-emerald-500" /> 
                    Secure Link: National Customs Interface (v3.2)
                </div>
                <button className="text-[10px] font-bold text-blue-600 uppercase hover:underline flex items-center gap-1 transition-colors">
                    View Audit Trail <ArrowUpRight size={12} />
                </button>
            </div>
        </div>
    );
}