'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DollarSign, Percent, Landmark } from 'lucide-react';
import { formatCurrency, formatNumber } from '@/lib/utils'; // Assuming you have a utils file for formatting

export interface TaxSummary {
  total_revenue: number;
  total_taxable_revenue: number;
  total_tax_collected: number;
}

export interface TaxableTransaction {
  id: string;
  date: string;
  description: string;
  invoice_id: string;
  taxable_amount: number;
  tax_collected: number;
}

interface RevolutionarySalesTaxDashboardProps {
  summary: TaxSummary;
  transactions: TaxableTransaction[];
  reportPeriod: string;
}

export function RevolutionarySalesTaxDashboard({ summary, transactions, reportPeriod }: RevolutionarySalesTaxDashboardProps) {
  const effectiveTaxRate = summary.total_taxable_revenue > 0 ? (summary.total_tax_collected / summary.total_taxable_revenue) * 100 : 0;

  return (
    <Card className="h-full flex flex-col shadow-lg border-border/60">
      <CardHeader>
        <CardTitle className="text-2xl">Sales Tax Summary</CardTitle>
        <CardDescription>A detailed analysis of sales tax collected for the period: {reportPeriod}</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow grid gap-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
          <div className="p-4 bg-muted/50 rounded-lg">
            <Landmark className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
            <p className="text-2xl font-bold">{formatCurrency(summary.total_revenue, 'USD')}</p>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg">
            <DollarSign className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm font-medium text-muted-foreground">Tax Collected</p>
            <p className="text-2xl font-bold text-primary">{formatCurrency(summary.total_tax_collected, 'USD')}</p>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg">
            <Percent className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm font-medium text-muted-foreground">Effective Tax Rate</p>
            <p className="text-2xl font-bold">{formatNumber(effectiveTaxRate, 2)}%</p>
          </div>
        </div>
        <div>
          <h3 className="text-lg font-semibold mb-2">Taxable Transactions</h3>
          <ScrollArea className="h-72 w-full rounded-md border">
            <Table>
              <TableHeader className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                <TableRow>
                  <TableHead>Invoice ID</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Tax</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.length > 0 ? (
                  transactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="font-mono text-xs">{tx.invoice_id}</TableCell>
                      <TableCell className="font-medium truncate max-w-xs">{tx.description}</TableCell>
                      <TableCell className="text-right">{formatCurrency(tx.taxable_amount, 'USD')}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(tx.tax_collected, 'USD')}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      No taxable transactions for this period.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}