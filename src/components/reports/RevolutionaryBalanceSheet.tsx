'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { Scale, FileSpreadsheet, Printer } from 'lucide-react';
import * as XLSX from 'xlsx';

interface BalanceSheetItem {
  category: 'Assets' | 'Liabilities' | 'Equity';
  sub_category: string;
  account_name: string;
  balance: number;
}

interface RevolutionaryBalanceSheetProps {
  data: BalanceSheetItem[];
  reportDate: string;
}

export function RevolutionaryBalanceSheet({ data, reportDate }: RevolutionaryBalanceSheetProps) {
  
  const calculateTotal = (category: BalanceSheetItem['category'], subCategory?: string) =>
    data
      .filter(item => item.category === category && (!subCategory || item.sub_category === subCategory))
      .reduce((sum, item) => sum + item.balance, 0);

  const totalAssets = calculateTotal('Assets');
  const totalLiabilities = calculateTotal('Liabilities');
  const totalEquity = calculateTotal('Equity');
  const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;

  const exportToExcel = () => {
    const wsData = [
      ["Balance Sheet Report"],
      ["As of Date:", reportDate],
      [""],
      ["Category", "Sub-Category", "Account", "Balance"],
      ...data.map(i => [i.category, i.sub_category, i.account_name, i.balance]),
      [""],
      ["Total Assets", "", "", totalAssets],
      ["Total Liabilities", "", "", totalLiabilities],
      ["Total Equity", "", "", totalEquity]
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Balance Sheet");
    XLSX.writeFile(wb, `Balance_Sheet_${reportDate.replace(/ /g, '_')}.xlsx`);
  };

  const renderSection = (title: string, category: BalanceSheetItem['category']) => {
    const subCategories = [...new Set(data.filter(i => i.category === category).map(i => i.sub_category))];
    return (
      <>
        <TableRow className="font-extrabold text-lg bg-muted/50 hover:bg-muted/50">
          <TableCell colSpan={2}>{title}</TableCell>
        </TableRow>
        {subCategories.map(sub => (
          <React.Fragment key={sub}>
            <TableRow className="font-semibold bg-muted/20">
              <TableCell className="pl-8">{sub}</TableCell>
              <TableCell className="text-right font-bold">{formatCurrency(calculateTotal(category, sub), 'USD')}</TableCell>
            </TableRow>
            {data.filter(i => i.category === category && i.sub_category === sub).map((item, idx) => (
              <TableRow key={idx}>
                <TableCell className="pl-12 text-muted-foreground">{item.account_name}</TableCell>
                <TableCell className="text-right">{formatCurrency(item.balance, 'USD')}</TableCell>
              </TableRow>
            ))}
          </React.Fragment>
        ))}
        <TableRow className="font-bold text-lg border-t-2 bg-slate-50">
          <TableCell>Total {title}</TableCell>
          <TableCell className="text-right">{formatCurrency(calculateTotal(category), 'USD')}</TableCell>
        </TableRow>
      </>
    );
  };

  return (
    <Card className="shadow-xl border-border/60">
      <CardHeader className="flex flex-row items-center justify-between border-b pb-6">
        <div className="space-y-1">
          <CardTitle className="text-3xl flex items-center gap-3"><Scale className="w-8 h-8 text-blue-600" /> Balance Sheet</CardTitle>
          <CardDescription className="text-base">Financial Position Statement as of {reportDate}</CardDescription>
        </div>
        <div className="flex gap-2 print:hidden">
          <Button variant="outline" onClick={exportToExcel}><FileSpreadsheet className="mr-2 h-4 w-4" /> Excel</Button>
          <Button variant="outline" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" /> PDF</Button>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <Table>
          <TableBody>
            {renderSection('Assets', 'Assets')}
            <TableRow className="h-8 bg-transparent" />
            {renderSection('Liabilities', 'Liabilities')}
            <TableRow className="h-8 bg-transparent" />
            {renderSection('Equity', 'Equity')}
            <TableRow className="font-extrabold text-xl bg-blue-50 hover:bg-blue-50 h-16 border-t-4 border-blue-600">
              <TableCell>Total Liabilities & Equity</TableCell>
              <TableCell className="text-right">{formatCurrency(totalLiabilitiesAndEquity, 'USD')}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}