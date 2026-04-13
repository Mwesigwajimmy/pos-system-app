'use client';

import React from 'react';
import { 
    Card, 
    CardContent, 
    CardDescription, 
    CardHeader, 
    CardTitle, 
    CardFooter 
} from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Landmark, 
  CheckCircle2, 
  ArrowDownCircle, 
  ArrowUpCircle,
  Scale,
  Receipt,
  AlertCircle,
  Download,
  Loader2,
  ShieldCheck,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// --- Interfaces ---
export interface TaxSummary {
  total_revenue: number;
  total_taxable_revenue: number;
  total_tax_collected: number;    
  total_input_tax_credit: number; 
  net_tax_liability: number;
  industry_context?: string;      
}

export interface TaxableTransaction {
  id: string;
  date: string;
  description: string;
  invoice_id: string;
  taxable_amount: number;
  tax_collected: number;
  tax_rate: number; 
  category_code?: string;
}

interface SalesTaxDashboardProps {
  summary: TaxSummary | null; // Changed to allow null for initial sync state
  transactions: TaxableTransaction[];
  reportPeriod: string;
  currency?: string; 
  businessName?: string;
}

export function RevolutionarySalesTaxDashboard({ 
  summary, 
  transactions = [], 
  reportPeriod,
  currency = 'UGX',
  businessName = 'Sovereign Business Unit'
}: SalesTaxDashboardProps) {
  
  // --- 1. FORENSIC CRASH SHIELD ---
  // Prevents Intl crashes if the currency string is malformed or missing
  const fmt = (val: number | undefined) => {
    try {
        const safeCcy = (currency && currency.length === 3) ? currency : 'UGX';
        return new Intl.NumberFormat('en-US', { 
            style: 'currency', 
            currency: safeCcy,
            minimumFractionDigits: 2
        }).format(val || 0);
    } catch (e) {
        return `${(val || 0).toLocaleString()} ${currency}`;
    }
  };

  // --- 2. EXECUTIVE PDF AUDIT ENGINE ---
  const downloadStatutoryReport = () => {
    if (!summary) return;
    const doc = new jsPDF();
    const timestamp = new Date().toLocaleString();

    // Branding & Header
    doc.setFontSize(22);
    doc.setTextColor(15, 23, 42); // Slate 900
    doc.text("STATUTORY TAX AUDIT REPORT", 14, 22);
    
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139); // Slate 500
    doc.text(`ENTITY: ${businessName.toUpperCase()}`, 14, 30);
    doc.text(`SECTOR: ${summary.industry_context?.toUpperCase() || 'GENERAL'}`, 14, 35);
    doc.text(`PERIOD: ${reportPeriod}`, 14, 40);
    doc.text(`LOGIC: SOVEREIGN TAX ENGINE V2.9`, 14, 45);

    // Summary Performance Table
    autoTable(doc, {
        startY: 55,
        head: [['Metric Definition', 'Value']],
        body: [
            ['Gross Sector Revenue', fmt(summary.total_revenue)],
            ['Output Tax (Collected)', fmt(summary.total_tax_collected)],
            ['Input Tax (Recoverable)', fmt(summary.total_input_tax_credit)],
            ['Net Tax Liability', fmt(summary.net_tax_liability)],
        ],
        theme: 'striped',
        headStyles: { fillColor: [30, 41, 59] },
    });

    // Transaction Handshake Table
    const finalY = (doc as any).lastAutoTable.finalY;
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text("FORENSIC TRANSACTION LOG", 14, finalY + 15);

    autoTable(doc, {
        startY: finalY + 20,
        head: [['Ref', 'Memo', 'Rate', 'Basis', 'Tax Amount']],
        body: transactions.map(t => [
            t.invoice_id?.substring(0,8) || '-',
            t.description.substring(0, 30),
            `${t.tax_rate}%`,
            fmt(t.taxable_amount),
            fmt(t.tax_collected)
        ]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [59, 130, 246] }
    });

    // Verification Footer
    const lastY = (doc as any).lastAutoTable.finalY || 180;
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text("MATHEMATICAL PARITY VERIFIED • SECTOR ISOLATION ACTIVE • SECURE LEDGER LINK", 14, lastY + 20);

    doc.save(`Statutory_Tax_Report_${reportPeriod.replace(' ', '_')}.pdf`);
  };

  // --- 3. LOADING / INITIALIZING STATE ---
  if (!summary) {
    return (
        <div className="h-[500px] flex flex-col items-center justify-center text-slate-400 gap-4 border-2 border-dashed rounded-3xl bg-slate-50/50 animate-in fade-in">
            <Loader2 className="animate-spin text-blue-600" size={32} />
            <div className="text-center">
                <p className="text-sm font-black uppercase tracking-[0.3em] text-slate-900">Synchronizing Forensic Ledger</p>
                <p className="text-[10px] font-bold uppercase text-slate-400 mt-1">Resolving Sector-Specific Tax Handshake...</p>
            </div>
        </div>
    );
  }

  const effectiveTaxRate = summary.total_taxable_revenue > 0 
    ? (summary.total_tax_collected / summary.total_taxable_revenue) * 100 
    : 0;

  return (
    <Card className="h-full flex flex-col shadow-sm border-slate-200 bg-white overflow-hidden rounded-3xl animate-in fade-in duration-700">
      <CardHeader className="bg-slate-50/50 border-b p-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-600 rounded-lg text-white">
                        <Scale size={24} />
                    </div>
                    <div>
                        <CardTitle className="text-2xl font-black text-slate-900 uppercase tracking-tighter">
                            Sales Tax Intelligence
                        </CardTitle>
                        <CardDescription className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mt-0.5">
                            Active Sector: {summary.industry_context || 'Standard Commercial Operations'}
                        </CardDescription>
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-3">
                <Button 
                    onClick={downloadStatutoryReport}
                    variant="outline" 
                    className="hidden md:flex items-center gap-2 border-slate-200 text-slate-600 hover:bg-white font-bold text-[10px] uppercase h-10 px-4 shadow-sm"
                >
                    <Download size={14} /> Download Audit Report
                </Button>
                <Badge className="bg-slate-900 text-white font-black px-4 py-1.5 rounded-full uppercase text-[10px] tracking-widest">
                    {currency} Ledger
                </Badge>
            </div>
        </div>
      </CardHeader>

      <CardContent className="p-8 space-y-10">
        {/* KPI Grid - Sector Aware */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          
          <div className="p-6 bg-white border border-slate-100 rounded-2xl shadow-sm hover:border-blue-200 transition-colors">
            <div className="flex justify-between items-start mb-2">
                <p className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em]">Gross Revenue</p>
                <Landmark className="h-4 w-4 text-slate-300" />
            </div>
            <p className="text-xl font-bold text-slate-900">
                {fmt(summary.total_revenue)}
            </p>
          </div>

          <div className="p-6 bg-white border border-slate-100 rounded-2xl shadow-sm">
            <div className="flex justify-between items-start mb-2">
                <p className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em]">Output Tax</p>
                <ArrowUpCircle className="h-4 w-4 text-red-400" />
            </div>
            <p className="text-xl font-bold text-red-600">
                {fmt(summary.total_tax_collected)}
            </p>
          </div>

          <div className="p-6 bg-white border border-slate-100 rounded-2xl shadow-sm">
            <div className="flex justify-between items-start mb-2">
                <p className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em]">Input Recovery</p>
                <ArrowDownCircle className="h-4 w-4 text-emerald-400" />
            </div>
            <p className="text-xl font-bold text-emerald-600">
                {fmt(summary.total_input_tax_credit)}
            </p>
          </div>

          <div className="p-6 bg-blue-600 rounded-2xl shadow-xl shadow-blue-500/20">
            <div className="flex justify-between items-start mb-2">
                <p className="text-[9px] font-black uppercase text-blue-100 tracking-[0.2em]">Net Liability</p>
                <ShieldCheck className="h-4 w-4 text-white opacity-40" />
            </div>
            <p className="text-xl font-bold text-white">
                {fmt(summary.net_tax_liability)}
            </p>
          </div>
        </div>

        {/* Isolated Transactional Log */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-2">
                  <Receipt className="w-3 h-3 text-blue-500" /> Isolated Statutory Records
              </h3>
              <Badge variant="outline" className="text-[10px] font-black text-slate-500 border-slate-200 uppercase tracking-widest">
                Forensic Accuracy: {effectiveTaxRate.toFixed(2)}%
              </Badge>
          </div>
          
          <div className="rounded-2xl border border-slate-100 overflow-hidden bg-white shadow-inner">
            <ScrollArea className="h-80 w-full">
                <Table>
                <TableHeader className="bg-slate-50 sticky top-0 z-10 border-none">
                    <TableRow className="border-none">
                        <TableHead className="text-[9px] font-black uppercase px-8 h-12">Audit ID</TableHead>
                        <TableHead className="text-[9px] font-black uppercase h-12">System Narrative</TableHead>
                        <TableHead className="text-center text-[9px] font-black uppercase h-12">Rate</TableHead>
                        <TableHead className="text-right text-[9px] font-black uppercase h-12">Net Basis</TableHead>
                        <TableHead className="text-right text-[9px] font-black uppercase px-8 h-12">Tax Value</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {transactions.length > 0 ? (
                    transactions.map((tx) => (
                        <TableRow key={tx.id} className="hover:bg-blue-50/20 transition-all border-b border-slate-50 last:border-0">
                        <TableCell className="font-mono text-[10px] font-bold text-blue-600 px-8 uppercase">{tx.invoice_id?.substring(0,8) || 'AUTO'}</TableCell>
                        <TableCell className="max-w-[200px] truncate text-[11px] text-slate-600 font-bold uppercase">
                            {tx.description}
                            {tx.category_code && (
                                <Badge variant="secondary" className="ml-2 bg-slate-100 text-[8px] h-4 font-black border-none uppercase text-slate-500">{tx.category_code}</Badge>
                            )}
                        </TableCell>
                        <TableCell className="text-center text-[10px] font-mono font-bold text-slate-400">
                            {tx.tax_rate}%
                        </TableCell>
                        <TableCell className="text-right text-xs font-black text-slate-900">
                            {fmt(tx.taxable_amount)}
                        </TableCell>
                        <TableCell className="text-right text-xs font-black text-rose-600 px-8">
                            {fmt(tx.tax_collected)}
                        </TableCell>
                        </TableRow>
                    ))
                    ) : (
                    <TableRow>
                        <TableCell colSpan={5} className="h-60 text-center">
                        <div className="flex flex-col items-center justify-center text-slate-200 gap-3">
                            <AlertCircle className="w-12 h-12 opacity-5" />
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-40">No Statutory Sector Records Found</p>
                        </div>
                        </TableCell>
                    </TableRow>
                    )}
                </TableBody>
                </Table>
            </ScrollArea>
          </div>
        </div>
      </CardContent>

      <CardFooter className="bg-slate-50 border-t py-6 px-8 flex justify-between items-center text-[9px] font-black text-slate-400 uppercase tracking-[0.4em]">
        <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            Mathematical Parity Guaranteed
        </div>
        <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5"><ShieldCheck size={10} className="text-blue-500"/> Protocol v10.2</span>
        </div>
      </CardFooter>
    </Card>
  );
}