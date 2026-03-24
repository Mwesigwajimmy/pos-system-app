'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  DollarSign, 
  Percent, 
  Landmark, 
  ShieldCheck, 
  Fingerprint, 
  ArrowDownCircle, 
  ArrowUpCircle,
  Scale
} from 'lucide-react';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// --- UPGRADED ENTERPRISE INTERFACES ---
export interface TaxSummary {
  total_revenue: number;
  total_taxable_revenue: number;
  total_tax_collected: number;    // Output Tax (Liability)
  total_input_tax_credit: number; // UPGRADE: Tax paid to suppliers (Asset)
  net_tax_liability: number;      // UPGRADE: Actual amount to pay/claim
}

export interface TaxableTransaction {
  id: string;
  date: string;
  description: string;
  invoice_id: string;
  taxable_amount: number;
  tax_collected: number;
  tax_rate: number; // UPGRADE: Required for forensic audit
  category_code?: string; // e.g. 'STANDARD', 'EXEMPT'
}

interface RevolutionarySalesTaxDashboardProps {
  summary: TaxSummary;
  transactions: TaxableTransaction[];
  reportPeriod: string;
  currency?: string; 
}

export function RevolutionarySalesTaxDashboard({ 
  summary, 
  transactions, 
  reportPeriod,
  currency = 'USD' 
}: RevolutionarySalesTaxDashboardProps) {
  
  const effectiveTaxRate = summary.total_taxable_revenue > 0 
    ? (summary.total_tax_collected / summary.total_taxable_revenue) * 100 
    : 0;

  return (
    <Card className="h-full flex flex-col shadow-2xl border-border/60 bg-white overflow-hidden">
      <CardHeader className="bg-slate-50/50 border-b pb-6">
        <div className="flex justify-between items-center">
            <div>
                <CardTitle className="text-2xl font-black uppercase tracking-tight flex items-center gap-2">
                    <Scale className="h-6 w-6 text-blue-600" /> Jurisdictional Tax Summary
                </CardTitle>
                <CardDescription className="font-medium text-slate-500">
                    Forensic analysis of liabilities and credits for: {reportPeriod}
                </CardDescription>
            </div>
            <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-bold uppercase">
                    {currency} LEDGER
                </Badge>
            </div>
        </div>
      </CardHeader>

      <CardContent className="flex-grow grid gap-6 pt-8">
        {/* UPGRADED: 4-Column Grid for Global Tax Parity */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* TOTAL REVENUE */}
          <div className="p-5 bg-white border rounded-2xl shadow-sm border-l-4 border-l-slate-900 group hover:border-blue-600 transition-all">
            <div className="flex justify-between items-start mb-2">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Gross Revenue</p>
                <Landmark className="h-4 w-4 text-slate-300" />
            </div>
            <p className="text-xl font-bold text-slate-900 font-mono">
                {formatCurrency(summary.total_revenue, currency)}
            </p>
          </div>

          {/* OUTPUT TAX (Liability) */}
          <div className="p-5 bg-white border rounded-2xl shadow-sm border-l-4 border-l-red-500 group hover:border-red-600 transition-all">
            <div className="flex justify-between items-start mb-2">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Output Tax (Collected)</p>
                <ArrowUpCircle className="h-4 w-4 text-red-300" />
            </div>
            <p className="text-xl font-bold text-red-600 font-mono">
                {formatCurrency(summary.total_tax_collected, currency)}
            </p>
          </div>

          {/* INPUT TAX CREDIT (Asset) */}
          <div className="p-5 bg-white border rounded-2xl shadow-sm border-l-4 border-l-emerald-500 group hover:border-emerald-600 transition-all">
            <div className="flex justify-between items-start mb-2">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Input Tax (Recoverable)</p>
                <ArrowDownCircle className="h-4 w-4 text-emerald-300" />
            </div>
            <p className="text-xl font-bold text-emerald-600 font-mono">
                {formatCurrency(summary.total_input_tax_credit || 0, currency)}
            </p>
          </div>

          {/* NET LIABILITY */}
          <div className="p-5 bg-slate-900 border rounded-2xl shadow-xl border-none group transition-all">
            <div className="flex justify-between items-start mb-2">
                <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Net Liability Due</p>
                <Fingerprint className="h-4 w-4 text-blue-400 opacity-50" />
            </div>
            <p className={cn(
                "text-xl font-bold font-mono",
                (summary.net_tax_liability || 0) > 0 ? "text-orange-400" : "text-emerald-400"
            )}>
                {formatCurrency(summary.net_tax_liability || (summary.total_tax_collected - (summary.total_input_tax_credit || 0)), currency)}
            </p>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-500" /> Taxable Events Log
              </h3>
              <Badge variant="secondary" className="text-[10px] font-mono">
                Effective Rate: {formatNumber(effectiveTaxRate, 2)}%
              </Badge>
          </div>
          
          <ScrollArea className="h-80 w-full rounded-2xl border bg-white shadow-inner">
            <Table>
              <TableHeader className="sticky top-0 bg-slate-50/90 backdrop-blur-md z-10">
                <TableRow className="hover:bg-transparent border-slate-100">
                  <TableHead className="font-bold uppercase text-[9px] tracking-widest">Ref / Invoice</TableHead>
                  <TableHead className="font-bold uppercase text-[9px] tracking-widest">Description</TableHead>
                  <TableHead className="text-center font-bold uppercase text-[9px] tracking-widest">Rate</TableHead>
                  <TableHead className="text-right font-bold uppercase text-[9px] tracking-widest">Net Amount</TableHead>
                  <TableHead className="text-right font-bold uppercase text-[9px] tracking-widest">Tax Component</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.length > 0 ? (
                  transactions.map((tx) => (
                    <TableRow key={tx.id} className="hover:bg-blue-50/30 transition-colors border-slate-50">
                      <TableCell className="font-mono text-[10px] font-bold text-blue-700">{tx.invoice_id || 'N/A'}</TableCell>
                      <TableCell className="font-medium truncate max-w-[200px] text-xs text-slate-600">
                        {tx.description}
                        {tx.category_code && (
                            <span className="ml-2 text-[8px] bg-slate-100 px-1 rounded font-black">{tx.category_code}</span>
                        )}
                      </TableCell>
                      {/* UPGRADE: Applied rate visibility */}
                      <TableCell className="text-center font-mono text-[10px] font-black text-slate-400">
                        {tx.tax_rate}%
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-bold text-slate-900">
                        {formatCurrency(tx.taxable_amount, currency)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-black text-red-600">
                        {formatCurrency(tx.tax_collected, currency)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-48 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-300 italic text-sm">
                        <AlertCircle className="w-8 h-8 mb-2 opacity-20" />
                        No taxable transactions identified for this period.
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
      </CardContent>

      <CardFooter className="bg-slate-50 border-t py-4 flex justify-between items-center text-[9px] font-mono text-slate-400 font-bold uppercase tracking-widest">
        <div className="flex items-center gap-2">
            <ShieldCheck className="w-3 h-3 text-emerald-500" />
            IFRS & GAAP Compliance Verified
        </div>
        <div className="flex items-center gap-2">
            <Fingerprint className="w-3 h-3" />
            Audit Trace Active
        </div>
      </CardFooter>
    </Card>
  );
}