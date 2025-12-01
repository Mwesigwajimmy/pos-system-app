'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HardHat, FileText, Wallet, Hammer } from 'lucide-react';
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh';

// Define the return type for safety
type ContractorData = {
    activeJobs: number;
    cashIn: number;
    openBids: number;
};

async function fetchContractorData(): Promise<ContractorData> {
    const supabase = createClient();
    const today = new Date().toISOString().split('T')[0];

    // 1. Cash Inflow (Payments Received Today)
    const { data: payments } = await supabase
        .from('payments')
        .select('amount')
        .gte('payment_date', today);
    
    const cashIn = payments?.reduce((sum, p) => sum + p.amount, 0) || 0;

    // 2. Active Jobs
    const { count: activeJobs } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'in_progress');

    // 3. Pending Bids
    const { count: openBids } = await supabase
        .from('estimates') // assuming estimates table exists
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

    return { 
        activeJobs: activeJobs || 0, 
        cashIn,
        openBids: openBids || 0
    };
}

export default function ContractorDashboard() {
    // Watches payments, projects, and estimates for changes
    useRealtimeRefresh(['payments', 'projects', 'estimates'], ['contractor-dash']);
    
    const { data, isLoading } = useQuery({ 
        queryKey: ['contractor-dash'], 
        queryFn: fetchContractorData 
    });

    // FIX: Update type to accept number OR undefined to prevent TS Error
    const formatCurrency = (val: number | undefined) => 
        `UGX ${new Intl.NumberFormat('en-US').format(val || 0)}`;

    return (
        <div className="p-6 space-y-6">
            <h2 className="text-3xl font-bold tracking-tight">Contractor Hub</h2>
            <div className="grid gap-4 md:grid-cols-3">
                
                {/* Metric 1: Cash Collected */}
                <Card className="bg-green-50 border-green-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-green-800">
                            <Wallet className="h-5 w-5 text-green-700"/> Cash Collected Today
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {/* Now safe because formatCurrency handles undefined */}
                        <div className="text-3xl font-bold text-green-800">
                            {isLoading ? "..." : formatCurrency(data?.cashIn)}
                        </div>
                    </CardContent>
                </Card>

                {/* Metric 2: Active Jobs */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2">
                            <HardHat className="h-5 w-5 text-yellow-600"/> Active Job Sites
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">
                            {isLoading ? "..." : (data?.activeJobs ?? 0)}
                        </div>
                        <p className="text-sm text-muted-foreground">Sites currently active</p>
                    </CardContent>
                </Card>

                {/* Metric 3: Pending Bids */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-blue-600"/> Pending Bids
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">
                            {isLoading ? "..." : (data?.openBids ?? 0)}
                        </div>
                        <p className="text-sm text-muted-foreground">Estimates sent</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}