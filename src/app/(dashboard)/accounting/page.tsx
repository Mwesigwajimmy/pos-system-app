'use client';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

async function fetchAccountingKpis() {
    const supabase = createClient();
    // We can reuse our powerful Balance Sheet function to get these KPIs
    const { data, error } = await supabase.rpc('get_balance_sheet');
    if (error) throw new Error(error.message);
    return data;
}

const formatCurrency = (value: number) => `UGX ${new Intl.NumberFormat('en-US').format(value)}`;

export default function AccountingDashboardPage() {
    const { data, isLoading } = useQuery({ queryKey: ['accountingKpis'], queryFn: fetchAccountingKpis });

    const kpis = [
        { title: "Total Assets", value: data?.totalAssets, link: "/accounting/reports" },
        { title: "Total Liabilities", value: data?.totalLiabilities, link: "/accounting/reports" },
        { title: "Total Equity", value: data?.totalEquity, link: "/accounting/reports" },
    ];

    return (
        <div className="container mx-auto py-6 space-y-6">
            <h1 className="text-3xl font-bold">Accounting Center</h1>
            
            <div className="grid gap-6 md:grid-cols-3">
                {isLoading ? "Loading KPIs..." : kpis.map(kpi => (
                    <Card key={kpi.title}>
                        <CardHeader><CardTitle>{kpi.title}</CardTitle></CardHeader>
                        <CardContent className="text-3xl font-bold">{formatCurrency(kpi.value || 0)}</CardContent>
                    </Card>
                ))}
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Key Accounting Tasks</CardTitle>
                </CardHeader>
                <CardContent className="flex gap-4">
                    <Button asChild><Link href="/accounting/chart-of-accounts">View Chart of Accounts</Link></Button>
                    <Button asChild><Link href="/accounting/reports">Generate Financial Reports</Link></Button>
                </CardContent>
            </Card>
        </div>
    );
}