// src/components/reports/SalesReport.tsx
// FINAL & REVOLUTIONARY VERSION with Print & Export

'use client';

import React, { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { DateRange } from 'react-day-picker';
import { addDays, format } from 'date-fns';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Title } from '@tremor/react';
import { useReactToPrint } from 'react-to-print';
import { CSVLink } from "react-csv";
import { Printer, Download } from 'lucide-react';

interface ReportData {
  summary: { total_sales: number; total_cost: number; gross_profit: number; transaction_count: number; };
  salesByCategory: { name: string; Amount: number; }[];
  topSellingProducts: { product_name: string; variant_name: string; quantity_sold: number; total_revenue: number; }[];
}

async function fetchReportData(dateRange: DateRange): Promise<ReportData> {
    if (!dateRange.from || !dateRange.to) throw new Error("A valid date range is required.");
    const supabase = createClient();
    const { data, error } = await supabase.rpc('get_sales_report_data', {
        p_start_date: dateRange.from.toISOString().split('T')[0],
        p_end_date: dateRange.to.toISOString().split('T')[0],
    });
    if (error) throw new Error(error.message);
    return data;
}

const PrintableSalesReport = React.forwardRef<HTMLDivElement, { data: ReportData; dateRange: DateRange }>(({ data, dateRange }, ref) => {
    const formatCurrency = (value: number) => `UGX ${new Intl.NumberFormat('en-US').format(value)}`;
    return (
        <div ref={ref} className="p-8 bg-white text-black printable-area">
            <h1 className="text-2xl font-bold mb-2">Sales Report</h1>
            <p>Period: {format(dateRange.from!, 'PPP')} to {format(dateRange.to!, 'PPP')}</p>
            {/* content goes here */}
        </div>
    );
});
PrintableSalesReport.displayName = "PrintableSalesReport";

export default function SalesReport() {
  const [date, setDate] = useState<DateRange | undefined>({ from: addDays(new Date(), -29), to: new Date() });
  const { data, isLoading, error, refetch, isFetching } = useQuery<ReportData>({ queryKey: ['salesReport', date], queryFn: () => fetchReportData(date!), enabled: false });
  const formatCurrency = (value: number) => `UGX ${new Intl.NumberFormat('en-US').format(value)}`;
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({ content: () => printRef.current });

  return (
    <div className="space-y-6">
        <Card>
            <CardHeader><CardTitle>Generate Sales Report</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap items-center gap-4">
                <DatePickerWithRange date={date} setDate={setDate} />
                <Button onClick={() => refetch()} disabled={isFetching}>{isFetching ? 'Generating...' : 'Generate Report'}</Button>
                {data && (
                    <div className="flex gap-2 ml-auto">
                        <Button variant="outline" onClick={handlePrint}><Printer className="mr-2 h-4 w-4"/> Print</Button>
                        <CSVLink data={data.topSellingProducts} filename={"sales-report.csv"}><Button variant="outline"><Download className="mr-2 h-4 w-4"/> Export CSV</Button></CSVLink>
                    </div>
                )}
            </CardContent>
        </Card>
        {error && <Card className="p-4 text-destructive bg-red-50">Error: {error.message}</Card>}
        {!data && !isFetching && <Card className="p-10 text-center text-muted-foreground">Select a date range and click "Generate Report".</Card>}
        {isLoading && <Card className="p-10 text-center">Generating report...</Card>}
        
        {data && <div ref={printRef} className="space-y-6 report-content">
            <div className="grid gap-4 md:grid-cols-4">
                <Card><CardHeader><CardTitle>Total Revenue</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{formatCurrency(data.summary.total_sales)}</CardContent></Card>
                <Card><CardHeader><CardTitle>Gross Profit</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{formatCurrency(data.summary.gross_profit)}</CardContent></Card>
                <Card><CardHeader><CardTitle>Total Cost</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{formatCurrency(data.summary.total_cost)}</CardContent></Card>
                <Card><CardHeader><CardTitle>Transactions</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{data.summary.transaction_count}</CardContent></Card>
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
                <Card><CardHeader><Title>Sales by Category</Title></CardHeader><CardContent><BarChart data={data.salesByCategory} index="name" categories={["Amount"]} colors={["blue"]} yAxisWidth={60} /></CardContent></Card>
                <Card><CardHeader><Title>Top Selling Products</Title></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Product</TableHead><TableHead>Qty Sold</TableHead><TableHead className="text-right">Revenue</TableHead></TableRow></TableHeader><TableBody>{data.topSellingProducts.map((p, i) => (<TableRow key={i}><TableCell>{p.product_name} ({p.variant_name})</TableCell><TableCell>{p.quantity_sold}</TableCell><TableCell className="text-right">{formatCurrency(p.total_revenue)}</TableCell></TableRow>))}</TableBody></Table></CardContent></Card>
            </div>
        </div>}
    </div>
  );
}