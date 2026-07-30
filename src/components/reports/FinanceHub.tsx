"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RevolutionaryProfitAndLossStatement } from './RevolutionaryProfitAndLossStatement';
import { Printer } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export interface ProfitAndLossRecord {
  category: 'Revenue' | 'Cost of Goods Sold' | 'Operating Expenses' | string;
  account_name: string;
  amount: number;
}

export interface BalanceSheetRecord {
  category: 'Assets' | 'Liabilities' | 'Equity' | string;
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

const isCategoryMatch = (itemCat: string, targetCat: string) => {
  const item = itemCat?.toLowerCase() || '';
  const target = targetCat?.toLowerCase() || '';
  return item === target ||
         item === target.replace(/s$/, '') ||
         (target === 'liabilities' && item === 'liability') ||
         (target === 'assets' && item === 'asset');
};

const fmt = (value: number) =>
  (Number(value) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const compact = (value: number) =>
  new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(Number(value) || 0);

function BalanceSheetGroup({
  title,
  rows,
  totalLabel,
  total,
  emphasis = false,
}: {
  title: string;
  rows: BalanceSheetRecord[];
  totalLabel: string;
  total: number;
  emphasis?: boolean;
}) {
  return (
    <>
      <TableRow className="hover:bg-transparent">
        <TableCell
          colSpan={2}
          className="pt-8 pb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400"
        >
          {title}
        </TableCell>
      </TableRow>
      {rows.length > 0 ? (
        rows.map((row, i) => (
          <TableRow key={i} className="border-0 hover:bg-slate-50">
            <TableCell className="py-2.5 pl-8 text-sm text-slate-600">{row.account_name}</TableCell>
            <TableCell className="py-2.5 pr-6 text-right text-sm tabular-nums text-slate-700">
              {fmt(row.balance)}
            </TableCell>
          </TableRow>
        ))
      ) : (
        <TableRow className="border-0 hover:bg-transparent">
          <TableCell colSpan={2} className="py-2.5 pl-8 text-sm text-slate-400">
            No accounts
          </TableCell>
        </TableRow>
      )}
      <TableRow className="hover:bg-transparent">
        <TableCell
          className={`py-3.5 text-sm font-semibold text-slate-900 ${emphasis ? 'border-t-2 border-slate-900' : 'border-t border-slate-200'}`}
        >
          {totalLabel}
        </TableCell>
        <TableCell
          className={`py-3.5 pr-6 text-right text-sm font-semibold tabular-nums text-slate-900 ${emphasis ? 'border-t-2 border-slate-900' : 'border-t border-slate-200'}`}
        >
          {fmt(total)}
        </TableCell>
      </TableRow>
    </>
  );
}

function BalanceSheetView({ data, dateStr }: { data: BalanceSheetRecord[], dateStr: string }) {
  const assetRows = data.filter(d => isCategoryMatch(d.category, 'Assets'));
  const liabilityRows = data.filter(d => isCategoryMatch(d.category, 'Liabilities'));
  const equityRows = data.filter(d => isCategoryMatch(d.category, 'Equity'));

  const assets = assetRows.reduce((acc, curr) => acc + curr.balance, 0);
  const liabilities = liabilityRows.reduce((acc, curr) => acc + curr.balance, 0);
  const equity = equityRows.reduce((acc, curr) => acc + curr.balance, 0);

  return (
    <Card className="rounded-xl border-slate-200 shadow-sm print:border-0 print:shadow-none">
      <CardHeader className="flex flex-row items-center justify-between gap-6 border-b border-slate-200 px-8 py-6">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-slate-900">Balance Sheet</h2>
          <p className="mt-1 text-sm text-slate-500">As at {dateStr}</p>
        </div>
        <Button
          variant="outline"
          onClick={() => window.print()}
          className="h-9 rounded-lg border-slate-200 px-4 text-xs font-medium print:hidden"
        >
          <Printer className="mr-2 h-4 w-4 text-slate-400" />
          Print
        </Button>
      </CardHeader>
      <CardContent className="px-2 pb-8 pt-0 md:px-6">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-2/3 py-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                Account
              </TableHead>
              <TableHead className="py-4 pr-6 text-right text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                Balance
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <BalanceSheetGroup title="Assets" rows={assetRows} totalLabel="Total assets" total={assets} emphasis />
            <BalanceSheetGroup
              title="Liabilities"
              rows={liabilityRows}
              totalLabel="Total liabilities"
              total={liabilities}
            />
            <BalanceSheetGroup title="Equity" rows={equityRows} totalLabel="Total equity" total={equity} />
            <TableRow className="hover:bg-transparent">
              <TableCell className="border-t-2 border-slate-900 py-4 text-sm font-semibold text-slate-900">
                Total liabilities and equity
              </TableCell>
              <TableCell className="border-t-2 border-slate-900 py-4 pr-6 text-right text-sm font-semibold tabular-nums text-slate-900">
                {fmt(liabilities + equity)}
              </TableCell>
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
  const isFirstRender = useRef(true);

  const mapPnlData = (items: ProfitAndLossRecord[]) => items.map(item => {
    const name = item.account_name?.toLowerCase() || '';
    const dbType = item.category?.toUpperCase() || '';

    if (
        dbType === 'COGS' ||
        name.includes('cost of goods sold') ||
        name.includes('cost of sales') ||
        name.includes('cogs')
    ) {
        return { ...item, category: 'Cost of Goods Sold' as const };
    }

    if (item.category?.toLowerCase().includes('expense')) {
        return { ...item, category: 'Operating Expenses' as const };
    }

    return item;
  });

  const processedPnl = mapPnlData(pnl);
  const processedPrevPnl = prevPnl ? mapPnlData(prevPnl) : [];

  const [date, setDate] = useState<DateRange | undefined>(() => {
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');
    if (fromParam && toParam) {
      return { from: parseISO(fromParam), to: parseISO(toParam) };
    }
    return { from: startOfMonth(new Date()), to: endOfMonth(new Date()) };
  });

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === 'all') params.delete(key);
    else params.set(key, value);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (date?.from && date?.to) {
      const params = new URLSearchParams(searchParams.toString());
      const newFrom = format(date.from, 'yyyy-MM-dd');
      const newTo = format(date.to, 'yyyy-MM-dd');

      if (params.get('from') !== newFrom || params.get('to') !== newTo) {
        params.set('from', newFrom);
        params.set('to', newTo);
        router.push(`${pathname}?${params.toString()}`, { scroll: false });
      }
    }
  }, [date, pathname, router, searchParams]);

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-6 px-4 pb-16 xl:px-8">
      <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white px-5 py-4 lg:flex-row lg:items-center lg:justify-between print:hidden">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2.5">
            <Label className="text-xs font-medium text-slate-500">Branch</Label>
            <Select
              onValueChange={(v) => handleFilterChange('locationId', v)}
              defaultValue={searchParams.get('locationId') || 'all'}
            >
              <SelectTrigger className="h-9 w-[200px] rounded-lg border-slate-200 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-lg">
                <SelectItem value="all">All branches</SelectItem>
                {locations.map(loc => <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2.5">
            <Label className="text-xs font-medium text-slate-500">Project</Label>
            <Select
              onValueChange={(v) => handleFilterChange('projectId', v)}
              defaultValue={searchParams.get('projectId') || 'all'}
            >
              <SelectTrigger className="h-9 w-[200px] rounded-lg border-slate-200 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-lg">
                <SelectItem value="all">All projects</SelectItem>
                {projects.map(proj => <SelectItem key={proj.id} value={proj.id}>{proj.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Label className="text-xs font-medium text-slate-500">Period</Label>
          <DatePickerWithRange date={date} setDate={setDate} />
        </div>
      </div>

      <Card className="rounded-xl border-slate-200 shadow-sm print:hidden">
        <CardHeader className="flex flex-row items-center justify-between border-b border-slate-200 px-6 py-5">
          <h2 className="text-sm font-semibold text-slate-900">Revenue and expenses</h2>
          <div className="flex items-center gap-5 text-xs text-slate-500">
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-slate-900" />
              Revenue
            </span>
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-slate-300" />
              Expenses
            </span>
          </div>
        </CardHeader>
        <CardContent className="h-[260px] px-2 py-6">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trends} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0f172a" stopOpacity={0.14} />
                  <stop offset="100%" stopColor="#0f172a" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#94a3b8" stopOpacity={0.16} />
                  <stop offset="100%" stopColor="#94a3b8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickMargin={10} />
              <YAxis
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                width={56}
                tickFormatter={(val) => compact(val)}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgb(15 23 42 / 0.08)',
                  fontSize: '12px',
                }}
                itemStyle={{ color: '#0f172a' }}
                labelStyle={{ color: '#64748b', marginBottom: '4px' }}
                formatter={(value: number) => fmt(value)}
              />
              <Area
                type="monotone"
                dataKey="rev"
                name="Revenue"
                stroke="#0f172a"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorRev)"
              />
              <Area
                type="monotone"
                dataKey="exp"
                name="Expenses"
                stroke="#94a3b8"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorExp)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Tabs defaultValue="pnl" className="w-full">
        <TabsList className="mb-6 grid h-10 w-full grid-cols-2 rounded-lg bg-slate-100 p-1 md:inline-flex md:w-auto print:hidden">
          <TabsTrigger value="pnl" className="rounded-md px-8 text-xs font-medium">Income statement</TabsTrigger>
          <TabsTrigger value="bs" className="rounded-md px-8 text-xs font-medium">Balance sheet</TabsTrigger>
        </TabsList>
        <TabsContent value="pnl">
          <RevolutionaryProfitAndLossStatement data={processedPnl} prevData={processedPrevPnl} reportPeriod={pnlPeriod} />
        </TabsContent>
        <TabsContent value="bs">
          <BalanceSheetView data={bs} dateStr={bsDate} />
        </TabsContent>
      </Tabs>
    </div>
  );
}