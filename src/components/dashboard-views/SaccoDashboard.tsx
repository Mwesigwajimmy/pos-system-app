'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowUpCircle, ArrowDownCircle, Users } from 'lucide-react';
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh';

type SaccoData = {
    dailyDeposits: number;
    dailyWithdrawals: number;
    members: number;
};

async function fetchSaccoDaily(): Promise<SaccoData> {
    const supabase = createClient();
    const today = new Date().toISOString().split('T')[0];

    const { data: deposits } = await supabase.from('transactions').select('amount').eq('type', 'deposit').gte('created_at', today);
    const dailyDeposits = deposits?.reduce((a, b) => a + b.amount, 0) || 0;

    const { data: withdrawals } = await supabase.from('transactions').select('amount').eq('type', 'withdrawal').gte('created_at', today);
    const dailyWithdrawals = withdrawals?.reduce((a, b) => a + b.amount, 0) || 0;

    const { count: members } = await supabase.from('customers').select('*', { count: 'exact', head: true });

    return { dailyDeposits, dailyWithdrawals, members: members || 0 };
}

export default function SaccoDashboard() {
    useRealtimeRefresh(['transactions', 'customers'], ['sacco-dash']);
    
    const { data, isLoading } = useQuery({ queryKey: ['sacco-dash'], queryFn: fetchSaccoDaily });
    
    // FIX: Handle undefined values safely
    const formatCurrency = (val: number | undefined) => `UGX ${new Intl.NumberFormat('en-US').format(val || 0)}`;

    return (
        <div className="p-6 space-y-6">
            <h2 className="text-3xl font-bold tracking-tight">SACCO Operations</h2>
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="border-l-4 border-l-green-600">
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Deposits Today</CardTitle></CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-700">{isLoading ? "..." : formatCurrency(data?.dailyDeposits)}</div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1"><ArrowUpCircle className="h-3 w-3 text-green-500" /> Cash Inflow</div>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-orange-600">
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Withdrawals Today</CardTitle></CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-700">{isLoading ? "..." : formatCurrency(data?.dailyWithdrawals)}</div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1"><ArrowDownCircle className="h-3 w-3 text-orange-500" /> Cash Outflow</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Membership</CardTitle></CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{isLoading ? "..." : (data?.members || 0)}</div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1"><Users className="h-3 w-3" /> Active Accounts</div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}