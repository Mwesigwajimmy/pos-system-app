'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Banknote, TrendingUp, TrendingDown, Users } from 'lucide-react';
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh';

// Define return type for safety
type LendingData = {
    disbursedToday: number;
    collectedToday: number;
    borrowers: number;
};

async function fetchLendingData(): Promise<LendingData> {
    const supabase = createClient();
    const today = new Date().toISOString().split('T')[0];

    // 1. Money Out (Loans Disbursed Today)
    const { data: loans } = await supabase
        .from('loans')
        .select('principal_amount')
        .eq('status', 'active')
        .gte('disbursement_date', today);
    
    const disbursedToday = loans?.reduce((a, b) => a + b.principal_amount, 0) || 0;

    // 2. Money In (Repayments Collected Today)
    // Assuming you have a transactions table for repayments
    const { data: repayments } = await supabase
        .from('transactions')
        .select('amount')
        .eq('type', 'repayment')
        .gte('created_at', today);
    
    const collectedToday = repayments?.reduce((a, b) => a + b.amount, 0) || 0;

    // 3. Active Borrowers
    const { count: borrowers } = await supabase
        .from('loans')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

    return { 
        disbursedToday, 
        collectedToday, 
        borrowers: borrowers || 0 
    };
}

export default function LendingDashboard() {
    // Listen to changes in loans and transactions
    useRealtimeRefresh(['loans', 'transactions'], ['lending-dash']);
    
    const { data, isLoading } = useQuery({ 
        queryKey: ['lending-dash'], 
        queryFn: fetchLendingData 
    });

    // FIX: Accept number OR undefined to prevent build errors
    const formatCurrency = (val: number | undefined) => 
        `UGX ${new Intl.NumberFormat('en-US').format(val || 0)}`;

    return (
        <div className="p-6 space-y-6 animate-in fade-in-50">
            <h2 className="text-3xl font-bold tracking-tight">Lending Overview</h2>
            
            <div className="grid gap-4 md:grid-cols-3">
                {/* Metric 1: Disbursed */}
                <Card className="border-l-4 border-l-red-500">
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Disbursed Today</CardTitle></CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-700">
                            {isLoading ? "..." : formatCurrency(data?.disbursedToday)}
                        </div>
                        <div className="flex items-center text-xs text-muted-foreground mt-1">
                            <TrendingDown className="h-3 w-3 mr-1"/> Cash Outflow (New Loans)
                        </div>
                    </CardContent>
                </Card>

                {/* Metric 2: Collections */}
                <Card className="border-l-4 border-l-green-500">
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Repayments Today</CardTitle></CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-700">
                            {isLoading ? "..." : formatCurrency(data?.collectedToday)}
                        </div>
                        <div className="flex items-center text-xs text-muted-foreground mt-1">
                            <TrendingUp className="h-3 w-3 mr-1"/> Cash Inflow (Collections)
                        </div>
                    </CardContent>
                </Card>

                {/* Metric 3: Borrowers */}
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Active Loans</CardTitle></CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {isLoading ? "..." : (data?.borrowers ?? 0)}
                        </div>
                        <div className="flex items-center text-xs text-muted-foreground mt-1">
                            <Users className="h-3 w-3 mr-1"/> Borrowers with Balance
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}