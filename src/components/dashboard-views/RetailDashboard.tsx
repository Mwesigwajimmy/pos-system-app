'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ArrowRight, AlertCircle } from 'lucide-react';
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { cn } from '@/lib/utils';

type RetailData = {
    dailyRevenue: number;
    dailyExpenses: number;
    dailyCOGS: number;
    taxLiability: number;
    netCash: number;
    txCount: number;
    chartData: { date: string; sales: number }[];
    recentSales: { id: number; total_amount: number; created_at: string; status: string }[];
};

const COGS_ACCOUNT_CODE = '5000';
const TAX_ACCOUNT_CODE = '2200';

const startOfLocalDay = (offsetDays = 0) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    d.setHours(0, 0, 0, 0);
    return d;
};

const dayKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const dayLabel = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

async function fetchRetailData(): Promise<RetailData> {
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Your session has expired. Sign in again.");

    const { data: profile } = await supabase
        .from('profiles')
        .select('business_id')
        .eq('id', user.id)
        .single();

    const bId = profile?.business_id;
    if (!bId) throw new Error("No business is linked to your account.");

    const todayStart = startOfLocalDay();
    const tomorrowStart = startOfLocalDay(1);
    const weekStart = startOfLocalDay(-6);

    const todayFrom = todayStart.toISOString();
    const todayTo = tomorrowStart.toISOString();

    const [salesRes, expensesRes, ledgerRes, countRes, weekRes, recentRes] = await Promise.all([
        supabase.from('sales')
            .select('total_amount')
            .eq('business_id', bId)
            .gte('created_at', todayFrom)
            .lt('created_at', todayTo),

        supabase.from('expenses')
            .select('amount')
            .eq('business_id', bId)
            .gte('date', dayKey(todayStart)),

        supabase.from('accounting_journal_entries')
            .select('debit, credit, accounting_accounts!inner(code)')
            .eq('business_id', bId)
            .gte('created_at', todayFrom)
            .lt('created_at', todayTo),

        supabase.from('sales')
            .select('*', { count: 'exact', head: true })
            .eq('business_id', bId)
            .gte('created_at', todayFrom)
            .lt('created_at', todayTo),

        supabase.from('sales')
            .select('created_at, total_amount')
            .eq('business_id', bId)
            .gte('created_at', weekStart.toISOString())
            .order('created_at', { ascending: true }),

        supabase.from('sales')
            .select('id, total_amount, created_at, status')
            .eq('business_id', bId)
            .order('created_at', { ascending: false })
            .limit(5),
    ]);

    const firstError = [salesRes, expensesRes, ledgerRes, countRes, weekRes, recentRes]
        .find(r => (r as any).error);
    if (firstError) throw new Error((firstError as any).error.message);

    const dailyRevenue = (salesRes.data || []).reduce((sum, s: any) => sum + (Number(s.total_amount) || 0), 0);
    const dailyExpenses = (expensesRes.data || []).reduce((sum, e: any) => sum + (Number(e.amount) || 0), 0);

    const ledger = (ledgerRes.data || []) as any[];

    const dailyCOGS = ledger
        .filter(entry => entry.accounting_accounts?.code === COGS_ACCOUNT_CODE)
        .reduce((sum, entry) => sum + (Number(entry.debit) - Number(entry.credit)), 0);

    const taxLiability = ledger
        .filter(entry => entry.accounting_accounts?.code === TAX_ACCOUNT_CODE)
        .reduce((sum, entry) => sum + (Number(entry.credit) - Number(entry.debit)), 0);

    const chartMap = new Map<string, number>();
    (weekRes.data || []).forEach((sale: any) => {
        const key = dayKey(new Date(sale.created_at));
        chartMap.set(key, (chartMap.get(key) || 0) + (Number(sale.total_amount) || 0));
    });

    const chartData = Array.from({ length: 7 }, (_, i) => {
        const d = startOfLocalDay(-6 + i);
        return { date: dayLabel(d), sales: chartMap.get(dayKey(d)) || 0 };
    });

    return {
        dailyRevenue,
        dailyExpenses,
        dailyCOGS,
        taxLiability,
        netCash: dailyRevenue - (dailyExpenses + dailyCOGS + taxLiability),
        txCount: countRes.count || 0,
        chartData,
        recentSales: (recentRes.data || []) as RetailData['recentSales']
    };
}

