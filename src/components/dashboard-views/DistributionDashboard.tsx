'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Truck, Banknote, ArrowRight } from 'lucide-react';
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

type DistData = { inTransit: number; dailyCOD: number; chartData: { date: string; deliveries: number }[]; liveFleet: { id: number; driver_name: string; status: string; route: string }[]; };

async function fetchDistData(): Promise<DistData> {
    const supabase = createClient();
    const today = new Date().toISOString().split('T')[0];
    const { count: inTransit } = await supabase.from('sales').select('*', { count: 'exact', head: true }).eq('status', 'in_transit');
    const { data: collections } = await supabase.from('payments').select('amount').eq('method', 'cash_on_delivery').gte('payment_date', today);
    const dailyCOD = collections?.reduce((a, b) => a + b.amount, 0) || 0;

    // Chart
    const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(new Date().getDate() - 7);
    const { data: weekDeliveries } = await supabase.from('sales').select('created_at').eq('status', 'delivered').gte('created_at', sevenDaysAgo.toISOString());
    const chartMap = new Map<string, number>();
    weekDeliveries?.forEach(d => { const date = new Date(d.created_at).toLocaleDateString('en-US', {weekday: 'short'}); chartMap.set(date, (chartMap.get(date) || 0) + 1); });
    const chartData = Array.from(chartMap, ([date, deliveries]) => ({ date, deliveries }));

    // List
    const { data: liveFleet } = await supabase.from('deliveries').select('id, driver_name, status, route').eq('status', 'in_transit').limit(5);

    return { inTransit: inTransit || 0, dailyCOD, chartData, liveFleet: liveFleet || [] };
}

export default function DistributionDashboard() {
    useRealtimeRefresh(['sales', 'payments', 'deliveries'], ['dist-dash']);
    const { data, isLoading } = useQuery({ queryKey: ['dist-dash'], queryFn: fetchDistData });
    const formatCurrency = (val: number | undefined) => `UGX ${new Intl.NumberFormat('en-US', { notation: "compact" }).format(val || 0)}`;

    return (
        <div className="p-6 space-y-6">
            <h2 className="text-3xl font-bold tracking-tight">Distribution Center</h2>
            <div className="grid gap-4 md:grid-cols-3">
                <Card><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2"><Truck className="text-blue-600"/> Fleet Active</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{isLoading ? "..." : (data?.inTransit || 0)}</div><p className="text-sm text-muted-foreground">Trucks on road</p></CardContent></Card>
                <Card><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2"><Banknote className="text-green-600"/> COD Collected</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{isLoading ? "..." : formatCurrency(data?.dailyCOD)}</div><p className="text-sm text-muted-foreground">Cash held by drivers today</p></CardContent></Card>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7 h-full">
                <Card className="col-span-4 shadow-md"><CardHeader><CardTitle>Deliveries</CardTitle><CardDescription>Completed drops per day</CardDescription></CardHeader><CardContent className="h-[350px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={data?.chartData}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb"/><XAxis dataKey="date" stroke="#888888" fontSize={12} tickLine={false} axisLine={false}/><YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false}/><Tooltip/><Bar dataKey="deliveries" fill="#0ea5e9" radius={[4, 4, 0, 0]}/></BarChart></ResponsiveContainer></CardContent></Card>
                <Card className="col-span-3 shadow-md"><CardHeader><CardTitle>Live Fleet</CardTitle><CardDescription>Active drivers</CardDescription></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Driver</TableHead><TableHead className="text-right">Route</TableHead></TableRow></TableHeader><TableBody>{data?.liveFleet.map((f) => (<TableRow key={f.id}><TableCell className="font-medium">{f.driver_name}</TableCell><TableCell className="text-right">{f.route}</TableCell></TableRow>))}</TableBody></Table></CardContent><div className="p-4 border-t bg-muted/20"><Button variant="ghost" className="w-full" asChild><Link href="/distribution/routes">Map View <ArrowRight className="ml-2 h-4 w-4"/></Link></Button></div></Card>
            </div>
        </div>
    );
}