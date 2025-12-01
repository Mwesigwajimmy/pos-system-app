'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DollarSign, ShoppingCart, TrendingUp, TrendingDown, Package, Activity, ArrowRight } from 'lucide-react';
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

// --- Types ---
type RetailData = {
    dailyRevenue: number;
    dailyExpenses: number;
    netCash: number;
    txCount: number;
    chartData: { date: string; sales: number }[];
    recentSales: { id: number; total_amount: number; created_at: string; status: string }[];
};

// --- Data Fetching ---
async function fetchRetailData(): Promise<RetailData> {
    const supabase = createClient();
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    // 1. Daily Stats (Cards)
    const { data: salesToday } = await supabase.from('sales').select('total_amount').gte('created_at', todayStr);
    const dailyRevenue = salesToday?.reduce((sum, s) => sum + s.total_amount, 0) || 0;

    const { data: expensesToday } = await supabase.from('expenses').select('amount').gte('date', todayStr);
    const dailyExpenses = expensesToday?.reduce((sum, e) => sum + e.amount, 0) || 0;

    const { count: txCount } = await supabase.from('sales').select('*', { count: 'exact', head: true }).gte('created_at', todayStr);

    // 2. Chart Data (Last 7 Days Trend)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 7);
    
    const { data: weekSales } = await supabase
        .from('sales')
        .select('created_at, total_amount')
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: true });

    // Aggregate sales by date for the chart
    const chartMap = new Map<string, number>();
    weekSales?.forEach(sale => {
        const date = new Date(sale.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        chartMap.set(date, (chartMap.get(date) || 0) + sale.total_amount);
    });
    const chartData = Array.from(chartMap, ([date, sales]) => ({ date, sales }));

    // 3. Recent Sales List (Table)
    const { data: recentSales } = await supabase
        .from('sales')
        .select('id, total_amount, created_at, status')
        .order('created_at', { ascending: false })
        .limit(5);

    return { 
        dailyRevenue, 
        dailyExpenses, 
        netCash: dailyRevenue - dailyExpenses,
        txCount: txCount || 0,
        chartData,
        recentSales: recentSales || []
    };
}

export default function RetailDashboard() {
    useRealtimeRefresh(['sales', 'expenses'], ['retail-dash']);
    const { data, isLoading } = useQuery({ queryKey: ['retail-dash'], queryFn: fetchRetailData });

    // Helpers
    const formatCurrency = (val: number | undefined) => `UGX ${new Intl.NumberFormat('en-US', { notation: "compact", maximumFractionDigits: 1 }).format(val || 0)}`;
    const formatFullCurrency = (val: number | undefined) => `UGX ${new Intl.NumberFormat('en-US').format(val || 0)}`;

    return (
        <div className="p-6 space-y-6 animate-in fade-in-50">
            {/* --- Header --- */}
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold tracking-tight">Retail Overview</h2>
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-accent/50 px-3 py-1 rounded-full">
                    <Activity className="h-4 w-4 animate-pulse text-green-500" /> Live Updates Active
                </div>
            </div>

            {/* --- Row 1: KPI Cards --- */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card className="border-l-4 border-l-green-500 shadow-sm">
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Today's Sales</CardTitle></CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-700">{isLoading ? "..." : formatFullCurrency(data?.dailyRevenue)}</div>
                        <div className="flex items-center text-xs text-green-600 mt-1"><TrendingUp className="h-3 w-3 mr-1"/> Cash Inflow</div>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-red-500 shadow-sm">
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Today's Expenses</CardTitle></CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-700">{isLoading ? "..." : formatFullCurrency(data?.dailyExpenses)}</div>
                        <div className="flex items-center text-xs text-red-600 mt-1"><TrendingDown className="h-3 w-3 mr-1"/> Cash Outflow</div>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-blue-500 shadow-sm">
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Net Position</CardTitle></CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-700">{isLoading ? "..." : formatFullCurrency(data?.netCash)}</div>
                        <div className="flex items-center text-xs text-muted-foreground mt-1">Daily Profit/Loss</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Transactions</CardTitle></CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{isLoading ? "..." : data?.txCount}</div>
                        <div className="flex items-center text-xs text-muted-foreground mt-1"><ShoppingCart className="h-3 w-3 mr-1"/> Orders Processed</div>
                    </CardContent>
                </Card>
            </div>

            {/* --- Row 2: Charts & Recent Activity (Fills the white space) --- */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7 h-full">
                
                {/* Left: Revenue Chart (Takes 4/7ths of width) */}
                <Card className="col-span-4 shadow-md">
                    <CardHeader>
                        <CardTitle>Revenue Trend</CardTitle>
                        <CardDescription>Sales performance over the last 7 days</CardDescription>
                    </CardHeader>
                    <CardContent className="pl-0">
                        <div className="h-[350px] w-full">
                            {isLoading ? (
                                <div className="h-full flex items-center justify-center text-muted-foreground">Loading Chart...</div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={data?.chartData}>
                                        <defs>
                                            <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                                                <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <XAxis 
                                            dataKey="date" 
                                            stroke="#888888" 
                                            fontSize={12} 
                                            tickLine={false} 
                                            axisLine={false} 
                                        />
                                        <YAxis 
                                            stroke="#888888" 
                                            fontSize={12} 
                                            tickLine={false} 
                                            axisLine={false}
                                            tickFormatter={(value) => `UGX ${value / 1000}k`}
                                        />
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                        <Tooltip 
                                            formatter={(value: number) => [formatFullCurrency(value), 'Revenue']}
                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                        />
                                        <Area 
                                            type="monotone" 
                                            dataKey="sales" 
                                            stroke="#22c55e" 
                                            strokeWidth={2}
                                            fillOpacity={1} 
                                            fill="url(#colorSales)" 
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Right: Recent Transactions Table (Takes 3/7ths of width) */}
                <Card className="col-span-3 shadow-md flex flex-col">
                    <CardHeader>
                        <CardTitle>Recent Sales</CardTitle>
                        <CardDescription>Latest transactions from the POS</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Sale ID</TableHead>
                                    <TableHead>Amount</TableHead>
                                    <TableHead className="text-right">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data?.recentSales.map((sale) => (
                                    <TableRow key={sale.id}>
                                        <TableCell className="font-medium">#{sale.id}</TableCell>
                                        <TableCell>{formatCurrency(sale.total_amount)}</TableCell>
                                        <TableCell className="text-right">
                                            <Badge variant={sale.status === 'completed' ? 'default' : 'secondary'} className={sale.status === 'completed' ? 'bg-green-600 hover:bg-green-700' : ''}>
                                                {sale.status}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {(!data?.recentSales || data.recentSales.length === 0) && (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center h-24 text-muted-foreground">
                                            No sales recorded today.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                    <div className="p-4 border-t bg-muted/20">
                        <Button variant="ghost" size="sm" className="w-full" asChild>
                            <Link href="/sales/history" className="flex items-center justify-center">
                                View All Transactions <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                    </div>
                </Card>
            </div>
        </div>
    );
}