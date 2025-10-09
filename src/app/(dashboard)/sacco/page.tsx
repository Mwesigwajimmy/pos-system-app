// src/app/(dashboard)/sacco/page.tsx

'use client';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, BarChart, Landmark, Wallet, AlertCircle } from 'lucide-react';

// --- Data Fetching Function ---
async function fetchDashboardKPIs() {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('get_sacco_dashboard_kpis');
    if (error) throw new Error(error.message);
    return data;
}

const formatCurrency = (value: number | null | undefined) => 
    value != null ? `UGX ${new Intl.NumberFormat('en-US').format(value)}` : 'UGX 0';

export default function SaccoDashboardPage() {
    const { data: kpis, isLoading, error } = useQuery({
        queryKey: ['saccoDashboardKPIs'],
        queryFn: fetchDashboardKPIs,
    });

    if (error) {
        return (
            <div className="container mx-auto py-6 space-y-6 text-center">
                 <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
                 <h1 className="text-2xl font-bold text-destructive">Failed to Load Dashboard</h1>
                 <p className="text-muted-foreground">{error.message}</p>
                 <p>This can happen if the database functions are not set up correctly. Please ensure the latest SQL script has been run.</p>
            </div>
        )
    }

    const kpiCards = [
        { title: 'Active Members', value: kpis?.total_members, icon: Users },
        { title: 'Total Share Capital', value: formatCurrency(kpis?.total_shares), icon: Landmark },
        { title: 'Total Savings Balance', value: formatCurrency(kpis?.total_savings), icon: Wallet },
        { title: 'Active Loan Portfolio', value: formatCurrency(kpis?.total_loans_outstanding), icon: BarChart },
    ];

    return (
        <div className="container mx-auto py-6 space-y-6">
            <h1 className="text-3xl font-bold">SACCO & Co-operative Dashboard</h1>
            
            {isLoading && <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {[...Array(4)].map((_, i) => <Card key={i}><CardHeader><div className="h-4 bg-muted rounded w-3/4"></div></CardHeader><CardContent><div className="h-8 bg-muted rounded w-1/2"></div></CardContent></Card>)}
            </div>}
            
            {!isLoading && <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {kpiCards.map(card => (
                    <Card key={card.title}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                            <card.icon className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {card.value ?? '0'}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>}
        </div>
    );
}