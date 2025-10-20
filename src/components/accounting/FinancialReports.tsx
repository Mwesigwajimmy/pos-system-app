'use client';

import React, { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { DateRange } from 'react-day-picker';
import { addDays, format } from 'date-fns';
import { useReactToPrint } from 'react-to-print';
import { CSVLink } from 'react-csv';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, AlertTriangle, Printer, Download } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

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

const formatCurrency = (value: number) => new Intl.NumberFormat('en-US').format(value);

// --- Printable Report Component ---
const PrintableReport = React.forwardRef<HTMLDivElement, { plData: PLData | undefined, bsData: BSData | undefined, dateRange: DateRange | undefined }>(({ plData, bsData, dateRange }, ref) => (
    <div ref={ref} className="p-8 bg-white text-black printable-area">
        <div className="text-center mb-8">
            <h1 className="text-2xl font-bold">Financial Statements</h1>
            <p className="text-sm">As of {format(new Date(), 'PPP')}</p>
        </div>

        {plData && (
            <div className="mb-10 page-break">
                <h2 className="text-xl font-semibold mb-2">Profit & Loss Statement</h2>
                <p className="text-xs mb-4">For the period: {dateRange?.from ? format(dateRange.from, 'PPP') : ''} - {dateRange?.to ? format(dateRange.to, 'PPP') : ''}</p>
                <Table>
                    {/* P&L Table Content (Copied from main component for printing) */}
                    <TableBody>
                        <TableRow className="font-bold"><TableCell>Revenue</TableCell><TableCell></TableCell></TableRow>
                        {plData.revenues.map(r => <TableRow key={r.name}><TableCell className="pl-8">{r.name}</TableCell><TableCell className="text-right">{formatCurrency(r.balance)}</TableCell></TableRow>)}
                        <TableRow className="font-semibold border-t"><TableCell>Total Revenue</TableCell><TableCell className="text-right">{formatCurrency(plData.totalRevenue)}</TableCell></TableRow>
                        <TableRow className="font-bold"><TableCell>Expenses</TableCell><TableCell></TableCell></TableRow>
                        {plData.expenses.map(e => <TableRow key={e.name}><TableCell className="pl-8">{e.name}</TableCell><TableCell className="text-right">{formatCurrency(e.balance)}</TableCell></TableRow>)}
                        <TableRow className="font-semibold border-t"><TableCell>Total Expenses</TableCell><TableCell className="text-right">{formatCurrency(plData.totalExpenses)}</TableCell></TableRow>
                    </TableBody>
                    <TableFooter><TableRow className="text-lg font-bold"><TableCell>Net Profit</TableCell><TableCell className="text-right">{formatCurrency(plData.netProfit)}</TableCell></TableRow></TableFooter>
                </Table>
            </div>
        )}

        {bsData && (
             <div>
                <h2 className="text-xl font-semibold mb-2">Balance Sheet</h2>
                <Table>
                    {/* Balance Sheet Table Content (Copied from main component for printing) */}
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
                    <TableFooter><TableRow className="text-lg font-bold"><TableCell>Total Liabilities + Equity</TableCell><TableCell className="text-right">{formatCurrency(bsData.totalLiabilities + bsData.totalEquity)}</TableCell></TableRow></TableFooter>
                </Table>
            </div>
        )}
    </div>
));
PrintableReport.displayName = 'PrintableReport';


