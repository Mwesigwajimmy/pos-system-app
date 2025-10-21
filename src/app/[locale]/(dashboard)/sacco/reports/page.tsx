// src/app/(dashboard)/sacco/reports/page.tsx

'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Wallet, Landmark, PiggyBank, Scale } from 'lucide-react';

async function fetchFinancialSummary() {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('get_sacco_financial_summary');
    if (error) throw new Error(error.message);
    // This will return undefined if data is an empty array, which is fine.
    return data[0];
}

const formatCurrency = (value: number | null | undefined) => 
    value != null ? `UGX ${new Intl.NumberFormat('en-US').format(value)}` : 'UGX 0';

const KpiCard = ({ title, value, icon: Icon, description }: { title: string; value: string; icon: React.ElementType; description?: string }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">{value}</div>
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </CardContent>
    </Card>
);

export default function ReportsPage() {
    const { data: summary, isLoading, isError } = useQuery({ // Added isError
        queryKey: ['saccoFinancialSummary'],
        queryFn: fetchFinancialSummary,
    });

    // This calculation is already safe thanks to optional chaining
    const netProfit = (summary?.total_revenue || 0) - (summary?.total_expenses || 0);

    // Handle loading state
    if (isLoading) {
        return (
            <div className="container mx-auto py-6 space-y-6">
                <h1 className="text-3xl font-bold">Financial Reports</h1>
                <p>Loading financial summary...</p>
            </div>
        );
    }

    // Handle error state
    if (isError) {
        return (
            <div className="container mx-auto py-6 space-y-6">
                <h1 className="text-3xl font-bold">Financial Reports</h1>
                <p className="text-destructive">Failed to load financial data. Please try again later.</p>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-6 space-y-6">
            <h1 className="text-3xl font-bold">Financial Reports</h1>
            <p className="text-muted-foreground">A summary of the organization's financial health and performance.</p>

            <div className="space-y-6">
                <Card className="bg-muted/30">
                    <CardHeader>
                        <CardTitle className="flex items-center"><Scale className="mr-2 h-5 w-5"/>Income Statement (Profit & Loss)</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-3">
                        {/* CORRECTED: Added optional chaining (?.) to all summary properties */}
                        <KpiCard title="Total Revenue" value={formatCurrency(summary?.total_revenue)} icon={TrendingUp} description="Loan fees, interest, other income" />
                        <KpiCard title="Total Expenses" value={formatCurrency(summary?.total_expenses)} icon={TrendingDown} description="Operational costs" />
                        <KpiCard title="Net Profit / (Loss)" value={formatCurrency(netProfit)} icon={Scale} description="Revenue minus Expenses" />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Balance Sheet Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-3">
                        {/* CORRECTED: Added optional chaining (?.) to all summary properties */}
                        <KpiCard title="Total Share Capital" value={formatCurrency(summary?.total_shares)} icon={Landmark} />
                        <KpiCard title="Total Member Savings" value={formatCurrency(summary?.total_savings)} icon={PiggyBank} />
                        <KpiCard title="Outstanding Loan Portfolio" value={formatCurrency(summary?.total_loans_outstanding)} icon={Wallet} />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}