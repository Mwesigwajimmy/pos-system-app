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
import { DownloadIcon, AlertTriangleIcon, ArrowUpDown, Calendar as CalendarIcon, ShieldCheck, UserCheck, Fingerprint, Users } from 'lucide-react';

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

// DEEP IDENTITY IMPORTS
import { useTenant } from '@/hooks/useTenant';

/**
 * DATA SCHEMA
 * Maps staff identity to their financial performance results.
 */
type SalesReportData = {
  employee_email: string;
  employee_name: string;
  transaction_count: number;
  total_sales: number;
};

/**
 * DATA FETCH ENGINE
 * Retrieves sales performance per employee for the selected period.
 */
async function fetchReport(dateRange: DateRange): Promise<SalesReportData[]> {
  const supabase = createClient();
  const { from, to } = dateRange;
  if (!from || !to) return [];

  const { data, error } = await supabase.rpc('get_sales_by_employee_report', {
    start_date: from.toISOString(),
    end_date: to.toISOString(),
  });

  if (error) {
    console.error("REPORT_ERROR:", error.message);
    throw new Error('Failed to fetch sales report: ' + error.message);
  }
  return data;
}

// Currency Formatting Utility
const formatCurrency = (value: number, currencyCode: string = 'UGX') => {
    return new Intl.NumberFormat('en-US', { 
        style: 'currency', 
        currency: currencyCode,
        maximumFractionDigits: 0
    }).format(value);
};

