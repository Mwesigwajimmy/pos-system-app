'use client';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Banknote, TrendingUp, TrendingDown, Users, ArrowRight } from 'lucide-react';
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

type LendingData = { disbursedToday: number; collectedToday: number; borrowers: number; chartData: { date: string; repayments: number }[]; recentLoans: { id: number; borrower_name: string; principal_amount: number }[]; };

async function fetchLendingData(): Promise<LendingData> {
    const supabase = createClient();
    const today = new Date().toISOString().split('T')[0];
    const { data: loans } = await supabase.from('loans').select('principal_amount').eq('status', 'active').gte('disbursement_date', today);
    const disbursedToday = loans?.reduce((a, b) => a + b.principal_amount, 0) || 0;
    const { data: repayments } = await supabase.from('transactions').select('amount').eq('type', 'repayment').gte('created_at', today);
    const collectedToday = repayments?.reduce((a, b) => a + b.amount, 0) || 0;
    const { count: borrowers } = await supabase.from('loans').select('*', { count: 'exact', head: true }).eq('status', 'active');

    const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(new Date().getDate() - 7);
    const { data: weekRepay } = await supabase.from('transactions').select('created_at, amount').eq('type', 'repayment').gte('created_at', sevenDaysAgo.toISOString());
    const chartMap = new Map<string, number>();
    weekRepay?.forEach(r => { const d = new Date(r.created_at).toLocaleDateString('en-US', {weekday: 'short'}); chartMap.set(d, (chartMap.get(d) || 0) + r.amount); });
    const chartData = Array.from(chartMap, ([date, repayments]) => ({ date, repayments }));

    const { data: recentLoans } = await supabase.from('loans').select('id, borrower_name, principal_amount').order('created_at', { ascending: false }).limit(5);
    return { disbursedToday, collectedToday, borrowers: borrowers || 0, chartData, recentLoans: recentLoans || [] };
}

export default function LendingDashboard() {
    useRealtimeRefresh(['loans', 'transactions'], ['lending-dash']);
    const { data, isLoading } = useQuery({ queryKey: ['lending-dash'], queryFn: fetchLendingData });
    const formatCurrency = (val: number | undefined) => `UGX ${new Intl.NumberFormat('en-US', { notation: "compact" }).format(val || 0)}`;

    return (
        <div className="p-6 space-y-6">
            <h2 className="text-3xl font-bold tracking-tight">Lending Overview</h2>
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="border-l-4 border-l-red-500"><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Disbursed Today</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-red-700">{isLoading ? "..." : formatCurrency(data?.disbursedToday)}</div><div className="flex items-center text-xs text-muted-foreground mt-1"><TrendingDown className="h-3 w-3 mr-1"/> Cash Outflow</div></CardContent></Card>
                <Card className="border-l-4 border-l-green-500"><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Repayments Today</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-green-700">{isLoading ? "..." : formatCurrency(data?.collectedToday)}</div><div className="flex items-center text-xs text-muted-foreground mt-1"><TrendingUp className="h-3 w-3 mr-1"/> Cash Inflow</div></CardContent></Card>
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Active Loans</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{isLoading ? "..." : (data?.borrowers ?? 0)}</div><div className="flex items-center text-xs text-muted-foreground mt-1"><Users className="h-3 w-3 mr-1"/> Borrowers with Balance</div></CardContent></Card>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7 h-full">
                <Card className="col-span-4 shadow-md"><CardHeader><CardTitle>Collection Performance</CardTitle><CardDescription>Repayments collected</CardDescription></CardHeader><CardContent className="h-[350px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={data?.chartData}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb"/><XAxis dataKey="date" stroke="#888888" fontSize={12} tickLine={false} axisLine={false}/><YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `UGX ${v/1000}k`}/><Tooltip formatter={(v: number) => formatCurrency(v)}/><Bar dataKey="repayments" fill="#22c55e" radius={[4, 4, 0, 0]}/></BarChart></ResponsiveContainer></CardContent></Card>
                <Card className="col-span-3 shadow-md"><CardHeader><CardTitle>New Loans</CardTitle><CardDescription>Recently disbursed</CardDescription></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Borrower</TableHead><TableHead className="text-right">Principal</TableHead></TableRow></TableHeader><TableBody>{data?.recentLoans.map((l) => (<TableRow key={l.id}><TableCell className="font-medium">{l.borrower_name}</TableCell><TableCell className="text-right">{formatCurrency(l.principal_amount)}</TableCell></TableRow>))}</TableBody></Table></CardContent><div className="p-4 border-t bg-muted/20"><Button variant="ghost" className="w-full" asChild><Link href="/lending/loans">All Loans <ArrowRight className="ml-2 h-4 w-4"/></Link></Button></div></Card>
            </div>
        </div>
    );
}