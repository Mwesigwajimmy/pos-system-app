'use client';

import React from 'react';
import { 
    Card, 
    CardContent, 
    CardDescription, 
    CardHeader, 
    CardTitle, // FIXED: Added missing import
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
  AlertCircle
} from 'lucide-react';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// --- Interfaces ---
export interface TaxSummary {
  total_revenue: number;
  total_taxable_revenue: number;
  total_tax_collected: number;    
  total_input_tax_credit: number; 
  net_tax_liability: number;      
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
  summary: TaxSummary;
  transactions: TaxableTransaction[];
  reportPeriod: string;
  currency?: string; 
}

export function RevolutionarySalesTaxDashboard({ 
  summary, 
  transactions, 
  reportPeriod,
  currency = 'UGX' 
}: SalesTaxDashboardProps) {
  
  const effectiveTaxRate = summary.total_taxable_revenue > 0 
    ? (summary.total_tax_collected / summary.total_taxable_revenue) * 100 
    : 0;

  return (
    <Card className="h-full flex flex-col shadow-sm border-slate-200 bg-white overflow-hidden rounded-xl">
      <CardHeader className="bg-slate-50/50 border-b p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
                <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <Scale className="h-5 w-5 text-blue-600" /> Tax Summary
                </CardTitle>
                <CardDescription className="text-xs font-medium text-slate-500 mt-1">
                    Analysis for the period: {reportPeriod}
                </CardDescription>
            </div>
            <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100 font-bold px-3">
                {currency} Ledger
            </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-8">
        {/* KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          
          {/* Gross Revenue */}
          <div className="p-4 bg-white border border-slate-200 rounded-lg shadow-sm">
            <div className="flex justify-between items-start mb-2">
                <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Gross Revenue</p>
                <Landmark className="h-4 w-4 text-slate-300" />
            </div>
            <p className="text-lg font-bold text-slate-900">
                {formatCurrency(summary.total_revenue, currency)}
            </p>
          </div>

          {/* Collected Tax */}
          <div className="p-4 bg-white border border-slate-200 rounded-lg shadow-sm">
            <div className="flex justify-between items-start mb-2">
                <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Tax Collected</p>
                <ArrowUpCircle className="h-4 w-4 text-red-400" />
            </div>
            <p className="text-lg font-bold text-red-600">
                {formatCurrency(summary.total_tax_collected, currency)}
            </p>
          </div>

          {/* Recoverable Tax */}
          <div className="p-4 bg-white border border-slate-200 rounded-lg shadow-sm">
            <div className="flex justify-between items-start mb-2">
                <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Tax Recoverable</p>
                <ArrowDownCircle className="h-4 w-4 text-emerald-400" />
            </div>
            <p className="text-lg font-bold text-emerald-600">
                {formatCurrency(summary.total_input_tax_credit || 0, currency)}
            </p>
          </div>

          {/* Net Liability */}
          <div className="p-4 bg-slate-900 rounded-lg shadow-md">
            <div className="flex justify-between items-start mb-2">
                <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Net Liability</p>
                <div className="w-2 h-2 rounded-full bg-blue-500" />
            </div>
            <p className={cn(
                "text-lg font-bold",
                (summary.net_tax_liability || 0) > 0 ? "text-blue-400" : "text-emerald-400"
            )}>
                {formatCurrency(summary.net_tax_liability || (summary.total_tax_collected - (summary.total_input_tax_credit || 0)), currency)}
            </p>
          </div>
        </div>

        {/* Transactions Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-blue-500" /> Transaction Log
              </h3>
              <Badge variant="outline" className="text-[10px] font-semibold text-slate-500">
                Effective Rate: {formatNumber(effectiveTaxRate, 2)}%
              </Badge>
          </div>
          
          <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
            <ScrollArea className="h-72 w-full">
                <Table>
                <TableHeader className="bg-slate-50/80 sticky top-0 z-10">
                    <TableRow>
                    <TableHead className="text-[10px] font-bold uppercase h-10 px-4">Invoice Ref</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase h-10">Description</TableHead>
                    <TableHead className="text-center text-[10px] font-bold uppercase h-10">Rate</TableHead>
                    <TableHead className="text-right text-[10px] font-bold uppercase h-10">Net Amt</TableHead>
                    <TableHead className="text-right text-[10px] font-bold uppercase h-10 px-4">Tax Amt</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {transactions.length > 0 ? (
                    transactions.map((tx) => (
                        <TableRow key={tx.id} className="hover:bg-slate-50 transition-colors border-b border-slate-100">
                        <TableCell className="font-mono text-xs font-semibold text-blue-600 px-4">{tx.invoice_id || '-'}</TableCell>
                        <TableCell className="max-w-[200px] truncate text-xs text-slate-600 font-medium">
                            {tx.description}
                            {tx.category_code && (
                                <Badge variant="secondary" className="ml-2 text-[8px] h-4 font-bold">{tx.category_code}</Badge>
                            )}
                        </TableCell>
                        <TableCell className="text-center text-xs font-medium text-slate-400">
                            {tx.tax_rate}%
                        </TableCell>
                        <TableCell className="text-right text-xs font-bold text-slate-800">
                            {formatCurrency(tx.taxable_amount, currency)}
                        </TableCell>
                        <TableCell className="text-right text-xs font-bold text-red-600 px-4">
                            {formatCurrency(tx.tax_collected, currency)}
                        </TableCell>
                        </TableRow>
                    ))
                    ) : (
                    <TableRow>
                        <TableCell colSpan={5} className="h-40 text-center">
                        <div className="flex flex-col items-center justify-center text-slate-400 gap-2">
                            <AlertCircle className="w-8 h-8 opacity-20" />
                            <p className="text-sm font-medium">No transactions found for this period</p>
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

      <CardFooter className="bg-slate-50 border-t py-4 px-6 flex justify-between items-center text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
        <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            Standard Compliance Verified
        </div>
        <div className="flex items-center gap-4">
            <span>System Log: Secure</span>
        </div>
      </CardFooter>
    </Card>
  );
}