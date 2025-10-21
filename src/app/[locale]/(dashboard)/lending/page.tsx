'use client';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

async function fetchLendingKpis() {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('get_lending_dashboard_kpis');
    if (error) throw new Error(error.message);
    return data;
}

const formatCurrency = (value: number) => `UGX ${new Intl.NumberFormat('en-US').format(value)}`;

export default function LendingDashboardPage() {
    const { data: kpis, isLoading } = useQuery({ queryKey: ['lendingKpis'], queryFn: fetchLendingKpis });

    return (
        <div className="container mx-auto py-6 space-y-6">
            <h1 className="text-3xl font-bold">Lending & Microfinance Center</h1>
            
            <div className="grid gap-6 md:grid-cols-3">
                <Card><CardHeader><CardTitle>Active Loans</CardTitle></CardHeader><CardContent className="text-3xl font-bold">{isLoading ? '...' : kpis.active_loans_count}</CardContent></Card>
                <Card><CardHeader><CardTitle>Total Disbursed</CardTitle></CardHeader><CardContent className="text-3xl font-bold">{isLoading ? '...' : formatCurrency(kpis.total_disbursed)}</CardContent></Card>
                <Card><CardHeader><CardTitle>Total Repaid</CardTitle></CardHeader><CardContent className="text-3xl font-bold">{isLoading ? '...' : formatCurrency(kpis.total_repaid)}</CardContent></Card>
            </div>

            <Card>
                <CardHeader><CardTitle>Key Lending Tasks</CardTitle></CardHeader>
                <CardContent className="flex gap-4">
                    <Button asChild><Link href="/lending/applications">Manage Applications</Link></Button>
                    <Button asChild variant="secondary"><Link href="/lending/products">Manage Loan Products</Link></Button>
                </CardContent>
            </Card>
        </div>
    );
}