'use client';

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { DateRange } from 'react-day-picker';
import { addDays, format, startOfMonth } from 'date-fns';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { DownloadIcon, AlertTriangleIcon, ArrowUpDown, Calendar as CalendarIcon } from 'lucide-react';

import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type SalesReportData = {
  employee_email: string;
  employee_name: string;
  transaction_count: number;
  total_sales: number;
};

async function fetchReport(dateRange: DateRange): Promise<SalesReportData[]> {
  const supabase = createClient();
  const { from, to } = dateRange;
  if (!from || !to) return [];

  const { data, error } = await supabase.rpc('get_sales_by_employee_report', {
    start_date: from.toISOString(),
    end_date: to.toISOString(),
  });

  if (error) {
    throw new Error('Failed to fetch sales report: ' + error.message);
  }
  return data;
}

const formatCurrency = (value: number) => `UGX ${new Intl.NumberFormat('en-US').format(value)}`;

const exportToCSV = (data: SalesReportData[], dateRange: DateRange) => {
  const headers = 'Employee Name,Employee Email,Transactions,Total Sales\n';
  const rows = data.map(row => `${row.employee_name},${row.employee_email},${row.transaction_count},${row.total_sales}`).join('\n');
  const csvContent = `data:text/csv;charset=utf-8,${headers}${rows}`;
  const link = document.createElement('a');
  link.setAttribute('href', encodeURI(csvContent));
  const fromDate = dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : 'start';
  const toDate = dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : 'end';
  link.setAttribute('download', `sales_report_${fromDate}_to_${toDate}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background border p-2 rounded-md shadow-lg">
        <p className="font-bold">{label}</p>
        <p className="text-sm">{`Total Sales: ${formatCurrency(payload[0].value)}`}</p>
      </div>
    );
  }
  return null;
};

const SalesBarChart = ({ data }: { data: SalesReportData[] }) => (
  <ResponsiveContainer width="100%" height={400}>
    <BarChart data={data} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
      <CartesianGrid strokeDasharray="3 3" vertical={false} />
      <XAxis dataKey="employee_name" tick={{ fontSize: 12 }} />
      <YAxis tickFormatter={(value) => `UGX ${Number(value) / 1000}k`} tick={{ fontSize: 12 }} />
      <Tooltip content={<CustomTooltip />} />
      <Legend />
      <Bar dataKey="total_sales" fill="hsl(var(--primary))" name="Total Sales" radius={[4, 4, 0, 0]} />
    </BarChart>
  </ResponsiveContainer>
);

const columns: ColumnDef<SalesReportData>[] = [
    {
        accessorKey: 'employee_name',
        header: 'Employee'
    },
    {
        accessorKey: 'transaction_count',
        header: ({ column }) => (
            <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                Transactions <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
    },
    {
        accessorKey: 'total_sales',
        header: ({ column }) => (
            <div className="text-right">
                <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                    Total Sales <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            </div>
        ),
        cell: ({ row }) => <div className="text-right font-medium">{formatCurrency(row.original.total_sales)}</div>
    }
];

const SalesReportTable = ({ data, totals }: { data: SalesReportData[], totals: { transactions: number, sales: number } }) => {
    const [sorting, setSorting] = useState<SortingState>([]);
    const table = useReactTable({
        data,
        columns,
        state: { sorting },
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
    });

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    {table.getHeaderGroups().map(hg => <TableRow key={hg.id}>{hg.headers.map(h => <TableHead key={h.id}>{flexRender(h.column.columnDef.header, h.getContext())}</TableHead>)}</TableRow>)}
                </TableHeader>
                <TableBody>
                    {table.getRowModel().rows.map(row => <TableRow key={row.id}>{row.getVisibleCells().map(cell => <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>)}</TableRow>)}
                </TableBody>
                <TableFooter>
                    <TableRow>
                        <TableCell className="font-bold">Total</TableCell>
                        <TableCell className="font-bold">{totals.transactions.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-bold">{formatCurrency(totals.sales)}</TableCell>
                    </TableRow>
                </TableFooter>
            </Table>
        </div>
    );
};

const ReportSkeleton = () => (
    <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
                <Skeleton className="h-8 w-1/3" />
                <Skeleton className="h-40 w-full" />
                <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-4">
                <Skeleton className="h-8 w-1/3" />
                <Skeleton className="h-56 w-full" />
            </div>
        </div>
    </div>
);

const ErrorDisplay = ({ onRetry }: { onRetry: () => void }) => (
    <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-md">
        <AlertTriangleIcon className="h-10 w-10 text-destructive mb-4" />
        <p className="font-semibold text-lg">Failed to Generate Report</p>
        <p className="text-muted-foreground mb-4">An error occurred while fetching the data.</p>
        <Button onClick={onRetry}>Try Again</Button>
    </div>
);

const EmptyState = () => (
    <div className="text-center p-8 border-2 border-dashed rounded-md">
        <p>No sales data available for the selected period.</p>
    </div>
);

export default function SalesByEmployeeReport() {
  const [date, setDate] = useState<DateRange | undefined>({ from: addDays(new Date(), -29), to: new Date() });

  const { data, refetch, isLoading, isError, isFetched, isRefetching } = useQuery({
    queryKey: ['salesByEmployee', date],
    queryFn: () => fetchReport(date!),
    enabled: false,
  });

  const totals = useMemo(() => 
    data?.reduce((acc, row) => {
        acc.transactions += row.transaction_count;
        acc.sales += row.total_sales;
        return acc;
    }, { transactions: 0, sales: 0 }) 
    || { transactions: 0, sales: 0 }, 
  [data]);

  const setDatePreset = (preset: '7d' | '30d' | 'month') => {
      const to = new Date();
      if (preset === '7d') setDate({ from: addDays(to, -6), to });
      if (preset === '30d') setDate({ from: addDays(to, -29), to });
      if (preset === 'month') setDate({ from: startOfMonth(to), to });
  };
  
  const isGenerating = isLoading || isRefetching;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Sales by Employee Report</CardTitle>
        <CardDescription>Analyze and visualize sales performance for each staff member.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          <DatePickerWithRange date={date} setDate={setDate} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" className="ml-auto"><CalendarIcon className="mr-2 h-4 w-4" /> Presets</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setDatePreset('7d')}>Last 7 Days</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setDatePreset('30d')}>Last 30 Days</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setDatePreset('month')}>This Month</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={() => refetch()} disabled={isGenerating}>{isGenerating ? "Generating..." : "Generate Report"}</Button>
          {data && data.length > 0 && (
            <Button variant="outline" onClick={() => exportToCSV(data, date!)}><DownloadIcon className="mr-2 h-4 w-4" /> Export CSV</Button>
          )}
        </div>

        <div>
            {isGenerating && <ReportSkeleton />}
            {isError && !isGenerating && <ErrorDisplay onRetry={() => refetch()} />}
            {isFetched && !isError && !isGenerating && (!data || data.length === 0) && <EmptyState />}
            {isFetched && !isError && !isGenerating && data && data.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4">
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Sales Data Breakdown</h3>
                        <SalesReportTable data={data} totals={totals} />
                    </div>
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Visual Representation</h3>
                        <SalesBarChart data={data} />
                    </div>
                </div>
            )}
        </div>
      </CardContent>
    </Card>
  );
}