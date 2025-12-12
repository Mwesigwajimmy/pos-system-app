import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

// Import Components
import { EcommerceDashboard, DashboardMetrics } from '@/components/ecommerce/EcommerceDashboard';
import { OverviewChart, MonthlySalesData } from '@/components/ecommerce/OverviewChart';

// ----------------------------------------------------------------------
// 1. AUTH & SETUP
// ----------------------------------------------------------------------
async function getCurrentUser(supabase: any) {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) redirect('/login');
    return user;
}

// ----------------------------------------------------------------------
// 2. DATA FETCHING: KPI CARDS
// ----------------------------------------------------------------------
async function getDashboardMetrics(supabase: any): Promise<DashboardMetrics> {
    const { data, error } = await supabase.rpc('get_ecommerce_dashboard_stats');
    if (error) return { totalOrders: 0, grossSales: 0, conversionRate: 0, returnedItems: 0, currency: 'UGX', period: 'FY 2025' };
    const stats = Array.isArray(data) ? data[0] : data;
    return {
        totalOrders: stats?.total_orders ?? 0,
        grossSales: stats?.total_revenue ?? 0,
        conversionRate: stats?.conversion_rate ?? 0,
        returnedItems: stats?.total_returns ?? 0,
        currency: 'UGX',
        period: 'FY 2025'
    };
}

// ----------------------------------------------------------------------
// 3. DATA FETCHING: CHART DATA (Real RPC)
// ----------------------------------------------------------------------
async function getSalesOverview(supabase: any): Promise<MonthlySalesData[]> {
    // Calls a Postgres function that groups sales by month for the current year
    const { data, error } = await supabase.rpc('get_monthly_sales_overview');

    if (error) {
        console.error("Chart RPC Error:", error.message);
        return [];
    }

    // Map DB response to UI format
    return data.map((item: any) => ({
        name: item.month_name, // e.g., 'Jan', 'Feb'
        total: Number(item.total_revenue) // Ensure it's a number
    }));
}

// ----------------------------------------------------------------------
// 4. MAIN DASHBOARD PAGE
// ----------------------------------------------------------------------
export default async function EcommerceDashboardPage() {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    await getCurrentUser(supabase);
    
    // Parallel Data Fetching for performance
    const [metrics, salesData] = await Promise.all([
        getDashboardMetrics(supabase),
        getSalesOverview(supabase)
    ]);

    const currentYear = new Date().getFullYear();

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between">
                 <div className="space-y-1">
                    <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
                    <p className="text-muted-foreground">
                        Real-time financial insights and performance metrics.
                    </p>
                </div>
            </div>

            {/* 1. KPI Cards */}
            <EcommerceDashboard metrics={metrics} />

            {/* 2. Charts Section */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                {/* Revenue Chart (Takes up 4 columns) */}
                <OverviewChart 
                    data={salesData} 
                    currency={metrics.currency} 
                    year={currentYear} 
                />
                
                {/* 
                   Note: You would typically place a "Recent Sales" 
                   or "Top Products" component in the remaining 3 columns here 
                */}
                 <div className="col-span-3 rounded-xl border bg-card text-card-foreground shadow">
                    {/* Placeholder for RecentSales.tsx if you have it */}
                     <div className="p-6">
                        <h3 className="font-semibold leading-none tracking-tight">Recent Sales</h3>
                        <p className="text-sm text-muted-foreground pt-1">You made 265 sales this month.</p>
                        <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                            Coming Soon...
                        </div>
                     </div>
                 </div>
            </div>
        </div>
    );
}