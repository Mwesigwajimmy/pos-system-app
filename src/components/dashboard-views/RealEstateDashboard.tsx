'use client';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { KeyRound, Wallet, FileCheck, ArrowRight } from 'lucide-react';
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

type RealEstateData = { dailyRent: number; totalUnits: number; activeLeases: number; chartData: { date: string; rent: number }[]; recentLeases: { id: number; tenant_name: string; unit: string; end_date: string }[]; };

async function fetchRealEstateData(): Promise<RealEstateData> {
    const supabase = createClient();
    const today = new Date().toISOString().split('T')[0];
    const { data: payments } = await supabase.from('payments').select('amount').gte('payment_date', today);
    const dailyRent = payments?.reduce((a, b) => a + b.amount, 0) || 0;
    const { count: totalUnits } = await supabase.from('properties').select('*', { count: 'exact', head: true });
    const { count: activeLeases } = await supabase.from('leases').select('*', { count: 'exact', head: true }).eq('status', 'active');

    const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(new Date().getDate() - 30); // Last 30 days for rent usually better
    const { data: monthRent } = await supabase.from('payments').select('payment_date, amount').gte('payment_date', sevenDaysAgo.toISOString());
    const chartMap = new Map<string, number>();
    monthRent?.forEach(p => { const d = new Date(p.payment_date).toLocaleDateString('en-US', {month: 'short', day: 'numeric'}); chartMap.set(d, (chartMap.get(d) || 0) + p.amount); });
    const chartData = Array.from(chartMap, ([date, rent]) => ({ date, rent }));

    const { data: recentLeases } = await supabase.from('leases').select('id, tenant_name, unit, end_date').order('created_at', { ascending: false }).limit(5);

    return { dailyRent, totalUnits: totalUnits || 0, activeLeases: activeLeases || 0, chartData, recentLeases: recentLeases || [] };
}

export default function RealEstateDashboard() {
    useRealtimeRefresh(['payments', 'leases', 'properties'], ['estate-dash']);
    const { data, isLoading } = useQuery({ queryKey: ['estate-dash'], queryFn: fetchRealEstateData });
    const formatCurrency = (val: number | undefined) => `UGX ${new Intl.NumberFormat('en-US', { notation: "compact" }).format(val || 0)}`;
    const occupancyRate = data?.totalUnits ? Math.round((data.activeLeases / data.totalUnits) * 100) : 0;

    return (
        <div className="p-6 space-y-6">
            <h2 className="text-3xl font-bold tracking-tight">Property Management</h2>
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="border-l-4 border-l-green-600"><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Rent Collected Today</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-green-700">{isLoading ? "..." : formatCurrency(data?.dailyRent)}</div><div className="flex items-center text-xs text-muted-foreground mt-1"><Wallet className="h-3 w-3 mr-1"/> Cash Inflow</div></CardContent></Card>
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Occupancy Rate</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{isLoading ? "..." : occupancyRate}%</div><div className="flex items-center text-xs text-muted-foreground mt-1"><KeyRound className="h-3 w-3 mr-1"/> {data?.activeLeases} / {data?.totalUnits} Units Leased</div></CardContent></Card>
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Leases Expiring</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-orange-600">3</div><div className="flex items-center text-xs text-muted-foreground mt-1"><FileCheck className="h-3 w-3 mr-1"/> Within 30 days</div></CardContent></Card>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7 h-full">
                <Card className="col-span-4 shadow-md"><CardHeader><CardTitle>Revenue</CardTitle><CardDescription>Rent collection over 30 days</CardDescription></CardHeader><CardContent className="h-[350px]"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data?.chartData}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb"/><XAxis dataKey="date" stroke="#888888" fontSize={12} tickLine={false} axisLine={false}/><YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `UGX ${v/1000}k`}/><Tooltip formatter={(v: number) => formatCurrency(v)}/><Area type="monotone" dataKey="rent" stroke="#0ea5e9" fill="#0ea5e9" fillOpacity={0.2} strokeWidth={2}/></AreaChart></ResponsiveContainer></CardContent></Card>
                <Card className="col-span-3 shadow-md"><CardHeader><CardTitle>New Leases</CardTitle><CardDescription>Recent tenants</CardDescription></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Tenant</TableHead><TableHead className="text-right">Expires</TableHead></TableRow></TableHeader><TableBody>{data?.recentLeases.map((l) => (<TableRow key={l.id}><TableCell className="font-medium">{l.tenant_name} <span className="text-xs text-muted-foreground block">{l.unit}</span></TableCell><TableCell className="text-right">{new Date(l.end_date).toLocaleDateString()}</TableCell></TableRow>))}</TableBody></Table></CardContent><div className="p-4 border-t bg-muted/20"><Button variant="ghost" className="w-full" asChild><Link href="/rentals/leases">Manage Properties <ArrowRight className="ml-2 h-4 w-4"/></Link></Button></div></Card>
            </div>
        </div>
    );
}