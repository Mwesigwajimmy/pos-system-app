'use client';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowUpCircle, ArrowDownCircle, Users, ArrowRight } from 'lucide-react';
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

type SaccoData = { dailyDeposits: number; dailyWithdrawals: number; members: number; chartData: { date: string; deposits: number }[]; recentTx: { id: number; member_name: string; amount: number; type: string }[]; };

async function fetchSaccoDaily(): Promise<SaccoData> {
    const supabase = createClient();
    const today = new Date().toISOString().split('T')[0];
    const { data: deposits } = await supabase.from('transactions').select('amount').eq('type', 'deposit').gte('created_at', today);
    const dailyDeposits = deposits?.reduce((a, b) => a + b.amount, 0) || 0;
    const { data: withdrawals } = await supabase.from('transactions').select('amount').eq('type', 'withdrawal').gte('created_at', today);
    const dailyWithdrawals = withdrawals?.reduce((a, b) => a + b.amount, 0) || 0;
    const { count: members } = await supabase.from('customers').select('*', { count: 'exact', head: true });

    // Chart
    const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(new Date().getDate() - 7);
    const { data: weekDep } = await supabase.from('transactions').select('created_at, amount').eq('type', 'deposit').gte('created_at', sevenDaysAgo.toISOString());
    const chartMap = new Map<string, number>();
    weekDep?.forEach(d => { const date = new Date(d.created_at).toLocaleDateString('en-US', {weekday: 'short'}); chartMap.set(date, (chartMap.get(date) || 0) + d.amount); });
    const chartData = Array.from(chartMap, ([date, deposits]) => ({ date, deposits }));

    // List
    const { data: recentTx } = await supabase.from('transactions').select('id, member_name, amount, type').order('created_at', { ascending: false }).limit(5);

    return { dailyDeposits, dailyWithdrawals, members: members || 0, chartData, recentTx: recentTx || [] };
}

export default function SaccoDashboard() {
    useRealtimeRefresh(['transactions', 'customers'], ['sacco-dash']);
    const { data, isLoading } = useQuery({ queryKey: ['sacco-dash'], queryFn: fetchSaccoDaily });
    const formatCurrency = (val: number | undefined) => `UGX ${new Intl.NumberFormat('en-US', { notation: "compact" }).format(val || 0)}`;

    return (
        <div className="p-6 space-y-6">
            <h2 className="text-3xl font-bold tracking-tight">SACCO Operations</h2>
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="border-l-4 border-l-green-600"><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Deposits Today</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-green-700">{isLoading ? "..." : formatCurrency(data?.dailyDeposits)}</div><div className="flex items-center gap-1 text-xs text-muted-foreground mt-1"><ArrowUpCircle className="h-3 w-3 text-green-500" /> Cash Inflow</div></CardContent></Card>
                <Card className="border-l-4 border-l-orange-600"><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Withdrawals Today</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-orange-700">{isLoading ? "..." : formatCurrency(data?.dailyWithdrawals)}</div><div className="flex items-center gap-1 text-xs text-muted-foreground mt-1"><ArrowDownCircle className="h-3 w-3 text-orange-500" /> Cash Outflow</div></CardContent></Card>
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Membership</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{isLoading ? "..." : (data?.members || 0)}</div><div className="flex items-center gap-1 text-xs text-muted-foreground mt-1"><Users className="h-3 w-3" /> Active Accounts</div></CardContent></Card>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7 h-full">
                <Card className="col-span-4 shadow-md"><CardHeader><CardTitle>Deposit Growth</CardTitle><CardDescription>Savings trend</CardDescription></CardHeader><CardContent className="h-[350px]"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data?.chartData}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb"/><XAxis dataKey="date" stroke="#888888" fontSize={12} tickLine={false} axisLine={false}/><YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `UGX ${v/1000}k`}/><Tooltip formatter={(v: number) => formatCurrency(v)}/><Area type="monotone" dataKey="deposits" stroke="#16a34a" fill="#16a34a" fillOpacity={0.2} strokeWidth={2}/></AreaChart></ResponsiveContainer></CardContent></Card>
                <Card className="col-span-3 shadow-md"><CardHeader><CardTitle>Recent Transactions</CardTitle><CardDescription>Latest activity</CardDescription></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Member</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader><TableBody>{data?.recentTx.map((tx) => (<TableRow key={tx.id}><TableCell className="font-medium">{tx.member_name} <span className="text-xs text-muted-foreground block">{tx.type}</span></TableCell><TableCell className="text-right">{formatCurrency(tx.amount)}</TableCell></TableRow>))}</TableBody></Table></CardContent><div className="p-4 border-t bg-muted/20"><Button variant="ghost" className="w-full" asChild><Link href="/sacco/transactions">Full Ledger <ArrowRight className="ml-2 h-4 w-4"/></Link></Button></div></Card>
            </div>
        </div>
    );
}