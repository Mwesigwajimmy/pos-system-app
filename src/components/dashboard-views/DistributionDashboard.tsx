'use client';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Truck, PackageCheck, Banknote } from 'lucide-react';
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh';

async function fetchDistData() {
    const supabase = createClient();
    const today = new Date().toISOString().split('T')[0];

    // Vehicles currently shipping
    const { count: inTransit } = await supabase.from('sales').select('*', { count: 'exact', head: true }).eq('status', 'in_transit');
    
    // Cash collected by drivers today
    const { data: collections } = await supabase.from('payments').select('amount').eq('method', 'cash_on_delivery').gte('payment_date', today);
    const dailyCOD = collections?.reduce((a, b) => a + b.amount, 0) || 0;

    return { inTransit: inTransit || 0, dailyCOD };
}

export default function DistributionDashboard() {
    useRealtimeRefresh(['sales', 'payments'], ['dist-dash']);
    const { data } = useQuery({ queryKey: ['dist-dash'], queryFn: fetchDistData });

    return (
        <div className="p-6 space-y-6">
            <h2 className="text-3xl font-bold tracking-tight">Distribution & Logistics</h2>
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2"><Truck className="text-blue-600"/> Fleet Active</CardTitle></CardHeader>
                    <CardContent><div className="text-3xl font-bold">{data?.inTransit}</div><p className="text-sm text-muted-foreground">Trucks on road</p></CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2"><Banknote className="text-green-600"/> COD Collected</CardTitle></CardHeader>
                    <CardContent><div className="text-3xl font-bold">UGX {data?.dailyCOD.toLocaleString()}</div><p className="text-sm text-muted-foreground">Cash held by drivers today</p></CardContent>
                </Card>
            </div>
        </div>
    );
}