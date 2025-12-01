'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShoppingCart, TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh';

type RetailData = {
    dailyRevenue: number;
    dailyExpenses: number;
    netCash: number;
    txCount: number;
    lowStock: number;
};

async function fetchRetailDailyData(): Promise<RetailData> {
    const supabase = createClient();
    const today = new Date().toISOString().split('T')[0];

    const { data: sales } = await supabase.from('sales').select('total_amount').gte('created_at', today);
    const dailyRevenue = sales?.reduce((sum, s) => sum + s.total_amount, 0) || 0;

    const { data: expenses } = await supabase.from('expenses').select('amount').gte('date', today);
    const dailyExpenses = expenses?.reduce((sum, e) => sum + e.amount, 0) || 0;

    const { count: lowStock } = await supabase.from('product_variants').select('*', { count: 'exact', head: true }).lt('stock_quantity', 10);
    const { count: txCount } = await supabase.from('sales').select('*', { count: 'exact', head: true }).gte('created_at', today);

    return { 
        dailyRevenue, 
        dailyExpenses, 
        netCash: dailyRevenue - dailyExpenses,
        txCount: txCount || 0, 
        lowStock: lowStock || 0 
    };
}

export default function RetailDashboard() {
    useRealtimeRefresh(['sales', 'expenses', 'product_variants'], ['retail-daily']);
    
    const { data, isLoading } = useQuery({ queryKey: ['retail-daily'], queryFn: fetchRetailDailyData });
    
    // FIX: Handle undefined values safely
    const formatCurrency = (val: number | undefined) => `UGX ${new Intl.NumberFormat('en-US').format(val || 0)}`;

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold tracking-tight">Retail Overview</h2>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Activity className="h-4 w-4 animate-pulse text-green-500" /> Live Updates Active
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
                <Card className="border-l-4 border-l-green-500 shadow-sm">
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Today's Sales</CardTitle></CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-700">{isLoading ? "..." : formatCurrency(data?.dailyRevenue)}</div>
                        <div className="flex items-center text-xs text-green-600 mt-1"><TrendingUp className="h-3 w-3 mr-1"/> Cash Inflow</div>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-red-500 shadow-sm">
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Today's Expenses</CardTitle></CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-700">{isLoading ? "..." : formatCurrency(data?.dailyExpenses)}</div>
                        <div className="flex items-center text-xs text-red-600 mt-1"><TrendingDown className="h-3 w-3 mr-1"/> Cash Outflow</div>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-blue-500 shadow-sm">
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Net Cash Position</CardTitle></CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-700">{isLoading ? "..." : formatCurrency(data?.netCash)}</div>
                        <div className="flex items-center text-xs text-muted-foreground mt-1">Daily Profit/Loss</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Transactions</CardTitle></CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{isLoading ? "..." : (data?.txCount || 0)}</div>
                        <div className="flex items-center text-xs text-muted-foreground mt-1"><ShoppingCart className="h-3 w-3 mr-1"/> Orders Processed</div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}