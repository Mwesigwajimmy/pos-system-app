'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Clock, FileText, Briefcase, ArrowRight } from 'lucide-react';
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

type ProData = { hoursToday: number; invoicedToday: number; projects: number; chartData: { date: string; hours: number }[]; recentInvoices: { id: number; customer_name: string; total: number; status: string }[]; };

async function fetchProData(): Promise<ProData> {
    const supabase = createClient();
    const today = new Date().toISOString().split('T')[0];

    const { data: hours } = await supabase.from('timesheets').select('hours').gte('date', today);
    const hoursToday = hours?.reduce((a, b) => a + b.hours, 0) || 0;
    const { data: invoices } = await supabase.from('invoices').select('total').gte('issue_date', today);
    const invoicedToday = invoices?.reduce((a, b) => a + b.total, 0) || 0;
    const { count: projects } = await supabase.from('projects').select('*', { count: 'exact', head: true }).eq('status', 'active');

    // Chart: Hours Last 7 Days
    const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(new Date().getDate() - 7);
    const { data: weekHours } = await supabase.from('timesheets').select('date, hours').gte('date', sevenDaysAgo.toISOString());
    const chartMap = new Map<string, number>();
    weekHours?.forEach(h => { const d = new Date(h.date).toLocaleDateString('en-US', {weekday: 'short'}); chartMap.set(d, (chartMap.get(d) || 0) + h.hours); });
    const chartData = Array.from(chartMap, ([date, hours]) => ({ date, hours }));

    // List: Recent Invoices
    const { data: recentInvoices } = await supabase.from('invoices').select('id, customer_name, total, status').order('created_at', { ascending: false }).limit(5);

    return { hoursToday, invoicedToday, projects: projects || 0, chartData, recentInvoices: recentInvoices || [] };
}

export default function ProServicesDashboard() {
    useRealtimeRefresh(['timesheets', 'invoices', 'projects'], ['pro-dash']);
    const { data, isLoading } = useQuery({ queryKey: ['pro-dash'], queryFn: fetchProData });
    const formatCurrency = (val: number | undefined) => `UGX ${new Intl.NumberFormat('en-US', { notation: "compact" }).format(val || 0)}`;

    return (
        <div className="p-6 space-y-6">
            <h2 className="text-3xl font-bold tracking-tight">Practice Performance</h2>
            <div className="grid gap-4 md:grid-cols-3">
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Billable Hours Today</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{isLoading ? "..." : (data?.hoursToday || 0)} Hrs</div><div className="flex items-center text-xs text-muted-foreground mt-1"><Clock className="h-3 w-3 mr-1"/> Logged by Team</div></CardContent></Card>
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Invoiced Today</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-blue-600">{isLoading ? "..." : formatCurrency(data?.invoicedToday)}</div><div className="flex items-center text-xs text-muted-foreground mt-1"><FileText className="h-3 w-3 mr-1"/> New Bills Issued</div></CardContent></Card>
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Active Matters</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{isLoading ? "..." : (data?.projects || 0)}</div><div className="flex items-center text-xs text-muted-foreground mt-1"><Briefcase className="h-3 w-3 mr-1"/> Open Files</div></CardContent></Card>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7 h-full">
                <Card className="col-span-4 shadow-md"><CardHeader><CardTitle>Billable Efficiency</CardTitle><CardDescription>Hours logged per day</CardDescription></CardHeader><CardContent className="h-[350px]"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data?.chartData}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb"/><XAxis dataKey="date" stroke="#888888" fontSize={12} tickLine={false} axisLine={false}/><YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false}/><Tooltip/><Area type="monotone" dataKey="hours" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.2} strokeWidth={2}/></AreaChart></ResponsiveContainer></CardContent></Card>
                <Card className="col-span-3 shadow-md"><CardHeader><CardTitle>Recent Invoices</CardTitle><CardDescription>Billing activity</CardDescription></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Client</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader><TableBody>{data?.recentInvoices.map((inv) => (<TableRow key={inv.id}><TableCell className="font-medium">{inv.customer_name}</TableCell><TableCell className="text-right">{formatCurrency(inv.total)}</TableCell></TableRow>))}</TableBody></Table></CardContent><div className="p-4 border-t bg-muted/20"><Button variant="ghost" className="w-full" asChild><Link href="/invoicing/list">All Invoices <ArrowRight className="ml-2 h-4 w-4"/></Link></Button></div></Card>
            </div>
        </div>
    );
}