export default function FinancialReports() {
  const [date, setDate] = useState<DateRange | undefined>({ from: addDays(new Date(), -29), to: new Date() });
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({ content: () => printRef.current });

  const { data: plData, refetch: refetchPL, isLoading: isLoadingPL, isError: isErrorPL, error: errorPL } = useQuery<PLData>({
    queryKey: ['profitAndLoss', date],
    queryFn: () => fetchPL(date!),
    enabled: false, 
  });

  const { data: bsData, isLoading: isLoadingBS, isError: isErrorBS, error: errorBS } = useQuery<BSData>({
    queryKey: ['balanceSheet'],
    queryFn: fetchBS, 
  });

  const plCsvData = plData ? [
    ...plData.revenues.map(r => ({ Section: 'Revenue', Account: r.name, Amount: r.balance })),
    { Section: 'Total Revenue', Account: '', Amount: plData.totalRevenue },
    ...plData.expenses.map(e => ({ Section: 'Expense', Account: e.name, Amount: e.balance })),
    { Section: 'Total Expenses', Account: '', Amount: plData.totalExpenses },
    { Section: 'Net Profit', Account: '', Amount: plData.netProfit },
  ] : [];

  return (
    <div className="space-y-6">
        {/* P&L Section */}
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle>Profit & Loss Statement</CardTitle>
                        <CardDescription>Analyze revenue and expenses over a specific period.</CardDescription>
                    </div>
                    {plData && (
                        <div className="flex gap-2">
                           <CSVLink data={plCsvData} filename={`p&l-report-${format(new Date(), 'yyyy-MM-dd')}.csv`}>
                                <Button variant="outline"><Download className="mr-2 h-4 w-4"/>Export P&L</Button>
                           </CSVLink>
                        </div>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center gap-4">
                    <DatePickerWithRange date={date} setDate={setDate} />
                    <Button onClick={() => refetchPL()} disabled={isLoadingPL}>
                        {isLoadingPL ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Generating...</> : "Generate P&L"}
                    </Button>
                </div>
                {isErrorPL && <p className="text-destructive p-4 bg-destructive/10 rounded-md"><AlertTriangle className="inline-block mr-2"/>Error: {String(errorPL)}</p>}
                {isLoadingPL && <div className="p-4"><Skeleton className="h-40 w-full"/></div>}
                {plData && (
                    <Table>
                        <TableHeader><TableRow><TableHead>Description</TableHead><TableHead className="text-right">Amount (UGX)</TableHead></TableRow></TableHeader>
                        <TableBody>
                            <TableRow className="font-bold"><TableCell>Revenue</TableCell><TableCell></TableCell></TableRow>
                            {plData.revenues.map(r => <TableRow key={r.name}><TableCell className="pl-8">{r.name}</TableCell><TableCell className="text-right">{formatCurrency(r.balance)}</TableCell></TableRow>)}
                            <TableRow className="font-semibold border-t"><TableCell>Total Revenue</TableCell><TableCell className="text-right">{formatCurrency(plData.totalRevenue)}</TableCell></TableRow>
                            <TableRow className="font-bold"><TableCell>Expenses</TableCell><TableCell></TableCell></TableRow>
                            {plData.expenses.map(e => <TableRow key={e.name}><TableCell className="pl-8">{e.name}</TableCell><TableCell className="text-right">{formatCurrency(e.balance)}</TableCell></TableRow>)}
                            <TableRow className="font-semibold border-t"><TableCell>Total Expenses</TableCell><TableCell className="text-right">{formatCurrency(plData.totalExpenses)}</TableCell></TableRow>
                        </TableBody>
                        <TableFooter><TableRow className="text-lg font-bold bg-muted/50"><TableCell>Net Profit</TableCell><TableCell className="text-right">{formatCurrency(plData.netProfit)}</TableCell></TableRow></TableFooter>
                    </Table>
                )}
            </CardContent>
        </Card>

        {/* Balance Sheet Section */}
        <Card>
            <CardHeader><CardTitle>Balance Sheet</CardTitle><CardDescription>A snapshot of your company's financial health.</CardDescription></CardHeader>
            <CardContent>
                {isErrorBS && <p className="text-destructive p-4 bg-destructive/10 rounded-md"><AlertTriangle className="inline-block mr-2"/>Error: {String(errorBS)}</p>}
                {isLoadingBS && <div className="p-4"><Skeleton className="h-64 w-full"/></div>}
                {bsData && (
                    <Table>
                        <TableHeader><TableRow><TableHead>Description</TableHead><TableHead className="text-right">Amount (UGX)</TableHead></TableRow></TableHeader>
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
                        <TableFooter><TableRow className="text-lg font-bold bg-muted/50"><TableCell>Total Liabilities + Equity</TableCell><TableCell className="text-right">{formatCurrency(bsData.totalLiabilities + bsData.totalEquity)}</TableCell></TableRow></TableFooter>
                    </Table>
                )}
            </CardContent>
        </Card>

        {/* Combined Actions */}
        {(plData || bsData) && (
            <Card>
                <CardHeader>
                    <CardTitle>Reporting Actions</CardTitle>
                    <CardDescription>Print or export a combined document of all generated reports.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={handlePrint}><Printer className="mr-2 h-4 w-4"/> Print Combined Report</Button>
                </CardContent>
            </Card>
        )}

        {/* Hidden component for printing */}
        <div className="hidden">
            <PrintableReport ref={printRef} plData={plData} bsData={bsData} dateRange={date} />
        </div>
    </div>
  );
}