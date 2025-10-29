'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableRow, TableHead, TableHeader } from '@/components/ui/table';
import { formatCurrency } from '@/lib/utils';

interface PnlItem {
  category: 'Revenue' | 'Cost of Goods Sold' | 'Operating Expenses';
  account_name: string;
  amount: number;
}

interface RevolutionaryProfitAndLossStatementProps {
  data: PnlItem[];
  reportPeriod: string;
}

export function RevolutionaryProfitAndLossStatement({ data, reportPeriod }: RevolutionaryProfitAndLossStatementProps) {
  const calculateTotal = (category: PnlItem['category']) =>
    data.filter(item => item.category === category).reduce((sum, item) => sum + item.amount, 0);

  const totalRevenue = calculateTotal('Revenue');
  const totalCogs = calculateTotal('Cost of Goods Sold');
  const grossProfit = totalRevenue - totalCogs;
  const totalOpex = calculateTotal('Operating Expenses');
  const netProfit = grossProfit - totalOpex;

  const renderSection = (title: string, category: PnlItem['category'], isSubSection: boolean = false) => (
    <>
      <TableRow className={`font-bold ${isSubSection ? 'bg-muted/30' : 'bg-muted/50'}`}>
        <TableCell colSpan={2}>{title}</TableCell>
      </TableRow>
      {data.filter(item => item.category === category).map((item, index) => (
        <TableRow key={index}>
          <TableCell className="pl-8">{item.account_name}</TableCell>
          <TableCell className="text-right">{formatCurrency(item.amount, 'USD')}</TableCell>
        </TableRow>
      ))}
      <TableRow className="font-semibold border-t">
        <TableCell>Total {title}</TableCell>
        <TableCell className="text-right">{formatCurrency(calculateTotal(category), 'USD')}</TableCell>
      </TableRow>
    </>
  );

  return (
    <Card className="shadow-lg border-border/60">
      <CardHeader>
        <CardTitle className="text-2xl">Profit & Loss Statement</CardTitle>
        <CardDescription>For the period: {reportPeriod}</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableBody>
            {renderSection('Revenue', 'Revenue')}

            <TableRow className="font-bold text-lg bg-transparent hover:bg-transparent h-12">
              <TableCell>Gross Profit</TableCell>
              <TableCell className="text-right">{formatCurrency(grossProfit, 'USD')}</TableCell>
            </TableRow>

            {renderSection('Cost of Goods Sold', 'Cost of Goods Sold', true)}
            {renderSection('Operating Expenses', 'Operating Expenses', true)}
            
            <TableRow className="font-extrabold text-xl bg-muted hover:bg-muted h-16 border-t-2 border-primary">
              <TableCell>Net Profit</TableCell>
              <TableCell className="text-right">{formatCurrency(netProfit, 'USD')}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}