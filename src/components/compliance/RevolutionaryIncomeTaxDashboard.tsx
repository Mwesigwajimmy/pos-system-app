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
  FileText,
  Calculator,
  FileSpreadsheet,
  Globe
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface IncomeTaxSummary {
  gross_revenue: number;
  total_cogs: number;
  operating_expenses: number;
  taxable_income: number;
  tax_rate_applied: number;
  tax_liability_accrued: number;
  country_context: string;
}

export interface TaxProvisionEntry {
  id: string;
  date: string;
  reference: string;
  profit_basis: number;
  tax_amount: number;
  status: string;
}

interface IncomeTaxDashboardProps {
  summary: IncomeTaxSummary | null;
  entries: TaxProvisionEntry[];
  reportPeriod: string;
  currency?: string; 
  businessName?: string;
}

export default function RevolutionaryIncomeTaxDashboard({ 
  summary, 
  entries = [], 
  reportPeriod,
  currency = 'UGX',
  businessName = 'Sovereign Business Unit'
}: IncomeTaxDashboardProps) {
  
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

  const downloadCSVReport = () => {
    if (!summary) return;
    
    const headers = ["Date", "Audit Reference", "Net Profit Basis", "Tax Accrued", "Status"];
    const rows = entries.map(e => [
      e.date,
      e.reference,
      e.profit_basis,
      e.tax_amount,
      e.status
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Income_Tax_Export_${reportPeriod.replace(' ', '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadPDFAudit = () => {
    if (!summary) return;
    const doc = new jsPDF();
    
    doc.setFontSize(22);
    doc.setTextColor(15, 23, 42); 
    doc.text("CORPORATE INCOME TAX AUDIT", 14, 22);
    
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139); 
    doc.text(`ENTITY: ${businessName.toUpperCase()}`, 14, 30);
    doc.text(`JURISDICTION: ${summary.country_context?.toUpperCase() || 'UGANDA'}`, 14, 35);
    doc.text(`STATUTORY PERIOD: ${reportPeriod}`, 14, 40);
    doc.text(`TAX RATE APPLIED: ${summary.tax_rate_applied}%`, 14, 45);

    autoTable(doc, {
        startY: 55,
        head: [['Pillar Definition', 'Accounting Value']],
        body: [
            ['Gross Revenue (Net of VAT)', fmt(summary.gross_revenue)],
            ['Cost of Goods Sold (COGS)', fmt(summary.total_cogs)],
            ['Total Operating Expenses', fmt(summary.operating_expenses)],
            ['Net Taxable Income', fmt(summary.taxable_income)],
            ['Projected CIT Liability', fmt(summary.tax_liability_accrued)],
        ],
        theme: 'striped',
        headStyles: { fillColor: [15, 23, 42] },
    });

    const finalY = (doc as any).lastAutoTable.finalY;
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text("ACCURAL PROVISION LOG", 14, finalY + 15);

    autoTable(doc, {
        startY: finalY + 20,
        head: [['Date', 'Ref', 'Profit Basis', 'Provision']],
        body: entries.map(e => [
            e.date,
            e.reference,
            fmt(e.profit_basis),
            fmt(e.tax_amount)
        ]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [245, 158, 11] }
    });

    const lastY = (doc as any).lastAutoTable.finalY || 180;
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text("SOVEREIGN COMPLIANCE PROTOCOL • PILLAR 2200 WELDED • FISCAL INTEGRITY SEALED", 14, lastY + 20);

    doc.save(`CIT_Audit_Report_${reportPeriod.replace(' ', '_')}.pdf`);
  };

  if (!summary) {
    return (
        <div className="h-[500px] flex flex-col items-center justify-center text-slate-400 gap-4 border-2 border-dashed rounded-3xl bg-slate-50/50">
            <Loader2 className="animate-spin text-amber-600" size={32} />
            <div className="text-center">
                <p className="text-sm font-black uppercase tracking-[0.3em] text-slate-900">Analyzing Fiscal Pillars</p>
                <p className="text-[10px] font-bold uppercase text-slate-400 mt-1">Calculating Provision for Account 2200...</p>
            </div>
        </div>
    );
  }

  return (
    <Card className="h-full flex flex-col shadow-sm border-slate-200 bg-white overflow-hidden rounded-3xl animate-in fade-in duration-700">
      <CardHeader className="bg-slate-50/50 border-b p-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-600 rounded-lg text-white">
                        <Landmark size={24} />
                    </div>
                    <div>
                        <CardTitle className="text-2xl font-black text-slate-900 uppercase tracking-tighter">
                            Income Tax Intelligence
                        </CardTitle>
                        <CardDescription className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mt-0.5">
                            Status: Real-time Statutory Accrual Active ({summary.tax_rate_applied}%)
                        </CardDescription>
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <Button 
                    onClick={downloadCSVReport}
                    variant="outline" 
                    className="flex items-center gap-2 border-slate-200 text-slate-600 hover:bg-white font-bold text-[9px] uppercase h-9 px-3"
                >
                    <FileSpreadsheet size={14} /> CSV
                </Button>
                <Button 
                    onClick={downloadPDFAudit}
                    variant="outline" 
                    className="flex items-center gap-2 border-slate-200 text-slate-600 hover:bg-white font-bold text-[9px] uppercase h-9 px-3 shadow-sm"
                >
                    <FileText size={14} /> Audit PDF
                </Button>
                <Badge className="bg-slate-900 text-white font-black px-4 py-1.5 rounded-full uppercase text-[10px] tracking-widest">
                    {currency}
                </Badge>
            </div>
        </div>
      </CardHeader>

      <CardContent className="p-8 space-y-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          
          <div className="p-6 bg-white border border-slate-100 rounded-2xl shadow-sm hover:border-blue-200 transition-colors">
            <div className="flex justify-between items-start mb-2">
                <p className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em]">Gross Revenue</p>
                <Globe className="h-4 w-4 text-slate-300" />
            </div>
            <p className="text-xl font-bold text-slate-900">
                {fmt(summary.gross_revenue)}
            </p>
          </div>

          <div className="p-6 bg-white border border-slate-100 rounded-2xl shadow-sm">
            <div className="flex justify-between items-start mb-2">
                <p className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em]">Deductible Costs</p>
                <ArrowDownCircle className="h-4 w-4 text-slate-400" />
            </div>
            <p className="text-xl font-bold text-slate-600">
                {fmt(summary.total_cogs + summary.operating_expenses)}
            </p>
          </div>

          <div className="p-6 bg-white border border-slate-100 rounded-2xl shadow-sm">
            <div className="flex justify-between items-start mb-2">
                <p className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em]">Taxable Income</p>
                <Calculator className="h-4 w-4 text-emerald-400" />
            </div>
            <p className="text-xl font-bold text-emerald-600">
                {fmt(summary.taxable_income)}
            </p>
          </div>

          <div className="p-6 bg-amber-600 rounded-2xl shadow-xl shadow-amber-500/20">
            <div className="flex justify-between items-start mb-2">
                <p className="text-[9px] font-black uppercase text-amber-100 tracking-[0.2em]">Tax Liability</p>
                <ShieldCheck className="h-4 w-4 text-white opacity-40" />
            </div>
            <p className="text-xl font-bold text-white">
                {fmt(summary.tax_liability_accrued)}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-2">
                  <Receipt className="w-3 h-3 text-amber-500" /> Provision Accrual Log
              </h3>
              <Badge variant="outline" className="text-[10px] font-black text-amber-600 border-amber-200 uppercase tracking-widest bg-amber-50">
                Account 2200 Active
              </Badge>
          </div>
          
          <div className="rounded-2xl border border-slate-100 overflow-hidden bg-white shadow-inner">
            <ScrollArea className="h-80 w-full">
                <Table>
                <TableHeader className="bg-slate-50 sticky top-0 z-10">
                    <TableRow className="border-none">
                        <TableHead className="text-[9px] font-black uppercase px-8 h-12 text-slate-500">Entry ID</TableHead>
                        <TableHead className="text-[9px] font-black uppercase h-12 text-slate-500">Date</TableHead>
                        <TableHead className="text-right text-[9px] font-black uppercase h-12 text-slate-500">Net Profit</TableHead>
                        <TableHead className="text-right text-[9px] font-black uppercase px-8 h-12 text-slate-500">Provision Value</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {entries.length > 0 ? (
                    entries.map((entry) => (
                        <TableRow key={entry.id} className="hover:bg-amber-50/20 transition-all border-b border-slate-50 last:border-0">
                        <TableCell className="font-mono text-[10px] font-bold text-amber-700 px-8 uppercase">{entry.reference || 'AUTO'}</TableCell>
                        <TableCell className="text-[11px] text-slate-600 font-bold">
                            {entry.date}
                        </TableCell>
                        <TableCell className="text-right text-xs font-black text-slate-900">
                            {fmt(entry.profit_basis)}
                        </TableCell>
                        <TableCell className="text-right text-xs font-black text-amber-600 px-8">
                            {fmt(entry.tax_amount)}
                        </TableCell>
                        </TableRow>
                    ))
                    ) : (
                    <TableRow>
                        <TableCell colSpan={4} className="h-60 text-center">
                        <div className="flex flex-col items-center justify-center text-slate-200 gap-3">
                            <AlertCircle className="w-12 h-12 opacity-5" />
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-40">No Profit-Based Provisions Found</p>
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
            Statutory Compliance Handshake Verified
        </div>
        <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 font-bold"><ShieldCheck size={10} className="text-amber-500"/> Pillar Alignment v10.4.2</span>
        </div>
      </CardFooter>
    </Card>
  );
}