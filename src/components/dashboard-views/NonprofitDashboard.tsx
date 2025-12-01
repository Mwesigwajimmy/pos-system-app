'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Heart, Users, CalendarHeart } from 'lucide-react';
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh';

type NonprofitData = {
    raisedToday: number;
    raisedTotal: number;
    volunteers: number;
};

async function fetchNonprofitData(): Promise<NonprofitData> {
    const supabase = createClient();
    const today = new Date().toISOString().split('T')[0];

    // 1. Donations Received Today
    const { data: donations } = await supabase.from('invoices').select('total').eq('type', 'donation').gte('created_at', today);
    const raisedToday = donations?.reduce((a, b) => a + b.total, 0) || 0;

    // 2. Total Raised All Time
    const { data: allDonations } = await supabase.from('invoices').select('total').eq('type', 'donation');
    const raisedTotal = allDonations?.reduce((a, b) => a + b.total, 0) || 0;

    // 3. Active Volunteers (Mock count or real query)
    const { count } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'volunteer');

    return { raisedToday, raisedTotal, volunteers: count || 0 };
}

export default function NonprofitDashboard() {
    useRealtimeRefresh(['invoices', 'users'], ['nonprofit-dash']);
    
    const { data, isLoading } = useQuery({ queryKey: ['nonprofit-dash'], queryFn: fetchNonprofitData });
    
    // FIX: Handle undefined values safely
    const formatCurrency = (val: number | undefined) => `UGX ${new Intl.NumberFormat('en-US').format(val || 0)}`;

    return (
        <div className="p-6 space-y-6">
            <h2 className="text-3xl font-bold tracking-tight">Impact Dashboard</h2>
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="bg-red-50 border-red-200">
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-red-800">Raised Today</CardTitle></CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-red-700">{isLoading ? "..." : formatCurrency(data?.raisedToday)}</div>
                        <div className="flex items-center text-xs text-red-600 mt-1"><Heart className="h-3 w-3 mr-1"/> Donations Received</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Campaign Fund</CardTitle></CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{isLoading ? "..." : formatCurrency(data?.raisedTotal)}</div>
                        <div className="flex items-center text-xs text-muted-foreground mt-1"><CalendarHeart className="h-3 w-3 mr-1"/> Year to Date</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Active Volunteers</CardTitle></CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{isLoading ? "..." : (data?.volunteers || 0)}</div>
                        <div className="flex items-center text-xs text-muted-foreground mt-1"><Users className="h-3 w-3 mr-1"/> Registered</div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}