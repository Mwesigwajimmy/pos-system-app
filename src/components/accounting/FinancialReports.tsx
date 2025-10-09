'use client';
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { DateRange } from 'react-day-picker';
import { addDays } from 'date-fns';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// Type definitions for our report data
interface ReportAccount { name: string; balance: number; }
interface PLData { revenues: ReportAccount[]; totalRevenue: number; expenses: ReportAccount[]; totalExpenses: number; netProfit: number; }
interface BSData { assets: ReportAccount[]; totalAssets: number; liabilities: ReportAccount[]; totalLiabilities: number; equity: ReportAccount[]; totalEquity: number; }

// Data fetching functions
async function fetchPL(dateRange: DateRange): Promise<PLData> {
    if (!dateRange.from || !dateRange.to) throw new Error("A valid date range is required for the P&L statement.");
    const supabase = createClient();
    const { data, error } = await supabase.rpc('get_profit_and_loss_statement', {
        p_start_date: dateRange.from.toISOString().split('T')[0],
        p_end_date: dateRange.to.toISOString().split('T')[0],
    });
    if (error) throw new Error(error.message);
    return data;
}

async function fetchBS(): Promise<BSData> {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('get_balance_sheet');
    if (error) throw new Error(error.message);
    return data;
}

const formatCurrency = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'UGX' }).format(value);

export default function FinancialReports() {
  const [date, setDate] = useState<DateRange | undefined>({ from: addDays(new Date(), -29), to: new Date() });

  // Separate, professional useQuery calls for each report
  const { data: plData, refetch: refetchPL, isLoading: isLoadingPL, isError: isErrorPL, error: errorPL } = useQuery<PLData>({
    queryKey: ['profitAndLoss', date],
    queryFn: () => fetchPL(date!),
    enabled: false, // Only run when the button is clicked
  });

  const { data: bsData, isLoading: isLoadingBS } = useQuery<BSData>({
    queryKey: ['balanceSheet'],
    queryFn: fetchBS, // Fetches automatically on page load
  });

  return (
    <div className="space-y-6">
        {/* P&L Section */}
        <Card>
            <CardHeader>
                <CardTitle>Profit & Loss Statement</CardTitle>
                <CardDescription>Analyze your revenue and expenses over a specific period to determine profitability.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                    <DatePickerWithRange date={date} setDate={setDate} />
                    <Button onClick={() => refetchPL()} disabled={isLoadingPL}>
                        {isLoadingPL ? "Generating P&L..." : "Generate P&L"}
                    </Button>
                </div>
                {isErrorPL && <p className="text-destructive">Error: {String(errorPL)}</p>}
                {plData && (
                    <Table>
                        <TableHeader><TableRow><TableHead>Description</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
                        <TableBody>
                            <TableRow className="font-bold"><TableCell>Revenue</TableCell><TableCell></TableCell></TableRow>
                            {plData.revenues.map(r => <TableRow key={r.name}><TableCell className="pl-8">{r.name}</TableCell><TableCell className="text-right">{formatCurrency(r.balance)}</TableCell></TableRow>)}
                            <TableRow className="font-semibold border-t"><TableCell>Total Revenue</TableCell><TableCell className="text-right">{formatCurrency(plData.totalRevenue)}</TableCell></TableRow>
                            <TableRow className="font-bold"><TableCell>Expenses</TableCell><TableCell></TableCell></TableRow>
                            {plData.expenses.map(e => <TableRow key={e.name}><TableCell className="pl-8">{e.name}</TableCell><TableCell className="text-right">{formatCurrency(e.balance)}</TableCell></TableRow>)}
                            <TableRow className="font-semibold border-t"><TableCell>Total Expenses</TableCell><TableCell className="text-right">{formatCurrency(plData.totalExpenses)}</TableCell></TableRow>
                        </TableBody>
                        <TableFooter><TableRow className="text-lg font-bold bg-secondary"><TableCell>Net Profit</TableCell><TableCell className="text-right">{formatCurrency(plData.netProfit)}</TableCell></TableRow></TableFooter>
                    </Table>
                )}
            </CardContent>
        </Card>

        {/* Balance Sheet Section */}
        <Card>
            <CardHeader><CardTitle>Balance Sheet</CardTitle><CardDescription>A snapshot of your company's financial health, showing assets, liabilities, and equity.</CardDescription></CardHeader>
            <CardContent>
                {isLoadingBS && <p>Loading Balance Sheet...</p>}
                {bsData && (
                    <Table>
                        <TableHeader><TableRow><TableHead>Description</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
                        <TableBody>
                            <TableRow className="font-bold"><TableCell>Assets</TableCell><TableCell></TableCell></TableRow>
                            {bsData.assets.map(a => <TableRow key={a.name}><TableCell className="pl-8">{a.name}</TableCell><TableCell className="text-right">{formatCurrency(a.balance)}</TableCell></TableRow>)}
                            <TableRow className="font-semibold border-t"><TableCell>Total Assets</TableCell><TableCell className="text-right">{formatCurrency(bsData.totalAssets)}</TableCell></TableRow>
                            <TableRow className="font-bold"><TableCell>Liabilities</TableCell><TableCell></TableCell></TableRow>
                            {bsData.liabilities.map(l => <TableRow key={l.name}><TableCell className="pl-8">{l.name}</TableCell><TableCell className="text-right">{formatCurrency(l.balance)}</TableCell></TableRow>)}
                            <TableRow className="font-semibold border-t"><TableCell>Total Liabilities</TableCell><TableCell className="text-right">{formatCurrency(bsData.totalLiabilities)}</TableCell></TableRow>
                             <TableRow className="font-bold"><TableCell>Equity</TableCell><TableCell></TableCell></TableRow>
                            {bsData.equity.map(eq => <TableRow key={eq.name}><TableCell className="pl-8">{eq.name}</TableCell><TableCell className="text-right">{formatCurrency(eq.balance)}</TableCell></TableRow>)}
                            <TableRow className="font-semibold border-t"><TableCell>Total Equity</TableCell><TableCell className="text-right">{formatCurrency(bsData.totalEquity)}</TableCell></TableRow>
                        </TableBody>
                        <TableFooter><TableRow className="text-lg font-bold bg-secondary"><TableCell>Total Liabilities + Equity</TableCell><TableCell className="text-right">{formatCurrency(bsData.totalLiabilities + bsData.totalEquity)}</TableCell></TableRow></TableFooter>
                    </Table>
                )}
            </CardContent>
        </Card>
    </div>
  );
}