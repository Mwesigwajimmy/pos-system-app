'use client';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Heart, Users, CalendarHeart, ArrowRight } from 'lucide-react';
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

type NonprofitData = { raisedToday: number; raisedTotal: number; volunteers: number; chartData: { date: string; amount: number }[]; recentDonations: { id: number; donor_name: string; total: number }[]; };

async function fetchNonprofitData(): Promise<NonprofitData> {
    const supabase = createClient();
    const today = new Date().toISOString().split('T')[0];
    const { data: donations } = await supabase.from('invoices').select('total').eq('type', 'donation').gte('created_at', today);
    const raisedToday = donations?.reduce((a, b) => a + b.total, 0) || 0;
    const { data: allDonations } = await supabase.from('invoices').select('total').eq('type', 'donation');
    const raisedTotal = allDonations?.reduce((a, b) => a + b.total, 0) || 0;
    const { count } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'volunteer');

    const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(new Date().getDate() - 7);
    const { data: weekDonations } = await supabase.from('invoices').select('created_at, total').eq('type', 'donation').gte('created_at', sevenDaysAgo.toISOString());
    const chartMap = new Map<string, number>();
    weekDonations?.forEach(d => { const date = new Date(d.created_at).toLocaleDateString('en-US', {weekday: 'short'}); chartMap.set(date, (chartMap.get(date) || 0) + d.total); });
    const chartData = Array.from(chartMap, ([date, amount]) => ({ date, amount }));

    const { data: recentDonations } = await supabase.from('invoices').select('id, customer_name, total').eq('type', 'donation').order('created_at', { ascending: false }).limit(5);

    return { raisedToday, raisedTotal, volunteers: count || 0, chartData, recentDonations: (recentDonations || []).map(d => ({...d, donor_name: d.customer_name})) };
}

export default function NonprofitDashboard() {
    useRealtimeRefresh(['invoices', 'users'], ['nonprofit-dash']);
    const { data, isLoading } = useQuery({ queryKey: ['nonprofit-dash'], queryFn: fetchNonprofitData });
    const formatCurrency = (val: number | undefined) => `UGX ${new Intl.NumberFormat('en-US', { notation: "compact" }).format(val || 0)}`;

    return (
        <div className="p-6 space-y-6">
            <h2 className="text-3xl font-bold tracking-tight">Impact Dashboard</h2>
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="bg-red-50 border-red-200"><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-red-800">Raised Today</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold text-red-700">{isLoading ? "..." : formatCurrency(data?.raisedToday)}</div><div className="flex items-center text-xs text-red-600 mt-1"><Heart className="h-3 w-3 mr-1"/> Donations Received</div></CardContent></Card>
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Campaign Fund</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{isLoading ? "..." : formatCurrency(data?.raisedTotal)}</div><div className="flex items-center text-xs text-muted-foreground mt-1"><CalendarHeart className="h-3 w-3 mr-1"/> Year to Date</div></CardContent></Card>
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Active Volunteers</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{isLoading ? "..." : (data?.volunteers || 0)}</div><div className="flex items-center text-xs text-muted-foreground mt-1"><Users className="h-3 w-3 mr-1"/> Registered</div></CardContent></Card>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7 h-full">
                <Card className="col-span-4 shadow-md"><CardHeader><CardTitle>Fundraising</CardTitle><CardDescription>Donation inflow</CardDescription></CardHeader><CardContent className="h-[350px]"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data?.chartData}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb"/><XAxis dataKey="date" stroke="#888888" fontSize={12} tickLine={false} axisLine={false}/><YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `UGX ${v/1000}k`}/><Tooltip formatter={(v: number) => formatCurrency(v)}/><Area type="monotone" dataKey="amount" stroke="#dc2626" fill="#dc2626" fillOpacity={0.2} strokeWidth={2}/></AreaChart></ResponsiveContainer></CardContent></Card>
                <Card className="col-span-3 shadow-md"><CardHeader><CardTitle>Recent Donors</CardTitle><CardDescription>Thank you for giving</CardDescription></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Donor</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader><TableBody>{data?.recentDonations.map((d) => (<TableRow key={d.id}><TableCell className="font-medium">{d.donor_name}</TableCell><TableCell className="text-right">{formatCurrency(d.total)}</TableCell></TableRow>))}</TableBody></Table></CardContent><div className="p-4 border-t bg-muted/20"><Button variant="ghost" className="w-full" asChild><Link href="/nonprofit/donors">View All Donors <ArrowRight className="ml-2 h-4 w-4"/></Link></Button></div></Card>
            </div>
        </div>
    );
}