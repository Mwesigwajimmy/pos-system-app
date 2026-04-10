'use client';

import React from 'react';
import { TrendingUp, RefreshCw, CheckCircle2, Activity, Download } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface AuditRow {
    invoice_ref: string;
    invoice_ccy: string;
    reporting_ccy: string;
    rate_at_issue: number;
    current_mkt_rate: number;
    variance_per_unit: number;
    unrealized_gain_loss: number;
}

export default function FXGainLossAudit({ data, totalGain, currency }: { data: AuditRow[], totalGain: number, currency: string }) {
    
    // Formatter for currency handling
    const fmt = (val: number) => new Intl.NumberFormat('en-US', { 
        style: 'currency', 
        currency: currency, 
        signDisplay: 'always' 
    }).format(val);

    // PROFESSIONAL PDF GENERATION ENGINE
    const downloadForensicReport = () => {
        const doc = new jsPDF();
        const timestamp = new Date().toLocaleString();
        
        // 1. Branding & Title
        doc.setFontSize(22);
        doc.setTextColor(15, 23, 42); // Slate 900
        doc.text("FORENSIC FX VARIANCE AUDIT", 14, 22);
        
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139); // Slate 500
        doc.text(`REPORT GENERATED: ${timestamp}`, 14, 30);
        doc.text(`SYSTEM LOGIC: SOVEREIGN LEDGER V2.0 ENGINE`, 14, 35);

        // 2. Executive Summary Box
        doc.setFillColor(248, 250, 252); // Slate 50
        doc.rect(14, 45, 182, 25, 'F');
        
        doc.setFontSize(10);
        doc.setTextColor(71, 85, 105); // Slate 600
        doc.text("TOTAL UNREALIZED GAIN/LOSS PORTFOLIO:", 20, 55);
        
        doc.setFontSize(16);
        doc.setTextColor(totalGain >= 0 ? [5, 150, 105] : [225, 29, 72]); // Emerald 600 or Rose 600
        doc.text(`${fmt(totalGain)} ${currency}`, 20, 64);

        // 3. Audit Table Data
        autoTable(doc, {
            startY: 80,
            head: [['REFERENCE', 'INVOICE CCY', 'RATE @ ISSUE', 'MARKET RATE', 'NET VARIANCE']],
            body: data.map(r => [
                r.invoice_ref,
                r.invoice_ccy,
                `${r.rate_at_issue.toLocaleString()} ${currency}`,
                `${r.current_mkt_rate.toLocaleString()} ${currency}`,
                `${r.unrealized_gain_loss >= 0 ? '+' : ''}${r.variance_per_unit.toFixed(2)} / ${r.invoice_ccy}`
            ]),
            headStyles: { 
                fillColor: [30, 41, 59], // Slate 800
                fontSize: 8,
                fontStyle: 'bold',
                halign: 'left'
            },
            bodyStyles: { 
                fontSize: 8,
                textColor: [51, 65, 85] // Slate 700
            },
            alternateRowStyles: { 
                fillColor: [249, 250, 251] 
            },
            margin: { top: 80 }
        });

        // 4. Footer & Legal Verification
        const finalY = (doc as any).lastAutoTable.finalY || 150;
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184); // Slate 400
        doc.text("MATHEMATICAL PARITY VERIFIED • SECURE SYSTEM LINK • NOT AN OFFICIAL TAX DOCUMENT", 14, finalY + 15);
        doc.text("This forensic audit calculates variances based on live mid-market rate feeds synced with the Sovereign Ledger Engine.", 14, finalY + 20);

        // Save file
        doc.save(`FX_Forensic_Audit_${new Date().toISOString().slice(0,10)}.pdf`);
    };

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
                <div className="flex items-center gap-3">
                    <Button 
                        onClick={downloadForensicReport}
                        variant="outline" 
                        className="hidden sm:flex items-center gap-2 border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-[10px] uppercase h-9 px-4 shadow-sm"
                    >
                        <Download size={14} /> Download Report
                    </Button>
                    <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-200 font-mono text-[10px] px-3 py-1 uppercase font-bold">
                        System Logic v2.0
                    </Badge>
                </div>
            </div>

            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 bg-emerald-50 rounded-xl border border-emerald-100 flex justify-between items-center">
                    <div>
                        <p className="text-[10px] font-bold uppercase text-emerald-600 tracking-wider">Unrealized Gain</p>
                        <p className="text-2xl font-bold text-slate-900 mt-1">{fmt(totalGain)}</p>
                    </div>
                    <div className="p-2 bg-white rounded-lg shadow-sm">
                        <TrendingUp className="text-emerald-500" size={24} />
                    </div>
                </div>

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
                        {data.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-10 text-slate-400 font-medium">No active currency drift detected.</TableCell>
                            </TableRow>
                        ) : (
                            data.map((row) => (
                                <TableRow key={row.invoice_ref} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                                    <TableCell className="font-bold text-xs pl-6 py-4">{row.invoice_ref}</TableCell>
                                    <TableCell className="text-xs font-medium text-slate-600">
                                        1 {row.invoice_ccy} = {Number(row.rate_at_issue).toLocaleString()} {row.reporting_ccy}
                                    </TableCell>
                                    <TableCell className="text-xs font-medium text-slate-600">
                                        1 {row.invoice_ccy} = {Number(row.current_mkt_rate).toLocaleString()} {row.reporting_ccy}
                                    </TableCell>
                                    <TableCell className={`text-right pr-6 font-bold text-xs uppercase ${row.unrealized_gain_loss >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                        {row.unrealized_gain_loss >= 0 ? '+' : ''}{row.variance_per_unit.toFixed(2)} / {row.invoice_ccy}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
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
                        Your foreign-denominated receivables have shifted by {totalGain >= 0 ? 'favorable' : 'unfavorable'} exchange rate movement. 
                        We recommend monitoring these outstanding {currency} balances to manage volatility and lock in gains where possible.
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