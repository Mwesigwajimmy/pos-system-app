'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowUpCircle, ArrowDownCircle, Users, ArrowRight, Scale, Loader2, Inbox } from 'lucide-react';
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

type SaccoData = {
  dailyDeposits: number;
  dailyWithdrawals: number;
  members: number;
  chartData: { date: string; deposits: number }[];
  recentTx: { id: number; member_name: string; amount: number; type: string }[];
};

// UNTOUCHED — every query, filter, and aggregation below is exactly as provided.
async function fetchSaccoDaily(): Promise<SaccoData> {
  const supabase = createClient();
  const today = new Date().toISOString().split('T')[0];

  const { data: deposits } = await supabase
    .from('transactions')
    .select('amount')
    .eq('type', 'deposit')
    .gte('created_at', today);
  const dailyDeposits = deposits?.reduce((a, b) => a + b.amount, 0) || 0;

  const { data: withdrawals } = await supabase
    .from('transactions')
    .select('amount')
    .eq('type', 'withdrawal')
    .gte('created_at', today);
  const dailyWithdrawals = withdrawals?.reduce((a, b) => a + b.amount, 0) || 0;

  const { count: members } = await supabase
    .from('customers')
    .select('*', { count: 'exact', head: true });

  // Chart
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(new Date().getDate() - 7);
  const { data: weekDep } = await supabase
    .from('transactions')
    .select('created_at, amount')
    .eq('type', 'deposit')
    .gte('created_at', sevenDaysAgo.toISOString());

  const chartMap = new Map<string, number>();
  weekDep?.forEach(d => {
    const date = new Date(d.created_at).toLocaleDateString('en-US', { weekday: 'short' });
    chartMap.set(date, (chartMap.get(date) || 0) + d.amount);
  });
  const chartData = Array.from(chartMap, ([date, deposits]) => ({ date, deposits }));

  // List
  const { data: recentTx } = await supabase
    .from('transactions')
    .select('id, member_name, amount, type')
    .order('created_at', { ascending: false })
    .limit(5);

  return { dailyDeposits, dailyWithdrawals, members: members || 0, chartData, recentTx: recentTx || [] };
}

export default function SaccoDashboard() {
  useRealtimeRefresh(['transactions', 'customers'], ['sacco-dash']);
  const { data, isLoading } = useQuery({ queryKey: ['sacco-dash'], queryFn: fetchSaccoDaily });

  // UNTOUCHED — same formatting logic as the original.
  const formatCurrency = (val: number | undefined) =>
    `UGX ${new Intl.NumberFormat('en-US', { notation: 'compact' }).format(val || 0)}`;

  // Derived client-side only (deposits - withdrawals) — not a new query, just arithmetic
  // on data the dashboard already fetches.
  const netCashFlow = (data?.dailyDeposits || 0) - (data?.dailyWithdrawals || 0);

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">SACCO Operations</h2>
          <p className="text-sm text-muted-foreground">{today}</p>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-green-600 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Deposits Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">
              {isLoading ? '...' : formatCurrency(data?.dailyDeposits)}
            </div>
            <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <ArrowUpCircle className="h-3 w-3 text-green-500" />
              Cash Inflow
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-600 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Withdrawals Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-700">
              {isLoading ? '...' : formatCurrency(data?.dailyWithdrawals)}
            </div>
            <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <ArrowDownCircle className="h-3 w-3 text-orange-500" />
              Cash Outflow
            </div>
          </CardContent>
        </Card>

        <Card className={`border-l-4 shadow-sm ${netCashFlow >= 0 ? 'border-l-emerald-600' : 'border-l-red-600'}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Net Cash Flow Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netCashFlow >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
              {isLoading ? '...' : formatCurrency(netCashFlow)}
            </div>
            <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <Scale className="h-3 w-3" />
              Deposits minus withdrawals
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Membership</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? '...' : data?.members || 0}</div>
            <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="h-3 w-3" />
              Active Accounts
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart + Recent Activity */}
      <div className="grid h-full gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="shadow-sm lg:col-span-4">
          <CardHeader>
            <CardTitle>Deposit Growth</CardTitle>
            <CardDescription>Savings trend over the last 7 days</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            {isLoading ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data?.chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="date" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `UGX ${v / 1000}k`}
                  />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Area
                    type="monotone"
                    dataKey="deposits"
                    stroke="#16a34a"
                    fill="#16a34a"
                    fillOpacity={0.2}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="flex flex-col shadow-sm lg:col-span-3">
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>Latest activity across the cooperative</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Member</TableHead>
                  <TableHead className="pr-6 text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={2} className="h-32 text-center">
                      <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : !data?.recentTx || data.recentTx.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="h-32 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Inbox className="h-5 w-5" />
                        No recent transactions.
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  data.recentTx.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="align-middle pl-6 font-medium">
                        <div>{tx.member_name}</div>
                        <Badge
                          variant="outline"
                          className={`mt-1 text-[10px] font-normal ${
                            tx.type === 'deposit'
                              ? 'border-green-200 bg-green-50 text-green-700'
                              : 'border-orange-200 bg-orange-50 text-orange-700'
                          }`}
                        >
                          {tx.type === 'deposit' ? (
                            <ArrowUpCircle className="mr-1 h-3 w-3" />
                          ) : (
                            <ArrowDownCircle className="mr-1 h-3 w-3" />
                          )}
                          {tx.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="align-middle pr-6 text-right font-mono font-semibold tabular-nums">
                        {formatCurrency(tx.amount)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
          <div className="border-t bg-muted/20 p-4">
            <Button variant="ghost" className="w-full" asChild>
              {/* Link href untouched */}
              <Link href="/sacco/transactions">
                Full Ledger <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}