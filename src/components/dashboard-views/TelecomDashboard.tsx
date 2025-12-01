'use client';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Signal, Smartphone, Wallet, ArrowRightLeft, ArrowRight } from 'lucide-react';
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

type TelecomData = { dailySales: number; floatReqs: number; agents: number; chartData: { date: string; sales: number }[]; recentFloat: { id: number; agent_name: string; amount: number }[]; };

async function fetchTelecomData(): Promise<TelecomData> {
    const supabase = createClient();
    const today = new Date().toISOString().split('T')[0];
    const { data: sales } = await supabase.from('sales').select('total_amount').gte('created_at', today);
    const dailySales = sales?.reduce((a, b) => a + b.total_amount, 0) || 0;
    const { count: floatReqs } = await supabase.from('float_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending');
    const { count: agents } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'agent');

    const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(new Date().getDate() - 7);
    const { data: weekSales } = await supabase.from('sales').select('created_at, total_amount').gte('created_at', sevenDaysAgo.toISOString());
    const chartMap = new Map<string, number>();
    weekSales?.forEach(s => { const d = new Date(s.created_at).toLocaleDateString('en-US', {weekday: 'short'}); chartMap.set(d, (chartMap.get(d) || 0) + s.total_amount); });
    const chartData = Array.from(chartMap, ([date, sales]) => ({ date, sales }));

    const { data: recentFloat } = await supabase.from('float_requests').select('id, agent_name, amount').eq('status', 'pending').limit(5);

    return { dailySales, floatReqs: floatReqs || 0, agents: agents || 0, chartData, recentFloat: recentFloat || [] };
}

export default function TelecomDashboard() {
    useRealtimeRefresh(['sales', 'float_requests', 'users'], ['telecom-dash']);
    const { data, isLoading } = useQuery({ queryKey: ['telecom-dash'], queryFn: fetchTelecomData });
    const formatCurrency = (val: number | undefined) => `UGX ${new Intl.NumberFormat('en-US', { notation: "compact" }).format(val || 0)}`;

    return (
        <div className="p-6 space-y-6">
            <h2 className="text-3xl font-bold tracking-tight">Telecom Operations</h2>
            <div className="grid gap-4 md:grid-cols-4">
                <Card className="border-l-4 border-l-purple-600"><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Daily Sales</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-purple-700">{isLoading ? "..." : formatCurrency(data?.dailySales)}</div><div className="flex items-center text-xs text-muted-foreground mt-1"><Signal className="h-3 w-3 mr-1"/> Airtime & Data</div></CardContent></Card>
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Float Requests</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{isLoading ? "..." : (data?.floatReqs || 0)}</div><div className="flex items-center text-xs text-muted-foreground mt-1"><ArrowRightLeft className="h-3 w-3 mr-1"/> Pending Approval</div></CardContent></Card>
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Active Agents</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{isLoading ? "..." : (data?.agents || 0)}</div><div className="flex items-center text-xs text-muted-foreground mt-1"><Smartphone className="h-3 w-3 mr-1"/> Online Now</div></CardContent></Card>
                <Card className="bg-slate-900 text-white"><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-slate-300">Master Float</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">UGX 500M</div><div className="flex items-center text-xs text-slate-400 mt-1"><Wallet className="h-3 w-3 mr-1"/> Liquidity</div></CardContent></Card>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7 h-full">
                <Card className="col-span-4 shadow-md"><CardHeader><CardTitle>Airtime Sales</CardTitle><CardDescription>Daily volume</CardDescription></CardHeader><CardContent className="h-[350px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={data?.chartData}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb"/><XAxis dataKey="date" stroke="#888888" fontSize={12} tickLine={false} axisLine={false}/><YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `UGX ${v/1000}k`}/><Tooltip formatter={(v: number) => formatCurrency(v)}/><Bar dataKey="sales" fill="#a855f7" radius={[4, 4, 0, 0]}/></BarChart></ResponsiveContainer></CardContent></Card>
                <Card className="col-span-3 shadow-md"><CardHeader><CardTitle>Pending Float</CardTitle><CardDescription>Requests needing approval</CardDescription></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Agent</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader><TableBody>{data?.recentFloat.map((r) => (<TableRow key={r.id}><TableCell className="font-medium">{r.agent_name}</TableCell><TableCell className="text-right">{formatCurrency(r.amount)}</TableCell></TableRow>))}</TableBody></Table></CardContent><div className="p-4 border-t bg-muted/20"><Button variant="ghost" className="w-full" asChild><Link href="/telecom/float-requests">Approve Float <ArrowRight className="ml-2 h-4 w-4"/></Link></Button></div></Card>
            </div>
        </div>
    );
}