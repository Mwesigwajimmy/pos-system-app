'use client';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton'; // For professional loading
import Link from 'next/link';

async function fetchAccountingKpis() {
    const supabase = createClient();
    // RPC call to the enterprise engine we just created
    const { data, error } = await supabase.rpc('get_accounting_kpis');
    if (error) throw new Error(error.message);
    return data;
}

export default function AccountingDashboardPage() {
    const { data, isLoading, error } = useQuery({ 
        queryKey: ['accountingKpis'], 
        queryFn: fetchAccountingKpis 
    });

    // Enterprise-grade currency formatting based on tenant settings
    const formatValue = (value: number) => {
        const currency = data?.currencySymbol || 'USD';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
        }).format(value);
    };

    const kpis = [
        { title: "Total Assets", value: data?.totalAssets, color: "text-blue-600" },
        { title: "Total Liabilities", value: data?.totalLiabilities, color: "text-red-600" },
        { title: "Total Equity", value: data?.totalEquity, color: "text-green-600" },
    ];

    if (error) return <div className="p-6 text-red-500">Error loading financial data: {error.message}</div>;

    return (
        <div className="container mx-auto py-8 space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-4xl font-extrabold tracking-tight">Accounting Center</h1>
                    <p className="text-muted-foreground mt-1">Real-time financial health across all locations.</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" asChild><Link href="/accounting/reports">Advanced Reports</Link></Button>
                    <Button asChild><Link href="/accounting/chart-of-accounts">Manage Accounts</Link></Button>
                </div>
            </div>
            
            <div className="grid gap-6 md:grid-cols-3">
                {kpis.map(kpi => (
                    <Card key={kpi.title} className="shadow-md hover:shadow-lg transition-shadow">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                                {kpi.title}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <Skeleton className="h-9 w-3/4" />
                            ) : (
                                <div className={`text-3xl font-bold ${kpi.color}`}>
                                    {formatValue(kpi.value || 0)}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Card className="bg-slate-50 border-dashed">
                <CardHeader>
                    <CardTitle>Enterprise Controls</CardTitle>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Button variant="secondary" className="w-full justify-start" asChild>
                        <Link href="/accounting/bills">Pending Bills & Payables</Link>
                    </Button>
                    <Button variant="secondary" className="w-full justify-start" asChild>
                        <Link href="/accounting/reconciliation">Bank Reconciliation</Link>
                    </Button>
                    <Button variant="secondary" className="w-full justify-start" asChild>
                        <Link href="/accounting/reports/profit-loss">View Detailed P&L</Link>
                    </Button>
                    <Button variant="secondary" className="w-full justify-start" asChild>
                        <Link href="/accounting/reports/balance-sheet">View Balance Sheet</Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}