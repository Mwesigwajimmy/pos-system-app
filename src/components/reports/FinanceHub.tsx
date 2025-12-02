"use client";

import { useState, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { DatePickerWithRange } from '@/components/ui/date-range-picker'; // Standard component
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// --- Shared Types ---
export interface ProfitAndLossRecord {
  category: 'Revenue' | 'Cost of Goods Sold' | 'Operating Expenses';
  account_name: string;
  amount: number;
}

export interface BalanceSheetRecord {
  category: 'Assets' | 'Liabilities' | 'Equity';
  sub_category: string;
  account_name: string;
  balance: number;
}

interface FinanceHubProps {
    pnl: ProfitAndLossRecord[];
    bs: BalanceSheetRecord[];
    pnlPeriod: string;
    bsDate: string;
}

// --- Sub-Component: P&L Display ---
function ProfitAndLossView({ data, period }: { data: ProfitAndLossRecord[], period: string }) {
    const revenue = data.filter(d => d.category === 'Revenue').reduce((acc, curr) => acc + curr.amount, 0);
    const cogs = data.filter(d => d.category === 'Cost of Goods Sold').reduce((acc, curr) => acc + curr.amount, 0);
    const expenses = data.filter(d => d.category === 'Operating Expenses').reduce((acc, curr) => acc + curr.amount, 0);
    const grossProfit = revenue - cogs;
    const netIncome = grossProfit - expenses;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Profit & Loss Statement</CardTitle>
                <CardDescription>Period: {period}</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow><TableHead>Account</TableHead><TableHead className="text-right">Amount</TableHead></TableRow>
                    </TableHeader>
                    <TableBody>
                        <TableRow className="bg-slate-50 font-semibold"><TableCell>Revenue</TableCell><TableCell></TableCell></TableRow>
                        {data.filter(d => d.category === 'Revenue').map((d, i) => (
                            <TableRow key={i}><TableCell className="pl-6">{d.account_name}</TableCell><TableCell className="text-right">{d.amount.toLocaleString()}</TableCell></TableRow>
                        ))}
                        <TableRow className="font-bold border-t"><TableCell>Total Revenue</TableCell><TableCell className="text-right">{revenue.toLocaleString()}</TableCell></TableRow>
                        
                        <TableRow className="bg-slate-50 font-semibold mt-4"><TableCell>Cost of Goods Sold</TableCell><TableCell></TableCell></TableRow>
                        {data.filter(d => d.category === 'Cost of Goods Sold').map((d, i) => (
                            <TableRow key={i}><TableCell className="pl-6">{d.account_name}</TableCell><TableCell className="text-right">{d.amount.toLocaleString()}</TableCell></TableRow>
                        ))}
                        
                        <TableRow className="font-bold border-t bg-blue-50 text-blue-900"><TableCell>Gross Profit</TableCell><TableCell className="text-right">{grossProfit.toLocaleString()}</TableCell></TableRow>

                        <TableRow className="bg-slate-50 font-semibold mt-4"><TableCell>Operating Expenses</TableCell><TableCell></TableCell></TableRow>
                        {data.filter(d => d.category === 'Operating Expenses').map((d, i) => (
                            <TableRow key={i}><TableCell className="pl-6">{d.account_name}</TableCell><TableCell className="text-right">{d.amount.toLocaleString()}</TableCell></TableRow>
                        ))}
                        <TableRow className="font-bold border-t"><TableCell>Total Expenses</TableCell><TableCell className="text-right">{expenses.toLocaleString()}</TableCell></TableRow>

                        <TableRow className="font-bold border-t-2 text-lg bg-green-50 text-green-900"><TableCell>Net Income</TableCell><TableCell className="text-right">{netIncome.toLocaleString()}</TableCell></TableRow>
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

// --- Sub-Component: Balance Sheet Display ---
function BalanceSheetView({ data, dateStr }: { data: BalanceSheetRecord[], dateStr: string }) {
    const assets = data.filter(d => d.category === 'Assets').reduce((acc, curr) => acc + curr.balance, 0);
    const liabilities = data.filter(d => d.category === 'Liabilities').reduce((acc, curr) => acc + curr.balance, 0);
    const equity = data.filter(d => d.category === 'Equity').reduce((acc, curr) => acc + curr.balance, 0);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Balance Sheet</CardTitle>
                <CardDescription>As of: {dateStr}</CardDescription>
            </CardHeader>
            <CardContent>
                 <Table>
                    <TableHeader>
                        <TableRow><TableHead>Account</TableHead><TableHead className="text-right">Balance</TableHead></TableRow>
                    </TableHeader>
                    <TableBody>
                        <TableRow className="bg-slate-50 font-semibold"><TableCell>Assets</TableCell><TableCell></TableCell></TableRow>
                        {data.filter(d => d.category === 'Assets').map((d, i) => (
                            <TableRow key={i}><TableCell className="pl-6">{d.account_name}</TableCell><TableCell className="text-right">{d.balance.toLocaleString()}</TableCell></TableRow>
                        ))}
                        <TableRow className="font-bold border-t bg-slate-100"><TableCell>Total Assets</TableCell><TableCell className="text-right">{assets.toLocaleString()}</TableCell></TableRow>

                        <TableRow className="bg-slate-50 font-semibold mt-4"><TableCell>Liabilities</TableCell><TableCell></TableCell></TableRow>
                        {data.filter(d => d.category === 'Liabilities').map((d, i) => (
                            <TableRow key={i}><TableCell className="pl-6">{d.account_name}</TableCell><TableCell className="text-right">{d.balance.toLocaleString()}</TableCell></TableRow>
                        ))}
                        <TableRow className="font-bold border-t"><TableCell>Total Liabilities</TableCell><TableCell className="text-right">{liabilities.toLocaleString()}</TableCell></TableRow>

                        <TableRow className="bg-slate-50 font-semibold mt-4"><TableCell>Equity</TableCell><TableCell></TableCell></TableRow>
                        {data.filter(d => d.category === 'Equity').map((d, i) => (
                            <TableRow key={i}><TableCell className="pl-6">{d.account_name}</TableCell><TableCell className="text-right">{d.balance.toLocaleString()}</TableCell></TableRow>
                        ))}
                        <TableRow className="font-bold border-t"><TableCell>Total Equity</TableCell><TableCell className="text-right">{equity.toLocaleString()}</TableCell></TableRow>
                        
                        <TableRow className="font-bold border-t-2 bg-slate-100"><TableCell>Total Liabilities & Equity</TableCell><TableCell className="text-right">{(liabilities + equity).toLocaleString()}</TableCell></TableRow>
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

// --- Main Hub Component ---
export function FinanceHub({ pnl, bs, pnlPeriod, bsDate }: FinanceHubProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [date, setDate] = useState<DateRange | undefined>(() => {
        const from = searchParams.get('from');
        const to = searchParams.get('to');
        return (from && to) ? { from: parseISO(from), to: parseISO(to) } : undefined;
    });

    useEffect(() => {
        if (date?.from && date?.to) {
            const params = new URLSearchParams(searchParams.toString());
            params.set('from', format(date.from, 'yyyy-MM-dd'));
            params.set('to', format(date.to, 'yyyy-MM-dd'));
            router.push(`${pathname}?${params.toString()}`);
        }
    }, [date, pathname, router, searchParams]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 bg-white p-6 rounded-lg border shadow-sm">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Financial Intelligence Hub</h1>
                    <p className="text-slate-500">Generate, visualize, and drill down into key financial statements.</p>
                </div>
                <div className="w-full md:w-auto">
                     <DatePickerWithRange date={date} setDate={setDate} />
                </div>
            </div>

            <Tabs defaultValue="pnl" className="w-full">
                <TabsList className="w-full md:w-auto grid grid-cols-2 md:inline-flex mb-4">
                    <TabsTrigger value="pnl">Profit & Loss</TabsTrigger>
                    <TabsTrigger value="bs">Balance Sheet</TabsTrigger>
                </TabsList>
                <TabsContent value="pnl">
                    <ProfitAndLossView data={pnl} period={pnlPeriod} />
                </TabsContent>
                <TabsContent value="bs">
                    <BalanceSheetView data={bs} dateStr={bsDate} />
                </TabsContent>
            </Tabs>
        </div>
    );
}