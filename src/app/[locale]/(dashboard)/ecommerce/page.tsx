import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Activity, CreditCard, DollarSign, Users } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Import the real components
import { OverviewChart } from '@/components/ecommerce/OverviewChart';
import { RecentSales } from '@/components/ecommerce/RecentSales';

// This utility should ideally live in a central auth file
async function getCurrentUser(supabase: any) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect('/login');
    }
    return user;
}

// Data fetching function for all eCommerce stats
async function getEcommerceDashboardData(supabase: any) {
    const revenuePromise = supabase
        .from('online_orders')
        .select('total_amount')
        .in('status', ['COMPLETED', 'SHIPPED', 'PAID'])
        .then((res: { data: { total_amount: number }[] | null }) =>
            res.data?.reduce((sum: number, row: { total_amount: number }) => sum + row.total_amount, 0) || 0
        );

    const salesCountPromise = supabase
        .from('online_orders')
        .select('id', { count: 'exact' })
        .in('status', ['COMPLETED', 'SHIPPED', 'PAID'])
        .then((res: { count: number | null }) => res.count || 0);

    const newCustomersPromise = supabase
        .from('customers')
        .select('id', { count: 'exact' })
        .then((res: { count: number | null }) => res.count || 0);

    const recentOrdersPromise = supabase
        .from('online_orders')
        .select(`
            id,
            customer_email,
            total_amount,
            customers ( name )
        `)
        .order('created_at', { ascending: false })
        .limit(5);

    const [totalRevenue, salesCount, newCustomers, recentOrdersResult] = await Promise.all([
        revenuePromise,
        salesCountPromise,
        newCustomersPromise,
        recentOrdersPromise,
    ]);

    return {
        totalRevenue,
        salesCount,
        newCustomers,
        recentOrders: recentOrdersResult.data || [],
    };
}

export default async function EcommerceDashboardPage() {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    await getCurrentUser(supabase); // Just for auth check
    
    const { totalRevenue, salesCount, newCustomers, recentOrders } = await getEcommerceDashboardData(supabase);

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">eCommerce Dashboard</h2>
            </div>
            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                </TabsList>
                <TabsContent value="overview" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                                <DollarSign className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalRevenue)}
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">New Customers</CardTitle>
                                <Users className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">+{newCustomers}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Sales</CardTitle>
                                <CreditCard className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">+{salesCount}</div>
                            </CardContent>
                        </Card>
                        <Card>
                             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Active Now</CardTitle>
                                <Activity className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">+573</div>
                            </CardContent>
                        </Card>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                        <OverviewChart />
                        <RecentSales orders={recentOrders} />
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}