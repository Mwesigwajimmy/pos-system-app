"use client";

import { useState, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { format, parseISO, subMonths } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from '@/components/ui/button';
import { RevolutionaryProfitAndLossStatement } from './RevolutionaryProfitAndLossStatement';
import { MapPin, Briefcase, Printer, LineChart, TrendingUp, Wallet, ArrowUpRight } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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
    prevPnl?: ProfitAndLossRecord[];
    bs: BalanceSheetRecord[];
    trends: { month: string, rev: number, exp: number }[];
    pnlPeriod: string;
    bsDate: string;
    locations: { id: string, name: string }[];
    projects: { id: string, name: string }[];
}

function BalanceSheetView({ data, dateStr }: { data: BalanceSheetRecord[], dateStr: string }) {
    const assets = data.filter(d => d.category === 'Assets').reduce((acc, curr) => acc + curr.balance, 0);
    const liabilities = data.filter(d => d.category === 'Liabilities').reduce((acc, curr) => acc + curr.balance, 0);
    const equity = data.filter(d => d.category === 'Equity').reduce((acc, curr) => acc + curr.balance, 0);

    return (
        <Card className="shadow-2xl border-none">
            <CardHeader className="flex flex-row items-center justify-between border-b bg-slate-50/50 pb-6">
                <div>
                    <CardTitle className="text-2xl font-bold flex items-center gap-2">
                        <Wallet className="text-blue-600" /> Statement of Financial Position
                    </CardTitle>
                    <CardDescription className="font-medium text-slate-500 text-sm italic">Consolidated balances as of {dateStr}</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => window.print()} className="print:hidden font-bold border-slate-300">
                    <Printer className="mr-2 h-4 w-4" /> Export Report
                </Button>
            </CardHeader>
            <CardContent className="p-0">
                 <Table>
                    <TableHeader>
                        <TableRow className="bg-slate-100/50 hover:bg-slate-100/50">
                            <TableHead className="w-2/3 font-bold text-slate-900 uppercase tracking-widest text-[10px]">Account Classification</TableHead>
                            <TableHead className="text-right font-bold text-slate-900 uppercase tracking-widest text-[10px]">Final Balance</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        <TableRow className="bg-blue-50/30 font-bold"><TableCell className="text-blue-900">ASSET ACCOUNTS</TableCell><TableCell></TableCell></TableRow>
                        {data.filter(d => d.category === 'Assets').map((d, i) => (
                            <TableRow key={i} className="hover:bg-slate-50/50"><TableCell className="pl-8 text-slate-600">{d.account_name}</TableCell><TableCell className="text-right font-mono font-medium">{d.balance.toLocaleString()}</TableCell></TableRow>
                        ))}
                        <TableRow className="font-bold border-t bg-slate-100/30 text-lg"><TableCell>TOTAL ASSETS</TableCell><TableCell className="text-right font-mono">{assets.toLocaleString()}</TableCell></TableRow>
                        
                        <TableRow className="bg-red-50/30 font-bold mt-4"><TableCell className="text-red-900">LIABILITY ACCOUNTS</TableCell><TableCell></TableCell></TableRow>
                        {data.filter(d => d.category === 'Liabilities').map((d, i) => (
                            <TableRow key={i} className="hover:bg-slate-50/50"><TableCell className="pl-8 text-slate-600">{d.account_name}</TableCell><TableCell className="text-right font-mono font-medium">{d.balance.toLocaleString()}</TableCell></TableRow>
                        ))}
                        <TableRow className="font-bold border-t bg-slate-100/30 text-lg"><TableCell>TOTAL LIABILITIES</TableCell><TableCell className="text-right font-mono">{liabilities.toLocaleString()}</TableCell></TableRow>
                        
                        <TableRow className="bg-green-50/30 font-bold mt-4"><TableCell className="text-green-900">EQUITY & RETAINED EARNINGS</TableCell><TableCell></TableCell></TableRow>
                        {data.filter(d => d.category === 'Equity').map((d, i) => (
                            <TableRow key={i} className="hover:bg-slate-50/50"><TableCell className="pl-8 text-slate-600">{d.account_name}</TableCell><TableCell className="text-right font-mono font-medium">{d.balance.toLocaleString()}</TableCell></TableRow>
                        ))}
                        <TableRow className="font-bold border-t bg-slate-100/30 text-lg border-b-2"><TableCell>TOTAL EQUITY</TableCell><TableCell className="text-right font-mono">{equity.toLocaleString()}</TableCell></TableRow>
                        
                        <TableRow className="font-black border-t-4 bg-slate-900 text-white hover:bg-slate-900 h-20 uppercase tracking-widest text-xl">
                            <TableCell className="pl-6">Liabilities & Equity</TableCell>
                            <TableCell className="text-right pr-6 font-mono font-black">{(liabilities + equity).toLocaleString()}</TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

export function FinanceHub({ pnl, prevPnl, bs, trends, pnlPeriod, bsDate, locations = [], projects = [] }: FinanceHubProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [date, setDate] = useState<DateRange | undefined>(() => {
        const from = searchParams.get('from');
        const to = searchParams.get('to');
        return (from && to) ? { from: parseISO(from), to: parseISO(to) } : undefined;
    });

    const handleFilterChange = (key: string, value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (value === 'all') params.delete(key);
        else params.set(key, value);
        router.push(`${pathname}?${params.toString()}`);
    };

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
            {/* Enterprise Visualization Layer */}
            <Card className="bg-slate-900 text-white border-none shadow-2xl overflow-hidden print:hidden">
                <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                        <LineChart className="text-blue-400 w-5 h-5" />
                        <CardTitle className="text-xs uppercase tracking-[0.2em] font-black text-slate-400">Revenue Performance Trend (6 Months)</CardTitle>
                    </div>
                    <div className="flex items-center gap-2 text-green-400 text-xs font-bold bg-green-950/40 px-3 py-1 rounded-full border border-green-900/50">
                        <TrendingUp size={14} /> LIVE ANALYTICS
                    </div>
                </CardHeader>
                <CardContent className="h-[240px] pt-8 px-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={trends}>
                            <defs>
                                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                            <XAxis dataKey="month" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} tickMargin={10} />
                            <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val/1000}k`} />
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.5)' }}
                                itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                                labelStyle={{ color: '#64748b', marginBottom: '4px', fontSize: '10px' }}
                            />
                            <Area type="monotone" dataKey="rev" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorRev)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            <div className="flex flex-col gap-6 bg-white p-6 rounded-2xl border shadow-lg print:hidden">
                <div className="flex flex-wrap gap-4 items-center">
                    <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200">
                        <MapPin className="w-4 h-4 text-blue-500" />
                        <Select onValueChange={(v) => handleFilterChange('locationId', v)} defaultValue={searchParams.get('locationId') || 'all'}>
                            <SelectTrigger className="w-[180px] border-none bg-transparent shadow-none focus:ring-0 font-bold"><SelectValue placeholder="All Branches" /></SelectTrigger>
                            <SelectContent className="rounded-xl border-slate-200">
                                <SelectItem value="all" className="font-medium italic text-slate-400">Main Consolidated</SelectItem>
                                {locations.map(loc => <SelectItem key={loc.id} value={loc.id} className="font-bold">{loc.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200">
                        <Briefcase className="w-4 h-4 text-purple-500" />
                        <Select onValueChange={(v) => handleFilterChange('projectId', v)} defaultValue={searchParams.get('projectId') || 'all'}>
                            <SelectTrigger className="w-[180px] border-none bg-transparent shadow-none focus:ring-0 font-bold"><SelectValue placeholder="All Projects" /></SelectTrigger>
                            <SelectContent className="rounded-xl border-slate-200">
                                <SelectItem value="all" className="font-medium italic text-slate-400">All Operations</SelectItem>
                                {projects.map(proj => <SelectItem key={proj.id} value={proj.id} className="font-bold">{proj.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="ml-auto flex items-center gap-3">
                        <DatePickerWithRange date={date} setDate={setDate} />
                    </div>
                </div>
            </div>

            <Tabs defaultValue="pnl" className="w-full">
                <TabsList className="w-full md:w-auto grid grid-cols-2 md:inline-flex mb-6 print:hidden h-12 p-1.5 bg-slate-100 rounded-xl">
                    <TabsTrigger value="pnl" className="rounded-lg font-black text-xs uppercase tracking-widest px-8">Income Performance</TabsTrigger>
                    <TabsTrigger value="bs" className="rounded-lg font-black text-xs uppercase tracking-widest px-8">Financial Position</TabsTrigger>
                </TabsList>
                <TabsContent value="pnl">
                    <RevolutionaryProfitAndLossStatement data={pnl} prevData={prevPnl} reportPeriod={pnlPeriod} />
                </TabsContent>
                <TabsContent value="bs">
                    <BalanceSheetView data={bs} dateStr={bsDate} />
                </TabsContent>
            </Tabs>
        </div>
    );
}