'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Wrench, CheckCircle2, Clock, DollarSign, MapPin, ArrowRight } from 'lucide-react';
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

type FieldServiceData = {
    dailyRevenue: number;
    completedToday: number;
    activeJobs: number;
    pending: number;
    chartData: { date: string; completed: number }[];
    recentJobs: { id: number; description: string; status: string; created_at: string }[];
};

async function fetchFieldData(): Promise<FieldServiceData> {
    const supabase = createClient();
    const today = new Date().toISOString().split('T')[0];

    const { data: invoices } = await supabase.from('invoices').select('total').gte('created_at', today);
    const dailyRevenue = invoices?.reduce((sum, inv) => sum + (inv.total || 0), 0) || 0;
    const { count: completedToday } = await supabase.from('work_orders').select('*', { count: 'exact', head: true }).eq('status', 'completed').gte('updated_at', today);
    const { count: activeJobs } = await supabase.from('work_orders').select('*', { count: 'exact', head: true }).eq('status', 'in_progress');
    const { count: pending } = await supabase.from('work_orders').select('*', { count: 'exact', head: true }).eq('status', 'pending');

    // Chart: Jobs Completed Last 7 Days
    const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(new Date().getDate() - 7);
    const { data: weekJobs } = await supabase.from('work_orders').select('updated_at').eq('status', 'completed').gte('updated_at', sevenDaysAgo.toISOString());
    const chartMap = new Map<string, number>();
    weekJobs?.forEach(j => {
        const d = new Date(j.updated_at).toLocaleDateString('en-US', {weekday: 'short'});
        chartMap.set(d, (chartMap.get(d) || 0) + 1);
    });
    const chartData = Array.from(chartMap, ([date, completed]) => ({ date, completed }));

    // List: Recent Jobs
    const { data: recentJobs } = await supabase.from('work_orders').select('id, description, status, created_at').order('created_at', { ascending: false }).limit(5);

    return { dailyRevenue, completedToday: completedToday || 0, activeJobs: activeJobs || 0, pending: pending || 0, chartData, recentJobs: recentJobs || [] };
}

export default function FieldServiceDashboard() {
    useRealtimeRefresh(['work_orders', 'invoices'], ['field-dash']);
    const { data, isLoading } = useQuery({ queryKey: ['field-dash'], queryFn: fetchFieldData });
    const formatCurrency = (val: number | undefined) => `UGX ${new Intl.NumberFormat('en-US', { notation: "compact" }).format(val || 0)}`;

    return (
        <div className="p-6 space-y-6 animate-in fade-in-50">
            <h2 className="text-3xl font-bold tracking-tight">Field Operations</h2>
            <div className="grid gap-4 md:grid-cols-4">
                <Card className="border-l-4 border-l-green-600"><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Revenue Today</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-green-700">{isLoading ? "..." : formatCurrency(data?.dailyRevenue)}</div><div className="flex items-center text-xs text-muted-foreground mt-1"><DollarSign className="h-3 w-3 mr-1" /> Invoiced</div></CardContent></Card>
                <Card className="border-l-4 border-l-blue-600"><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Completed</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-blue-700">{isLoading ? "..." : data?.completedToday}</div><div className="flex items-center text-xs text-muted-foreground mt-1"><CheckCircle2 className="h-3 w-3 mr-1" /> Closed Today</div></CardContent></Card>
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">On-Site</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{isLoading ? "..." : data?.activeJobs}</div><div className="flex items-center text-xs text-muted-foreground mt-1"><MapPin className="h-3 w-3 mr-1 text-orange-500 animate-pulse" /> Active Techs</div></CardContent></Card>
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Backlog</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{isLoading ? "..." : data?.pending}</div><div className="flex items-center text-xs text-muted-foreground mt-1"><Clock className="h-3 w-3 mr-1" /> Unassigned</div></CardContent></Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7 h-full">
                <Card className="col-span-4 shadow-md">
                    <CardHeader><CardTitle>Throughput</CardTitle><CardDescription>Jobs completed per day</CardDescription></CardHeader>
                    <CardContent className="h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data?.chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb"/>
                                <XAxis dataKey="date" stroke="#888888" fontSize={12} tickLine={false} axisLine={false}/>
                                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false}/>
                                <Tooltip cursor={{fill: '#f4f4f5'}}/>
                                <Bar dataKey="completed" fill="#2563eb" radius={[4, 4, 0, 0]}/>
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
                <Card className="col-span-3 shadow-md">
                    <CardHeader><CardTitle>Incoming Requests</CardTitle><CardDescription>Latest work orders</CardDescription></CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader><TableRow><TableHead>Description</TableHead><TableHead className="text-right">Status</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {data?.recentJobs.map((j) => (
                                    <TableRow key={j.id}><TableCell className="font-medium truncate max-w-[150px]">{j.description}</TableCell><TableCell className="text-right"><Badge variant="secondary">{j.status}</Badge></TableCell></TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                    <div className="p-4 border-t bg-muted/20"><Button variant="ghost" className="w-full" asChild><Link href="/field-service/schedule">Dispatch Board <ArrowRight className="ml-2 h-4 w-4"/></Link></Button></div>
                </Card>
            </div>
        </div>
    );
}