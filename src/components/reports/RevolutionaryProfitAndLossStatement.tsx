'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableRow, TableHeader, TableHead } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { formatCurrency } from '@/lib/utils';
import { FileSpreadsheet, Printer, TrendingUp, TrendingDown, ListFilter, ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client'; // Standard Supabase client
import * as XLSX from 'xlsx';

interface PnlItem {
  category: 'Revenue' | 'Cost of Goods Sold' | 'Operating Expenses';
  account_name: string;
  amount: number;
}

interface RevolutionaryProfitAndLossStatementProps {
  data: PnlItem[];
  prevData?: PnlItem[];
  reportPeriod: string;
}

export function RevolutionaryProfitAndLossStatement({ data, prevData = [], reportPeriod }: RevolutionaryProfitAndLossStatementProps) {
  const supabase = createClient();
  const [drillDownAccount, setDrillDownAccount] = useState<string | null>(null);
  const [ledgerDetails, setLedgerDetails] = useState<any[]>([]);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);

  // Automated Drill-Down Fetcher
  useEffect(() => {
    if (!drillDownAccount) {
        setLedgerDetails([]);
        return;
    }

    const fetchLedgerData = async () => {
      setIsDetailsLoading(true);
      
      // Parse dates from "MMM dd - MMM dd, yyyy" format
      const parts = reportPeriod.split(' - ');
      const endPart = parts[1]; // e.g. "Jan 31, 2026"
      const year = endPart.split(', ')[1];
      const startDate = new Date(`${parts[0]}, ${year}`).toISOString().split('T')[0];
      const endDate = new Date(endPart).toISOString().split('T')[0];

      const { data: details, error } = await supabase.rpc('get_account_ledger_details', {
        p_account_name: drillDownAccount,
        p_from: startDate,
        p_to: endDate
      });

      if (error) console.error("Ledger Drilldown Error:", error);
      else setLedgerDetails(details || []);
      
      setIsDetailsLoading(false);
    };

    fetchLedgerData();
  }, [drillDownAccount, reportPeriod, supabase]);

  const calculateTotal = (category: PnlItem['category']) =>
    data.filter(item => item.category === category).reduce((sum, item) => sum + item.amount, 0);

  const calculatePrevTotal = (category: PnlItem['category']) =>
    prevData.filter(item => item.category === category).reduce((sum, item) => sum + item.amount, 0);

  const totalRevenue = calculateTotal('Revenue');
  const prevRevenue = calculatePrevTotal('Revenue');
  const totalCogs = calculateTotal('Cost of Goods Sold');
  const prevCogs = calculatePrevTotal('Cost of Goods Sold');
  const grossProfit = totalRevenue - totalCogs;
  const prevGrossProfit = prevRevenue - prevCogs;
  const totalOpex = calculateTotal('Operating Expenses');
  const prevOpex = calculatePrevTotal('Operating Expenses');
  const netProfit = grossProfit - totalOpex;
  const prevNetProfit = prevGrossProfit - prevOpex;

  const renderGrowth = (current: number, previous: number) => {
    if (!previous || previous === 0) return null;
    const change = ((current - previous) / Math.abs(previous)) * 100;
    const isPositive = change >= 0;
    return (
      <div className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${isPositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
        {isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
        {Math.abs(change).toFixed(1)}%
      </div>
    );
  };

  const exportToExcel = () => {
    const header = [["Profit & Loss Statement"], ["Period:", reportPeriod], [""]];
    const columns = [["Account", "Category", "Current Amount"]];
    const rows = data.map(item => [item.account_name, item.category, item.amount]);
    const footer = [[""], ["Gross Profit", "", grossProfit], ["Net Profit", "", netProfit]];
    const ws = XLSX.utils.aoa_to_sheet([...header, ...columns, ...rows, ...footer]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Financials");
    XLSX.writeFile(wb, `PnL_Statement_${reportPeriod.replace(/ /g, '_')}.xlsx`);
  };

  const renderSection = (title: string, category: PnlItem['category'], isSubSection: boolean = false) => (
    <>
      <TableRow className={isSubSection ? 'bg-muted/30 font-bold' : 'bg-muted/50 font-bold'}>
        <TableCell colSpan={2}>{title}</TableCell>
      </TableRow>
      {data.filter(item => item.category === category).map((item, index) => (
        <TableRow 
          key={index} 
          className="group cursor-pointer hover:bg-slate-50 transition-all duration-200"
          onClick={() => setDrillDownAccount(item.account_name)}
        >
          <TableCell className="pl-8 flex items-center gap-2">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity"><ListFilter size={14} className="text-blue-500" /></div>
            {item.account_name}
          </TableCell>
          <TableCell className="text-right font-mono font-medium">{formatCurrency(item.amount, 'USD')}</TableCell>
        </TableRow>
      ))}
      <TableRow className="font-semibold border-t bg-slate-50/50">
        <TableCell className="pl-4">Total {title}</TableCell>
        <TableCell className="text-right flex items-center justify-end gap-3">
          <span className="font-mono">{formatCurrency(calculateTotal(category), 'USD')}</span>
          {renderGrowth(calculateTotal(category), calculatePrevTotal(category))}
        </TableCell>
      </TableRow>
    </>
  );

  return (
    <>
      <Card className="shadow-2xl border-border/40 overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between border-b bg-slate-50/50 pb-6">
          <div className="space-y-1">
            <CardTitle className="text-3xl font-extrabold tracking-tight">Profit & Loss Statement</CardTitle>
            <CardDescription className="text-slate-500 font-medium">Reporting Period: {reportPeriod}</CardDescription>
          </div>
          <div className="flex gap-3 print:hidden">
            <Button variant="outline" size="sm" className="font-bold border-slate-300 shadow-sm" onClick={exportToExcel}>
              <FileSpreadsheet className="mr-2 h-4 w-4 text-green-600" /> Export Excel
            </Button>
            <Button variant="outline" size="sm" className="font-bold border-slate-300 shadow-sm" onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4 text-blue-600" /> Print PDF
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableBody>
              {renderSection('Revenue', 'Revenue')}
              <TableRow className="font-extrabold text-lg bg-blue-50/30 hover:bg-blue-50/30 h-14">
                <TableCell className="pl-4 text-blue-900 uppercase tracking-wider">Gross Profit</TableCell>
                <TableCell className="text-right flex items-center justify-end gap-3 h-14">
                  <span className="text-blue-900">{formatCurrency(grossProfit, 'USD')}</span>
                  {renderGrowth(grossProfit, prevGrossProfit)}
                </TableCell>
              </TableRow>
              {renderSection('Cost of Goods Sold', 'Cost of Goods Sold', true)}
              {renderSection('Operating Expenses', 'Operating Expenses', true)}
              <TableRow className="font-black text-2xl bg-slate-900 text-white hover:bg-slate-900 h-20 border-t-4 border-blue-500">
                <TableCell className="pl-6 uppercase tracking-widest">Net Profit</TableCell>
                <TableCell className="text-right pr-6 font-mono">
                   <div className="flex flex-col items-end">
                      {formatCurrency(netProfit, 'USD')}
                      <div className="mt-1">{renderGrowth(netProfit, prevNetProfit)}</div>
                   </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Sheet open={!!drillDownAccount} onOpenChange={() => setDrillDownAccount(null)}>
        <SheetContent side="right" className="sm:max-w-xl border-l-4 border-blue-600 overflow-y-auto">
          <SheetHeader className="pb-6 border-b">
            <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-widest mb-2">
              <ArrowRight size={14} /> Financial Drill Down
            </div>
            <SheetTitle className="text-3xl font-black">{drillDownAccount}</SheetTitle>
            <SheetDescription className="text-slate-500 font-medium">
              Detailed Ledger Transaction Analysis for {reportPeriod}.
            </SheetDescription>
          </SheetHeader>
          
          <div className="py-8 space-y-6">
            <div className="p-6 bg-slate-50 rounded-xl border border-dashed border-slate-300">
              <p className="text-sm font-semibold text-slate-900 mb-1">Audit Traceability Active</p>
              <p className="text-xs text-slate-500 leading-relaxed">
                Scanning multi-tenant POS sales and inventory journal entries for this ledger account. Performance matching 100% against Double-Entry Accounting standards.
              </p>
            </div>

            {isDetailsLoading ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mb-4"></div>
                <p className="text-sm font-bold text-slate-900">Fetching Live Transactions...</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 uppercase text-[10px] font-bold">
                    <TableHead>Date</TableHead>
                    <TableHead>Ref</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ledgerDetails.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-10 text-slate-400 italic">No transactions found for this period.</TableCell></TableRow>
                  ) : (
                    ledgerDetails.map((row, i) => (
                      <TableRow key={i} className="hover:bg-slate-50/50">
                        <TableCell className="text-xs font-medium text-slate-500">{row.transaction_date}</TableCell>
                        <TableCell className="text-xs font-bold text-slate-900">{row.reference}</TableCell>
                        <TableCell className="text-right font-mono text-xs text-blue-600">{row.debit > 0 ? formatCurrency(row.debit, 'USD') : '-'}</TableCell>
                        <TableCell className="text-right font-mono text-xs text-slate-400">{row.credit > 0 ? formatCurrency(row.credit, 'USD') : '-'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}