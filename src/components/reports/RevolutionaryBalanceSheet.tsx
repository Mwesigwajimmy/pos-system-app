'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableRow, TableHead, TableHeader } from '@/components/ui/table';
import { formatCurrency } from '@/lib/utils';
import { Scale, Landmark, HandCoins, Building, FileText, Wallet } from 'lucide-react';

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
              <TableCell className="text-right">{formatCurrency(calculateTotal(category, sub), 'USD')}</TableCell>
            </TableRow>
            {data.filter(i => i.category === category && i.sub_category === sub).map((item, idx) => (
              <TableRow key={idx}>
                <TableCell className="pl-12 text-muted-foreground">{item.account_name}</TableCell>
                <TableCell className="text-right">{formatCurrency(item.balance, 'USD')}</TableCell>
              </TableRow>
            ))}
          </React.Fragment>
        ))}
        <TableRow className="font-bold text-lg border-t-2">
          <TableCell>Total {title}</TableCell>
          <TableCell className="text-right">{formatCurrency(calculateTotal(category), 'USD')}</TableCell>
        </TableRow>
      </>
    );
  };

  return (
    <Card className="shadow-lg border-border/60">
      <CardHeader>
        <CardTitle className="text-2xl flex items-center gap-2"><Scale /> Balance Sheet</CardTitle>
        <CardDescription>As of {reportDate}</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableBody>
            {renderSection('Assets', 'Assets')}
            <TableRow className="h-8 bg-transparent hover:bg-transparent" />
            {renderSection('Liabilities', 'Liabilities')}
            <TableRow className="h-4 bg-transparent hover:bg-transparent" />
            {renderSection('Equity', 'Equity')}
            <TableRow className="font-extrabold text-xl bg-muted hover:bg-muted h-16 border-t-2 border-primary">
              <TableCell>Total Liabilities & Equity</TableCell>
              <TableCell className="text-right">{formatCurrency(totalLiabilitiesAndEquity, 'USD')}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}