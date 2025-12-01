'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Utensils, ChefHat, DollarSign, Clock, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

type RestaurantData = {
    activeOrders: number;
    dailyTotal: number;
    occupancy: number;
    chartData: { time: string; sales: number }[];
    recentOrders: { id: number; table_number: string; status: string; total_amount: number; created_at: string }[];
};

async function fetchRestaurantData(): Promise<RestaurantData> {
    const supabase = createClient();
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // 1. KPI Data
    const { count: activeOrders } = await supabase.from('orders').select('*', { count: 'exact', head: true }).in('status', ['pending', 'preparing']);
    const { data: sales } = await supabase.from('sales').select('total_amount').gte('created_at', todayStr);
    const dailyTotal = sales?.reduce((acc, curr) => acc + curr.total_amount, 0) || 0;
    
    // Mock Occupancy (or fetch from 'tables' if available)
    const occupancy = 12; 

    // 2. Chart Data: Sales by Hour (Today)
    // Fetching sales with timestamps
    const { data: salesHistory } = await supabase
        .from('sales')
        .select('created_at, total_amount')
        .gte('created_at', todayStr)
        .order('created_at', { ascending: true });

    // Group by Hour (e.g., "2 PM")
    const chartMap = new Map<string, number>();
    salesHistory?.forEach(sale => {
        const hour = new Date(sale.created_at).getHours();
        const timeLabel = `${hour}:00`;
        chartMap.set(timeLabel, (chartMap.get(timeLabel) || 0) + sale.total_amount);
    });
    // Sort and convert to array
    const chartData = Array.from(chartMap, ([time, sales]) => ({ time, sales }));

    // 3. Recent Orders Table
    const { data: recentOrders } = await supabase
        .from('orders')
        .select('id, table_number, status, total_amount, created_at')
        .order('created_at', { ascending: false })
        .limit(6);

    return { activeOrders: activeOrders || 0, dailyTotal, occupancy, chartData, recentOrders: recentOrders || [] };
}

export default function RestaurantDashboard() {
    useRealtimeRefresh(['orders', 'sales'], ['restaurant-dash']);
    const { data, isLoading } = useQuery({ queryKey: ['restaurant-dash'], queryFn: fetchRestaurantData });
    
    const formatCurrency = (val: number | undefined) => `UGX ${new Intl.NumberFormat('en-US', { notation: "compact" }).format(val || 0)}`;

    return (
        <div className="p-6 space-y-6 animate-in fade-in-50">
            <h2 className="text-3xl font-bold tracking-tight">Restaurant Overview</h2>
            
            {/* KPIs */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="border-orange-200 bg-orange-50/50">
                    <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2"><ChefHat className="text-orange-600"/> Kitchen Display</CardTitle></CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold text-orange-700">{isLoading ? "..." : (data?.activeOrders || 0)}</div>
                        <p className="text-sm text-muted-foreground font-medium">Orders Pending / Cooking</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2"><DollarSign className="text-green-600"/> Today's Sales</CardTitle></CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{isLoading ? "..." : formatCurrency(data?.dailyTotal)}</div>
                        <p className="text-sm text-muted-foreground">Gross Revenue Today</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2"><Utensils className="text-blue-600"/> Open Tables</CardTitle></CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{data?.occupancy}</div>
                        <p className="text-sm text-muted-foreground">Currently Seated</p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts & Lists */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7 h-full">
                <Card className="col-span-4 shadow-md">
                    <CardHeader>
                        <CardTitle>Sales Velocity</CardTitle>
                        <CardDescription>Revenue by Hour (Today)</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data?.chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                <XAxis dataKey="time" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `UGX ${v/1000}k`} />
                                <Tooltip formatter={(val: number) => `UGX ${val.toLocaleString()}`} cursor={{fill: '#f4f4f5'}} />
                                <Bar dataKey="sales" fill="#f97316" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card className="col-span-3 shadow-md">
                    <CardHeader>
                        <CardTitle>Recent Orders</CardTitle>
                        <CardDescription>Live feed from POS</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader><TableRow><TableHead>Table</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Time</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {data?.recentOrders.map((order) => (
                                    <TableRow key={order.id}>
                                        <TableCell className="font-bold">T-{order.table_number}</TableCell>
                                        <TableCell>
                                            <Badge variant={order.status === 'completed' ? 'outline' : 'default'} className={order.status !== 'completed' ? 'bg-orange-500' : ''}>
                                                {order.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right text-xs text-muted-foreground">{new Date(order.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                    <div className="p-4 border-t bg-muted/20">
                         <Button variant="ghost" className="w-full" asChild><Link href="/pos">Go to POS <ArrowRight className="ml-2 h-4 w-4"/></Link></Button>
                    </div>
                </Card>
            </div>
        </div>
    );
}