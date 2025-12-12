import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Activity, CreditCard, DollarSign, Users, ArrowUpRight, ArrowDownRight } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Import the real enterprise components
import { OverviewChart } from '@/components/ecommerce/OverviewChart';
import { RecentSales } from '@/components/ecommerce/RecentSales';

// ----------------------------------------------------------------------
// 1. AUTH UTILITY
// ----------------------------------------------------------------------
async function getCurrentUser(supabase: any) {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
        redirect('/login');
    }
    return user;
}

// ----------------------------------------------------------------------
// 2. DATA FETCHING SERVICE (AGGREGATED)
// ----------------------------------------------------------------------
async function getEcommerceDashboardData(supabase: any) {
    const currentYear = new Date().getFullYear();

    // 1. RPC: Dashboard Key Metrics (Revenue, Orders Count)
    // We reuse the efficient RPC we created earlier
    const statsPromise = supabase.rpc('get_ecommerce_dashboard_stats');

    // 2. RPC: Chart Data (Monthly Aggregation)
    const chartPromise = supabase.rpc('get_monthly_sales_overview');

    // 3. TABLE: Recent Orders (Joined with Customers)
    const recentOrdersPromise = supabase
        .from('online_orders')
        .select(`
            id,
            total_amount,
            currency_code,
            customer_email,
            created_at,
            customers ( name, avatar_url )
        `)
        .neq('status', 'cancelled')
        .order('created_at', { ascending: false })
        .limit(5);

    // 4. TABLE: New Customers Count (This Month)
    // Enterprise apps calculate this via DB count, not JS array length
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    const newCustomersPromise = supabase
        .from('customers')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', startOfMonth);

    // 5. TABLE: Active Carts (Proxy for "Active Now")
    // Counts carts updated in the last 24 hours
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const activeCartsPromise = supabase
        .from('cart_sessions')
        .select('id', { count: 'exact', head: true })
        .gte('updated_at', yesterday);

    // EXECUTE ALL PARALLEL
    const [statsResult, chartResult, recentOrdersResult, newCustomersResult, activeCartsResult] = 
        await Promise.all([
            statsPromise,
            chartPromise,
            recentOrdersPromise,
            newCustomersPromise,
            activeCartsPromise
        ]);

    // DATA MAPPING
    const stats = Array.isArray(statsResult.data) ? statsResult.data[0] : statsResult.data || {};

    return {
        metrics: {
            totalRevenue: stats.total_revenue || 0,
            salesCount: stats.total_orders || 0,
            activeCarts: activeCartsResult.count || 0,
            newCustomers: newCustomersResult.count || 0
        },
        chartData: (chartResult.data || []).map((item: any) => ({
            name: item.month_name,
            total: Number(item.total_revenue)
        })),
        recentOrders: (recentOrdersResult.data || []).map((order: any) => ({
            id: order.id,
            customer_email: order.customer_email || 'No Email',
            total_amount: order.total_amount || 0,
            currency: order.currency_code || 'USD',
            customer_name: order.customers?.name || 'Guest',
            customer_avatar: order.customers?.avatar_url
        })),
        currency: 'UGX', // Or fetch from settings
        year: currentYear
    };
}

// ----------------------------------------------------------------------
// 3. MAIN PAGE COMPONENT
// ----------------------------------------------------------------------
export default async function EcommerceDashboardPage() {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    // 1. Security
    await getCurrentUser(supabase);
    
    // 2. Fetch All Data
    const { metrics, chartData, recentOrders, currency, year } = await getEcommerceDashboardData(supabase);

    // Helper for formatting
    const formatMoney = (amount: number) => 
        new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">eCommerce Dashboard</h2>
                <div className="flex items-center space-x-2">
                    {/* Optional: Add Date Range Picker here */}
                </div>
            </div>
            
            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="analytics" disabled>Analytics</TabsTrigger>
                    <TabsTrigger value="reports" disabled>Reports</TabsTrigger>
                </TabsList>
                
                <TabsContent value="overview" className="space-y-4">
                    {/* KPI CARDS */}
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                                <DollarSign className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{formatMoney(metrics.totalRevenue)}</div>
                                <p className="text-xs text-muted-foreground">
                                    +20.1% from last month
                                </p>
                            </CardContent>
                        </Card>
                        
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">New Customers</CardTitle>
                                <Users className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">+{metrics.newCustomers}</div>
                                <p className="text-xs text-muted-foreground">
                                    Joined this month
                                </p>
                            </CardContent>
                        </Card>
                        
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
                                <CreditCard className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">+{metrics.salesCount}</div>
                                <p className="text-xs text-muted-foreground">
                                    Processed orders
                                </p>
                            </CardContent>
                        </Card>
                        
                        <Card>
                             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Active Carts</CardTitle>
                                <Activity className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">+{metrics.activeCarts}</div>
                                <p className="text-xs text-muted-foreground">
                                    Updated in last 24h
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* CHART & RECENT SALES */}
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                        {/* Passes real data to the Recharts component */}
                        <OverviewChart 
                            data={chartData} 
                            currency={currency} 
                            year={year} 
                        />
                        
                        {/* Passes real data to the Recent Orders list */}
                        <RecentSales orders={recentOrders} />
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}