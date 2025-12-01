'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { HardHat, FileText, Wallet, Hammer, ArrowRight } from 'lucide-react';
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

type ContractorData = {
    activeJobs: number;
    cashIn: number;
    openBids: number;
    chartData: { date: string; amount: number }[];
    activeProjectsList: { id: number; name: string; status: string; completion_percent: number }[];
};

async function fetchContractorData(): Promise<ContractorData> {
    const supabase = createClient();
    const today = new Date().toISOString().split('T')[0];

    // KPIs
    const { data: payments } = await supabase.from('payments').select('amount').gte('payment_date', today);
    const cashIn = payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
    const { count: activeJobs } = await supabase.from('projects').select('*', { count: 'exact', head: true }).eq('status', 'in_progress');
    const { count: openBids } = await supabase.from('estimates').select('*', { count: 'exact', head: true }).eq('status', 'pending');

    // Chart: Last 7 Days Cash Flow
    const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(new Date().getDate() - 7);
    const { data: weekPayments } = await supabase.from('payments').select('payment_date, amount').gte('payment_date', sevenDaysAgo.toISOString());
    
    const chartMap = new Map<string, number>();
    weekPayments?.forEach(p => {
        const d = new Date(p.payment_date).toLocaleDateString('en-US', {weekday: 'short'});
        chartMap.set(d, (chartMap.get(d) || 0) + p.amount);
    });
    const chartData = Array.from(chartMap, ([date, amount]) => ({ date, amount }));

    // List: Active Projects
    const { data: activeProjectsList } = await supabase.from('projects').select('id, name, status, completion_percent').eq('status', 'in_progress').limit(5);

    return { activeJobs: activeJobs || 0, cashIn, openBids: openBids || 0, chartData, activeProjectsList: activeProjectsList || [] };
}

export default function ContractorDashboard() {
    useRealtimeRefresh(['payments', 'projects', 'estimates'], ['contractor-dash']);
    const { data, isLoading } = useQuery({ queryKey: ['contractor-dash'], queryFn: fetchContractorData });
    const formatCurrency = (val: number | undefined) => `UGX ${new Intl.NumberFormat('en-US', { notation: "compact" }).format(val || 0)}`;

    return (
        <div className="p-6 space-y-6">
            <h2 className="text-3xl font-bold tracking-tight">Contractor Hub</h2>
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="bg-green-50 border-green-200">
                    <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-green-800"><Wallet className="h-5 w-5 text-green-700"/> Cash Collected Today</CardTitle></CardHeader>
                    <CardContent><div className="text-3xl font-bold text-green-800">{isLoading ? "..." : formatCurrency(data?.cashIn)}</div></CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2"><HardHat className="h-5 w-5 text-yellow-600"/> Active Job Sites</CardTitle></CardHeader>
                    <CardContent><div className="text-3xl font-bold">{isLoading ? "..." : (data?.activeJobs ?? 0)}</div></CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-blue-600"/> Pending Bids</CardTitle></CardHeader>
                    <CardContent><div className="text-3xl font-bold">{isLoading ? "..." : (data?.openBids ?? 0)}</div></CardContent>
                </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7 h-full">
                <Card className="col-span-4 shadow-md">
                    <CardHeader><CardTitle>Cash Flow</CardTitle><CardDescription>Payments received this week</CardDescription></CardHeader>
                    <CardContent className="h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data?.chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb"/>
                                <XAxis dataKey="date" stroke="#888888" fontSize={12} tickLine={false} axisLine={false}/>
                                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `UGX ${v/1000}k`}/>
                                <Tooltip formatter={(v: number) => formatCurrency(v)}/>
                                <Area type="monotone" dataKey="amount" stroke="#16a34a" fill="#16a34a" fillOpacity={0.2} strokeWidth={2}/>
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card className="col-span-3 shadow-md">
                    <CardHeader><CardTitle>Site Status</CardTitle><CardDescription>Current progress</CardDescription></CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader><TableRow><TableHead>Project</TableHead><TableHead className="text-right">Completion</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {data?.activeProjectsList.map((p) => (
                                    <TableRow key={p.id}>
                                        <TableCell className="font-medium">{p.name}</TableCell>
                                        <TableCell className="text-right"><Badge variant="outline">{p.completion_percent}%</Badge></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                    <div className="p-4 border-t bg-muted/20">
                         <Button variant="ghost" className="w-full" asChild><Link href="/contractor/jobs">Manage All Jobs <ArrowRight className="ml-2 h-4 w-4"/></Link></Button>
                    </div>
                </Card>
            </div>
        </div>
    );
}