const exportToCSV = (data: SalesReportData[], dateRange: DateRange) => {
  const headers = 'Staff Name,Email,Transactions,Total Sales\n';
  const rows = data.map(row => `${row.employee_name},${row.employee_email},${row.transaction_count},${row.total_sales}`).join('\n');
  const csvContent = `data:text/csv;charset=utf-8,${headers}${rows}`;
  const link = document.createElement('a');
  link.setAttribute('href', encodeURI(csvContent));
  const fromDate = dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : 'start';
  const toDate = dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : 'end';
  link.setAttribute('download', `Staff_Sales_Performance_${fromDate}_to_${toDate}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const CustomTooltip = ({ active, payload, label, currency }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border-none shadow-2xl p-4 rounded-2xl animate-in zoom-in-95 duration-200">
        <p className="font-bold text-[10px] uppercase tracking-widest text-slate-400 mb-1">Staff Member</p>
        <p className="font-bold text-slate-900 mb-3">{label}</p>
        <div className="h-[1px] w-full bg-slate-100 mb-3" />
        <p className="text-sm font-bold text-blue-600">{`Total Sales: ${formatCurrency(payload[0].value, currency)}`}</p>
      </div>
    );
  }
  return null;
};

const SalesBarChart = ({ data, currency }: { data: SalesReportData[], currency: string }) => (
  <ResponsiveContainer width="100%" height={400}>
    <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
      <XAxis dataKey="employee_name" tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} axisLine={false} tickLine={false} />
      <YAxis tickFormatter={(value) => `${Number(value) / 1000}k`} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} axisLine={false} tickLine={false} />
      <Tooltip content={<CustomTooltip currency={currency} />} cursor={{ fill: '#f8fafc' }} />
      <Bar dataKey="total_sales" fill="#2563eb" name="Completed Sales" radius={[4, 4, 0, 0]} barSize={40} />
    </BarChart>
  </ResponsiveContainer>
);

export default function SalesByEmployeeReport() {
  const { data: tenant } = useTenant();
  const activeCurrency = tenant?.reporting_currency || 'UGX';
  
  const [date, setDate] = useState<DateRange | undefined>({ from: addDays(new Date(), -29), to: new Date() });
  const [sorting, setSorting] = useState<SortingState>([]);

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

  const columns: ColumnDef<SalesReportData>[] = useMemo(() => [
    {
        accessorKey: 'employee_name',
        header: 'Staff Member',
        cell: ({ row }) => (
            <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-slate-900 flex items-center justify-center text-white text-xs font-bold uppercase shadow-sm">
                    {row.original.employee_name.charAt(0)}
                </div>
                <div className="flex flex-col">
                    <span className="font-bold text-slate-900 text-sm">{row.original.employee_name}</span>
                    <span className="text-[10px] font-medium text-slate-400">{row.original.employee_email}</span>
                </div>
            </div>
        )
    },
    {
        accessorKey: 'transaction_count',
        header: ({ column }) => (
            <Button variant="ghost" className="text-[10px] font-bold uppercase tracking-widest text-slate-500" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                Sales Count <ArrowUpDown className="ml-2 h-3 w-3" />
            </Button>
        ),
        cell: ({ row }) => <div className="font-mono font-bold text-slate-600 text-center">{row.original.transaction_count} Items</div>
    },
    {
        accessorKey: 'total_sales',
        header: ({ column }) => (
            <div className="text-right">
                <Button variant="ghost" className="text-[10px] font-bold uppercase tracking-widest text-slate-500" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                    Total Revenue <ArrowUpDown className="ml-2 h-3 w-3" />
                </Button>
            </div>
        ),
        cell: ({ row }) => (
            <div className="text-right font-bold font-mono text-blue-600">
                {formatCurrency(row.original.total_sales, activeCurrency)}
            </div>
        )
    }
  ], [activeCurrency]);

  const table = useReactTable({
      data: data || [],
      columns,
      state: { sorting },
      onSortingChange: setSorting,
      getCoreRowModel: getCoreRowModel(),
      getSortedRowModel: getSortedRowModel(),
  });

  const setDatePreset = (preset: '7d' | '30d' | 'month') => {
      const to = new Date();
      if (preset === '7d') setDate({ from: addDays(to, -6), to });
      if (preset === '30d') setDate({ from: addDays(to, -29), to });
      if (preset === 'month') setDate({ from: startOfMonth(to), to });
  };
  
  const isGenerating = isLoading || isRefetching;

  return (
    <Card className="w-full border-none shadow-xl shadow-slate-200/40 rounded-[2rem] overflow-hidden bg-white">
      <CardHeader className="p-10 bg-slate-50/50 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-1.5 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-3">
                <div className="h-12 w-12 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center text-blue-600">
                    <Users size={24} />
                </div>
                <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">Staff Sales Performance</CardTitle>
            </div>
            <CardDescription className="text-sm font-medium text-slate-400 ml-1">
                Analyze sales results and contribution by individual staff members.
            </CardDescription>
        </div>
        <div className="flex flex-col items-end gap-1 opacity-80">
             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Report Ref: STAFF-SALES-01</span>
             <Badge variant="outline" className="bg-white font-bold text-[9px] uppercase tracking-widest text-blue-600 border-blue-100">Currency: {activeCurrency}</Badge>
        </div>
      </CardHeader>
      
      <CardContent className="p-10 space-y-8">
        <div className="flex flex-wrap items-center gap-4 bg-white p-5 rounded-3xl border border-slate-50 shadow-inner">
          <DatePickerWithRange date={date} setDate={setDate} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-12 px-6 rounded-2xl border-slate-200 font-bold uppercase tracking-widest text-[10px] bg-white"><CalendarIcon className="mr-2 h-4 w-4 text-slate-400" /> Quick Dates</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-2xl border-slate-100 shadow-xl">
                <DropdownMenuItem onClick={() => setDatePreset('7d')} className="font-bold text-xs uppercase py-3 cursor-pointer">Last 7 Days</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setDatePreset('30d')} className="font-bold text-xs uppercase py-3 cursor-pointer">Last 30 Days</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setDatePreset('month')} className="font-bold text-xs uppercase py-3 cursor-pointer">This Month</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Button 
            onClick={() => refetch()} 
            disabled={isGenerating}
            className="h-12 px-8 bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase tracking-widest rounded-2xl shadow-lg transition-all active:scale-95 text-[10px]"
          >
            {isGenerating ? "Processing..." : "Generate Report"}
          </Button>

          {data && data.length > 0 && (
            <Button variant="outline" onClick={() => exportToCSV(data, date!)} className="h-12 px-6 rounded-2xl border-slate-200 font-bold text-slate-500 uppercase text-[10px] tracking-widest hover:bg-slate-900 hover:text-white transition-all"><DownloadIcon className="mr-2 h-4 w-4" /> Download Data</Button>
          )}
        </div>

        <div className="relative">
            {isGenerating && (
                <div className="space-y-8 animate-pulse">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <Skeleton className="h-[400px] w-full rounded-[2rem]" />
                        <Skeleton className="h-[400px] w-full rounded-[2rem]" />
                    </div>
                </div>
            )}
            
            {isError && !isGenerating && (
                <div className="flex flex-col items-center justify-center p-20 border-2 border-dashed border-red-100 rounded-[3rem] bg-red-50/30 text-center">
                    <AlertTriangleIcon className="h-14 w-14 text-red-500 mb-6" />
                    <p className="font-bold text-xl text-red-900 uppercase">Connection Error</p>
                    <p className="text-red-600/70 mb-8 font-medium max-w-sm mt-2 text-sm uppercase tracking-wide">The system was unable to retrieve staff performance data at this time.</p>
                    <Button onClick={() => refetch()} className="bg-red-600 text-white px-10 h-12 rounded-2xl font-bold uppercase tracking-widest">Retry Report</Button>
                </div>
            )}

            {isFetched && !isError && !isGenerating && (!data || data.length === 0) && (
                <div className="text-center p-24 border-2 border-dashed border-slate-100 rounded-[3rem] bg-slate-50/30">
                    <div className="h-16 w-16 bg-white rounded-3xl mx-auto mb-6 flex items-center justify-center text-slate-200 shadow-sm border border-slate-50">
                        <Fingerprint size={32} />
                    </div>
                    <p className="font-bold text-slate-400 uppercase tracking-widest text-xs">No sales records found for this period.</p>
                </div>
            )}

            {isFetched && !isError && !isGenerating && data && data.length > 0 && (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-12 pt-4 animate-in fade-in slide-in-from-bottom-2 duration-700">
                    <div className="space-y-6">
                        <div className="flex items-center gap-3 px-4">
                            <div className="h-2 w-2 rounded-full bg-blue-600" />
                            <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Staff Performance Table</h3>
                        </div>
                        <div className="rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-100/30 overflow-hidden bg-white">
                            <Table>
                                <TableHeader className="bg-slate-50/50">
                                    {table.getHeaderGroups().map(hg => (
                                        <TableRow key={hg.id} className="border-none hover:bg-transparent">
                                            {hg.headers.map(h => <TableHead key={h.id} className="h-14 px-6">{flexRender(h.column.columnDef.header, h.getContext())}</TableHead>)}
                                        </TableRow>
                                    ))}
                                </TableHeader>
                                <TableBody>
                                    {table.getRowModel().rows.map(row => (
                                        <TableRow key={row.id} className="border-b border-slate-50 hover:bg-slate-50/30 transition-colors">
                                            {row.getVisibleCells().map(cell => <TableCell key={cell.id} className="px-6 py-5">{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>)}
                                        </TableRow>
                                    ))}
                                </TableBody>
                                <TableFooter className="bg-slate-900 border-none">
                                    <TableRow className="hover:bg-transparent">
                                        <TableCell className="font-bold text-white px-8 h-16 text-[10px] uppercase tracking-widest">Total Performance</TableCell>
                                        <TableCell className="font-bold text-white text-center h-16 font-mono">{totals.transactions.toLocaleString()} Sales</TableCell>
                                        <TableCell className="text-right font-bold text-blue-400 px-8 h-16 text-lg font-mono tracking-tight">
                                            {formatCurrency(totals.sales, activeCurrency)}
                                        </TableCell>
                                    </TableRow>
                                </TableFooter>
                            </Table>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="flex items-center gap-3 px-4">
                            <div className="h-2 w-2 rounded-full bg-indigo-600" />
                            <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Sales Results Chart</h3>
                        </div>
                        <div className="rounded-[2rem] bg-white border border-slate-100 shadow-xl shadow-slate-100/30 p-8">
                            <SalesBarChart data={data} currency={activeCurrency} />
                        </div>
                    </div>
                </div>
            )}
        </div>
      </CardContent>

      <div className="p-8 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3 text-slate-300">
            <ShieldCheck size={16} className="text-emerald-500" />
            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Data Integrity Verified</span>
        </div>
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">&copy; {new Date().getFullYear()} LITONU BUSINESS BASE UNIVERSE LTD</p>
      </div>
    </Card>
  );
}