'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { KeyRound, Wallet, FileCheck } from 'lucide-react';
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh';

type RealEstateData = {
    dailyRent: number;
    totalUnits: number;
    activeLeases: number;
};

async function fetchRealEstateData(): Promise<RealEstateData> {
    const supabase = createClient();
    const today = new Date().toISOString().split('T')[0];

    const { data: payments } = await supabase.from('payments').select('amount').gte('payment_date', today);
    const dailyRent = payments?.reduce((a, b) => a + b.amount, 0) || 0;

    const { count: totalUnits } = await supabase.from('properties').select('*', { count: 'exact', head: true });
    const { count: activeLeases } = await supabase.from('leases').select('*', { count: 'exact', head: true }).eq('status', 'active');

    return { dailyRent, totalUnits: totalUnits || 0, activeLeases: activeLeases || 0 };
}

export default function RealEstateDashboard() {
    useRealtimeRefresh(['payments', 'leases', 'properties'], ['estate-dash']);
    
    const { data, isLoading } = useQuery({ queryKey: ['estate-dash'], queryFn: fetchRealEstateData });
    
    // FIX: Handle undefined values safely
    const formatCurrency = (val: number | undefined) => `UGX ${new Intl.NumberFormat('en-US').format(val || 0)}`;
    const occupancyRate = data?.totalUnits ? Math.round((data.activeLeases / data.totalUnits) * 100) : 0;

    return (
        <div className="p-6 space-y-6">
            <h2 className="text-3xl font-bold tracking-tight">Property Management</h2>
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="border-l-4 border-l-green-600">
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Rent Collected Today</CardTitle></CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-700">{isLoading ? "..." : formatCurrency(data?.dailyRent)}</div>
                        <div className="flex items-center text-xs text-muted-foreground mt-1"><Wallet className="h-3 w-3 mr-1"/> Cash Inflow</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Occupancy Rate</CardTitle></CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{isLoading ? "..." : occupancyRate}%</div>
                        <div className="flex items-center text-xs text-muted-foreground mt-1"><KeyRound className="h-3 w-3 mr-1"/> {data?.activeLeases} / {data?.totalUnits} Units Leased</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Leases Expiring</CardTitle></CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-600">3</div>
                        <div className="flex items-center text-xs text-muted-foreground mt-1"><FileCheck className="h-3 w-3 mr-1"/> Within 30 days</div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}