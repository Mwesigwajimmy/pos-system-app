'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Signal, Smartphone, Wallet, ArrowRightLeft } from 'lucide-react';
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh';

type TelecomData = {
    dailySales: number;
    floatReqs: number;
    agents: number;
};

async function fetchTelecomData(): Promise<TelecomData> {
    const supabase = createClient();
    const today = new Date().toISOString().split('T')[0];

    const { data: sales } = await supabase.from('sales').select('total_amount').gte('created_at', today);
    const dailySales = sales?.reduce((a, b) => a + b.total_amount, 0) || 0;

    const { count: floatReqs } = await supabase.from('float_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending');
    const { count: agents } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'agent');

    return { dailySales, floatReqs: floatReqs || 0, agents: agents || 0 };
}

export default function TelecomDashboard() {
    useRealtimeRefresh(['sales', 'float_requests', 'users'], ['telecom-dash']);
    
    const { data, isLoading } = useQuery({ queryKey: ['telecom-dash'], queryFn: fetchTelecomData });
    
    // FIX: Handle undefined values safely
    const formatCurrency = (val: number | undefined) => `UGX ${new Intl.NumberFormat('en-US').format(val || 0)}`;

    return (
        <div className="p-6 space-y-6">
            <h2 className="text-3xl font-bold tracking-tight">Telecom Operations</h2>
            <div className="grid gap-4 md:grid-cols-4">
                <Card className="border-l-4 border-l-purple-600">
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Daily Sales</CardTitle></CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-purple-700">{isLoading ? "..." : formatCurrency(data?.dailySales)}</div>
                        <div className="flex items-center text-xs text-muted-foreground mt-1"><Signal className="h-3 w-3 mr-1"/> Airtime & Data</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Float Requests</CardTitle></CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{isLoading ? "..." : (data?.floatReqs || 0)}</div>
                        <div className="flex items-center text-xs text-muted-foreground mt-1"><ArrowRightLeft className="h-3 w-3 mr-1"/> Pending Approval</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Active Agents</CardTitle></CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{isLoading ? "..." : (data?.agents || 0)}</div>
                        <div className="flex items-center text-xs text-muted-foreground mt-1"><Smartphone className="h-3 w-3 mr-1"/> Online Now</div>
                    </CardContent>
                </Card>
                <Card className="bg-slate-900 text-white">
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-slate-300">Master Float Balance</CardTitle></CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">UGX 500.0M</div>
                        <div className="flex items-center text-xs text-slate-400 mt-1"><Wallet className="h-3 w-3 mr-1"/> Liquidity</div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}