function Metric({
    label,
    value,
    sub,
    loading,
    negative = false
}: {
    label: string;
    value: string;
    sub?: string;
    loading: boolean;
    negative?: boolean;
}) {
    return (
        <div className="px-5 py-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">{label}</p>
            {loading ? (
                <Skeleton className="mt-2 h-7 w-24" />
            ) : (
                <p className={cn(
                    "mt-1.5 text-xl font-semibold tabular-nums tracking-tight",
                    negative ? "text-red-600" : "text-slate-900"
                )}>
                    {value}
                </p>
            )}
            {sub ? <p className="mt-0.5 text-xs text-slate-400">{sub}</p> : null}
        </div>
    );
}

export default function RetailDashboard() {
    const params = useParams();
    const locale = (Array.isArray(params?.locale) ? params.locale[0] : params?.locale) || 'en';

    useRealtimeRefresh(['sales', 'expenses', 'accounting_journal_entries'], ['retail-dash']);
    const { data, isLoading, isError, error, refetch } = useQuery({
        queryKey: ['retail-dash'],
        queryFn: fetchRetailData
    });

    const compact = (val: number | undefined) =>
        new Intl.NumberFormat('en-US', { notation: "compact", maximumFractionDigits: 1 }).format(val || 0);
    const full = (val: number | undefined) =>
        `UGX ${new Intl.NumberFormat('en-US').format(Math.round(val || 0))}`;

    if (isError) {
        return (
            <div className="mx-auto my-24 w-full max-w-md rounded-xl border border-slate-200 bg-white p-10 text-center">
                <AlertCircle className="mx-auto mb-4 h-7 w-7 text-red-500" />
                <h2 className="text-base font-semibold text-slate-900">Dashboard could not load</h2>
                <p className="mt-2 text-sm text-slate-500">
                    {error instanceof Error ? error.message : 'Please try again.'}
                </p>
                <Button onClick={() => refetch()} className="mt-6 h-10 rounded-lg px-6">Try again</Button>
            </div>
        );
    }

    return (
        <div className="mx-auto w-full max-w-[1400px] space-y-4 px-4 pb-16 pt-6 sm:space-y-6 xl:px-8">
            <div>
                <h1 className="text-xl font-semibold tracking-tight text-slate-900">Today</h1>
                <p className="mt-1 text-sm text-slate-500">
                    {new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
            </div>

            <div className="grid divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white sm:grid-cols-2 sm:divide-y-0 sm:[&>*:nth-child(n+3)]:border-t lg:grid-cols-3 xl:grid-cols-5 xl:[&>*:nth-child(n+3)]:border-t-0 sm:divide-x">
                <Metric
                    label="Sales"
                    value={full(data?.dailyRevenue)}
                    sub={data ? `${data.txCount} transaction${data.txCount === 1 ? '' : 's'}` : undefined}
                    loading={isLoading}
                />
                <Metric label="Cost of sales" value={full(data?.dailyCOGS)} loading={isLoading} />
                <Metric label="Expenses" value={full(data?.dailyExpenses)} loading={isLoading} />
                <Metric label="Tax set aside" value={full(data?.taxLiability)} loading={isLoading} />
                <Metric
                    label="Net"
                    value={full(data?.netCash)}
                    loading={isLoading}
                    negative={(data?.netCash || 0) < 0}
                />
            </div>

            <div className="grid gap-4 sm:gap-6 lg:grid-cols-7">
                <Card className="overflow-hidden rounded-xl border-slate-200 shadow-none lg:col-span-4">
                    <CardHeader className="border-b border-slate-200 px-5 py-4">
                        <h2 className="text-sm font-semibold text-slate-900">Sales this week</h2>
                        <p className="mt-0.5 text-xs text-slate-500">Last 7 days</p>
                    </CardHeader>
                    <CardContent className="px-2 py-5 sm:px-4">
                        <div className="h-64 w-full sm:h-80">
                            {isLoading ? (
                                <div className="flex h-full items-center justify-center text-sm text-slate-400">Loading</div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={data?.chartData} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#0f172a" stopOpacity={0.14} />
                                                <stop offset="100%" stopColor="#0f172a" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                        <XAxis
                                            dataKey="date"
                                            stroke="#94a3b8"
                                            fontSize={11}
                                            tickLine={false}
                                            axisLine={false}
                                            tickMargin={8}
                                        />
                                        <YAxis
                                            stroke="#94a3b8"
                                            fontSize={11}
                                            tickLine={false}
                                            axisLine={false}
                                            width={48}
                                            tickFormatter={(value) => compact(value)}
                                        />
                                        <Tooltip
                                            formatter={(value: number) => [full(value), 'Sales']}
                                            contentStyle={{
                                                borderRadius: '8px',
                                                border: '1px solid #e2e8f0',
                                                boxShadow: '0 4px 12px rgb(15 23 42 / 0.08)',
                                                fontSize: '12px'
                                            }}
                                            labelStyle={{ color: '#64748b', marginBottom: '4px' }}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="sales"
                                            stroke="#0f172a"
                                            strokeWidth={2}
                                            fillOpacity={1}
                                            fill="url(#colorSales)"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card className="flex flex-col overflow-hidden rounded-xl border-slate-200 shadow-none lg:col-span-3">
                    <CardHeader className="border-b border-slate-200 px-5 py-4">
                        <h2 className="text-sm font-semibold text-slate-900">Recent sales</h2>
                        <p className="mt-0.5 text-xs text-slate-500">Latest from the till</p>
                    </CardHeader>
                    <CardContent className="flex-1 p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="border-b border-slate-200 hover:bg-transparent">
                                    <TableHead className="h-10 px-5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                                        Sale
                                    </TableHead>
                                    <TableHead className="h-10 text-right text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                                        Amount
                                    </TableHead>
                                    <TableHead className="h-10 px-5 text-right text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                                        Status
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    [0, 1, 2].map(i => (
                                        <TableRow key={i} className="border-b border-slate-100">
                                            <TableCell className="px-5 py-3"><Skeleton className="h-4 w-12" /></TableCell>
                                            <TableCell className="py-3"><Skeleton className="ml-auto h-4 w-16" /></TableCell>
                                            <TableCell className="px-5 py-3"><Skeleton className="ml-auto h-5 w-16" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : data?.recentSales.length ? (
                                    data.recentSales.map((sale) => (
                                        <TableRow key={sale.id} className="border-b border-slate-100 last:border-0">
                                            <TableCell className="px-5 py-3 text-sm text-slate-600">#{sale.id}</TableCell>
                                            <TableCell className="py-3 text-right text-sm tabular-nums text-slate-900">
                                                {compact(sale.total_amount)}
                                            </TableCell>
                                            <TableCell className="px-5 py-3 text-right">
                                                <Badge
                                                    variant="secondary"
                                                    className={cn(
                                                        "rounded-md px-2 py-0.5 text-xs font-medium capitalize",
                                                        sale.status === 'completed'
                                                            ? "bg-emerald-50 text-emerald-700"
                                                            : "bg-slate-100 text-slate-600"
                                                    )}
                                                >
                                                    {sale.status}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={3} className="h-24 text-center text-sm text-slate-400">
                                            No sales yet
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                    <div className="border-t border-slate-200 p-3">
                        <Button variant="ghost" className="h-10 w-full rounded-lg text-sm font-medium text-slate-600" asChild>
                            <Link href={`/${locale}/reports/sales-history`} className="flex items-center justify-center">
                                View all sales
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                    </div>
                </Card>
            </div>
        </div>
    );
}