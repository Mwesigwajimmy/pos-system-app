'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { DateRange } from 'react-day-picker';
import { subDays } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DollarSign, TrendingUp, ShoppingCart, BarChart, Loader2 } from 'lucide-react';
import { DatePickerWithRange } from '@/components/ui/DatePickerWithRange';

const StatCard = ({ title, value, icon: Icon }: { title: string, value: number, icon: React.ElementType }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">UGX {value?.toLocaleString() || 0}</div>
        </CardContent>
    </Card>
);

export default function TelecomReportsPage() {
    const supabase = createClient();
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: subDays(new Date(), 7),
        to: new Date(),
    });

    const { data: report, isLoading, error } = useQuery({
        queryKey: ['telecomPerformanceReport', dateRange],
        queryFn: async () => {
            if (!dateRange?.from || !dateRange?.to) {
                return null;
            }
            const { data, error } = await supabase
                .rpc('get_telecom_performance_report', { 
                    p_start_date: dateRange.from.toISOString().split('T')[0], 
                    p_end_date: dateRange.to.toISOString().split('T')[0]
                });
            if (error) throw new Error(error.message);
            return data;
        },
        enabled: !!dateRange?.from && !!dateRange?.to,
    });

    return (
        <div className="p-4 md:p-6 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Telecom Performance Report</h1>
                    <p className="text-muted-foreground">Analyze financial performance for the selected period.</p>
                </div>
                <DatePickerWithRange date={dateRange} setDate={setDateRange} />
            </div>

            {isLoading && <div className="flex justify-center items-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>}
            {error && <div className="text-destructive p-4 bg-destructive/10 rounded-md">Error loading report: {error.message}</div>}

            {report && (
                <div className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <StatCard title="Total Sales Value" value={report.summary?.total_sales_value} icon={TrendingUp} />
                        <StatCard title="Total Commission" value={report.summary?.total_commission_earned} icon={DollarSign} />
                        <StatCard title="Stock Purchased" value={report.summary?.total_stock_purchased} icon={ShoppingCart} />
                        <StatCard title="Net Profit" value={report.summary?.net_profit} icon={BarChart} />
                    </div>

                    <div className="grid gap-6 lg:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>Sales by Provider</CardTitle>
                                <CardDescription>Performance breakdown for each telecom network.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader><TableRow><TableHead>Provider</TableHead><TableHead>Service</TableHead><TableHead className="text-right">Total Sales</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {report.sales_by_provider?.map((p: any) => (
                                            <TableRow key={`${p.provider_name}-${p.service_type}`}>
                                                <TableCell className="font-medium">{p.provider_name}</TableCell>
                                                <TableCell>{p.service_type}</TableCell>
                                                <TableCell className="text-right font-bold">UGX {p.total_sales.toLocaleString()}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                         <Card>
                            <CardHeader>
                                <CardTitle>Full Transaction Log</CardTitle>
                                <CardDescription>A complete record of every transaction in the period.</CardDescription>
                            </CardHeader>
                            <CardContent className="max-h-[400px] overflow-y-auto">
                                <Table>
                                    <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Type</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {report.detailed_transactions?.map((tx: any) => (
                                            <TableRow key={tx.id}>
                                                <TableCell>{new Date(tx.created_at).toLocaleString()}</TableCell>
                                                <TableCell><span className={`px-2 py-1 text-xs rounded-full ${tx.transaction_type === 'Sale' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>{tx.transaction_type}</span></TableCell>
                                                <TableCell className="text-right font-medium">UGX {tx.amount.toLocaleString()}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}
        </div>
    );
}