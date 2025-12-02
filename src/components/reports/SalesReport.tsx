// components/reports/SalesReport.tsx
'use client';

import React, { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { DateRange } from 'react-day-picker';
import { addDays, format } from 'date-fns';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useReactToPrint } from 'react-to-print';
import { Printer, Download, RefreshCw, TrendingUp, DollarSign, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';

interface ReportData {
  summary: { 
    total_sales: number; 
    total_cost: number; 
    gross_profit: number; 
    transaction_count: number; 
  };
  salesByCategory: { name: string; Amount: number; }[];
}

// --- Fetcher ---
async function fetchReportData(dateRange: DateRange): Promise<ReportData> {
    if (!dateRange.from || !dateRange.to) throw new Error("Dates required");
    
    const supabase = createClient();
    const { data, error } = await supabase.rpc('get_sales_report_data', {
        p_start_date: format(dateRange.from, 'yyyy-MM-dd'),
        p_end_date: format(dateRange.to, 'yyyy-MM-dd'),
    });

    if (error) throw new Error(error.message);
    return data;
}

export default function SalesReportClient() {
  const [date, setDate] = useState<DateRange | undefined>({ from: addDays(new Date(), -29), to: new Date() });
  const printRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, isError, refetch, isRefetching } = useQuery<ReportData>({ 
    queryKey: ['salesReport', date], 
    queryFn: () => fetchReportData(date!),
    enabled: !!date?.from && !!date?.to 
  });

  const handlePrint = useReactToPrint({ 
    content: () => printRef.current,
    documentTitle: `Sales_Report_${format(new Date(), 'yyyy-MM-dd')}`,
  });

  const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'UGX' }).format(val);

  return (
    <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
            <h2 className="text-3xl font-bold tracking-tight">Sales Analytics</h2>
            <div className="flex items-center gap-2">
                <DatePickerWithRange date={date} setDate={setDate} />
                <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isRefetching}>
                    <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
                </Button>
                <Button variant="outline" onClick={handlePrint}>
                    <Printer className="mr-2 h-4 w-4"/> Print
                </Button>
            </div>
        </div>

        {isError && (
            <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-md">
                Failed to load report data. Please try again.
            </div>
        )}

        {/* Printable Area */}
        <div ref={printRef} className="space-y-6 bg-transparent p-1 print:p-8 print:bg-white">
            
            <div className="hidden print:block mb-6">
                <h1 className="text-2xl font-bold">Sales Performance Report</h1>
                <p className="text-gray-500">Period: {format(date!.from!, 'PPP')} - {format(date!.to!, 'PPP')}</p>
            </div>

            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {isLoading ? "..." : formatCurrency(data?.summary.total_sales || 0)}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Gross Profit</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                             {isLoading ? "..." : formatCurrency(data?.summary.gross_profit || 0)}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Transactions</CardTitle>
                        <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                             {isLoading ? "..." : (data?.summary.transaction_count || 0)}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Section */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card className="col-span-1 md:col-span-2">
                    <CardHeader>
                        <CardTitle>Sales by Category</CardTitle>
                        <CardDescription>Revenue breakdown across product categories</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[350px]">
                        {isLoading ? <div className="h-full w-full flex items-center justify-center">Loading Chart...</div> : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data?.salesByCategory || []}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis 
                                        fontSize={12} 
                                        tickLine={false} 
                                        axisLine={false}
                                        tickFormatter={(value) => `${value / 1000}k`} 
                                    />
                                    <Tooltip 
                                        formatter={(value: number) => formatCurrency(value)}
                                        cursor={{ fill: 'transparent' }}
                                    />
                                    <Bar dataKey="Amount" fill="#0f172a" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    </div>
  );
}