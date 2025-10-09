// src/components/shifts/ShiftReport.tsx
// FINAL & REVOLUTIONARY VERSION with Print & Export

'use client';

import React, { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useReactToPrint } from 'react-to-print';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CalendarIcon, Printer, Download } from 'lucide-react';
import { CSVLink } from 'react-csv';

interface PaymentSummaryItem { payment_method: string; total_collected: number; }
interface EmployeeSummaryItem { email: string; full_name: string; transaction_count: number; total_sales: number; }
interface ShiftReportData { paymentSummary: PaymentSummaryItem[]; employeeSummary: EmployeeSummaryItem[]; overallSummary: { total_sales: number; }; }

const PrintableReport = React.forwardRef<HTMLDivElement, { data: ShiftReportData; reportDate: Date }>(({ data, reportDate }, ref) => {
    const formatCurrency = (value: number) => `UGX ${new Intl.NumberFormat('en-US').format(value)}`;
    const expectedCash = data.paymentSummary.find(p => p.payment_method === 'Cash')?.total_collected || 0;
    return (
        <div ref={ref} className="p-8 bg-white text-black printable-area">
            <div className="mb-8 text-center"><h2 className="text-2xl font-bold">End of Day Report</h2><p>For: {format(reportDate, "EEEE, MMMM dd, yyyy")}</p></div>
            <div className="space-y-6">
                <Card><CardHeader><CardTitle>Overall Summary</CardTitle></CardHeader><CardContent className="text-3xl font-bold">{formatCurrency(data.overallSummary.total_sales)}</CardContent></Card>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card><CardHeader><CardTitle>Cash Reconciliation</CardTitle><CardDescription>Expected cash from sales.</CardDescription></CardHeader><CardContent><p className="text-2xl font-bold">{formatCurrency(expectedCash)}</p><div className="mt-4 space-y-2 text-sm"><p>Physical Count: ______________</p><p>Difference: ______________</p></div></CardContent></Card>
                    <Card className="md:col-span-2"><CardHeader><CardTitle>Sales by Payment Method</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Method</TableHead><TableHead className="text-right">Total Collected</TableHead></TableRow></TableHeader><TableBody>{data.paymentSummary.map(p => <TableRow key={p.payment_method}><TableCell>{p.payment_method}</TableCell><TableCell className="text-right">{formatCurrency(p.total_collected)}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
                </div>
                <Card className="md:col-span-3"><CardHeader><CardTitle>Sales by Employee</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Employee</TableHead><TableHead>Transactions</TableHead><TableHead className="text-right">Total Sales</TableHead></TableRow></TableHeader><TableBody>{data.employeeSummary.map(e => <TableRow key={e.email}><TableCell>{e.full_name} ({e.email})</TableCell><TableCell>{e.transaction_count}</TableCell><TableCell className="text-right">{formatCurrency(e.total_sales)}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
            </div>
        </div>
    );
});
PrintableReport.displayName = "PrintableReport";

export default function ShiftReport() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({ content: () => printRef.current });
  const { data, isLoading, error, refetch, isFetching } = useQuery<ShiftReportData>({ queryKey: ['shiftReport', date], queryFn: () => fetchShiftReport(date!), enabled: false });
  async function fetchShiftReport(reportDate: Date): Promise<ShiftReportData> { const supabase = createClient(); const { data, error } = await supabase.rpc('get_end_of_day_report', { p_report_date: format(reportDate, 'yyyy-MM-dd') }); if (error) throw new Error(error.message); return data; }
  
  return (
    <>
      <div className="space-y-6">
        <Card>
          <CardContent className="flex flex-wrap items-center gap-4 pt-6">
            <Popover><PopoverTrigger asChild><Button variant={"outline"} className="w-[280px] justify-start text-left font-normal"><CalendarIcon className="mr-2 h-4 w-4" />{date ? format(date, "PPP") : <span>Pick a date</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={date} onSelect={setDate} initialFocus /></PopoverContent></Popover>
            <Button onClick={() => refetch()} disabled={isFetching || !date}>{isFetching ? 'Generating...' : 'Generate Report'}</Button>
            {data && data.employeeSummary && (
                <div className="flex gap-2 ml-auto">
                    <Button onClick={handlePrint} variant="outline"><Printer className="mr-2 h-4 w-4"/>Print</Button>
                    <CSVLink data={data.employeeSummary} headers={[{label: "Employee", key: "full_name"}, {label: "Email", key: "email"}, {label: "Transactions", key: "transaction_count"}, {label: "Total Sales", key: "total_sales"}]} filename={`shift-report-${format(date!, 'yyyy-MM-dd')}.csv`}>
                        <Button variant="outline"><Download className="mr-2 h-4 w-4"/> Export CSV</Button>
                    </CSVLink>
                </div>
            )}
          </CardContent>
        </Card>
        {error && <Card className="p-4 text-destructive bg-red-50">Error: {error.message}</Card>}
        {!data && !isFetching && <Card className="p-10 text-center text-muted-foreground">Select a date and click "Generate Report".</Card>}
        {isLoading && <Card className="p-10 text-center">Generating report...</Card>}
        {data && (
            <div className="p-6 bg-secondary/50 rounded-lg">
                {data.employeeSummary && data.employeeSummary.length > 0 ? <PrintableReport ref={printRef} data={data} reportDate={date!} /> : <p className="text-center text-muted-foreground py-8">No sales data found for this date.</p>}
            </div>
        )}
      </div>
    </>
  );
}