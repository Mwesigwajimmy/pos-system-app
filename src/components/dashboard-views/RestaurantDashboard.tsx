'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Utensils, ChefHat, DollarSign } from 'lucide-react';
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh';

type RestaurantData = {
    activeOrders: number;
    dailyTotal: number;
};

async function fetchRestaurantData(): Promise<RestaurantData> {
    const supabase = createClient();
    const today = new Date().toISOString().split('T')[0];

    const { count: activeOrders } = await supabase.from('orders').select('*', { count: 'exact', head: true }).in('status', ['pending', 'preparing']);
    const { data: sales } = await supabase.from('sales').select('total_amount').gte('created_at', today);
    const dailyTotal = sales?.reduce((acc, curr) => acc + curr.total_amount, 0) || 0;

    return { activeOrders: activeOrders || 0, dailyTotal };
}

export default function RestaurantDashboard() {
    useRealtimeRefresh(['orders', 'sales'], ['restaurant-dash']);
    
    const { data, isLoading } = useQuery({ queryKey: ['restaurant-dash'], queryFn: fetchRestaurantData });
    
    // FIX: Handle undefined values safely
    const formatCurrency = (val: number | undefined) => `UGX ${new Intl.NumberFormat('en-US').format(val || 0)}`;

    return (
        <div className="p-6 space-y-6">
            <h2 className="text-3xl font-bold tracking-tight">Restaurant Overview</h2>
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
                    <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2"><Utensils className="text-blue-600"/> Table Occupancy</CardTitle></CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">Live</div>
                        <p className="text-sm text-muted-foreground">View Floor Plan</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}