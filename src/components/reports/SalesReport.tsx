'use client';

import React, { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { DateRange } from 'react-day-picker';
import { addDays, format } from 'date-fns';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useReactToPrint } from 'react-to-print';
import { 
    Printer, 
    RefreshCw, 
    TrendingUp, 
    DollarSign, 
    ShoppingBag, 
    Scale, 
    ShieldCheck, 
    Box, 
    Fingerprint 
} from 'lucide-react';
import { toast } from 'sonner';

/**
 * REPORT DATA SCHEMA
 * Contains all metrics for business performance analysis.
 */
interface ProductPerformance {
    product_name: string;
    sku: string;
    units_sold: number;
    average_unit_rate: number;
    gross_revenue: number;
    aggregate_taxes: number;
    gross_margin: number;
}

interface ReportData {
  summary: { 
    total_sales: number; 
    total_cost: number; 
    gross_profit: number; 
    transaction_count: number; 
    currency_code: string;
  };
  salesByCategory: { name: string; Amount: number; }[];
  productPerformance: ProductPerformance[];
}

/**
 * DATA RETRIEVAL
 * Fetches sales data from the database for the selected period.
 */
async function fetchReportData(dateRange: DateRange): Promise<ReportData> {
    if (!dateRange.from || !dateRange.to) throw new Error("Please Select a Date Range");
    
    const supabase = createClient();
    const { data, error } = await supabase.rpc('get_sales_report_data_v2', {
        p_start_date: format(dateRange.from, 'yyyy-MM-dd'),
        p_end_date: format(dateRange.to, 'yyyy-MM-dd'),
    });

    if (error) {
        console.error("REPORT_ERROR:", error.message);
        throw new Error(error.message);
    }
    return data;
}

export default function SalesReportClient() {
  const [date, setDate] = useState<DateRange | undefined>({ 
    from: addDays(new Date(), -29), 
    to: addDays(new Date(), 1) 
  });
  const printRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, isError, refetch, isRefetching } = useQuery<ReportData>({ 
    queryKey: ['salesReport', date], 
    queryFn: () => fetchReportData(date!),
    enabled: !!date?.from && !!date?.to 
  });

  const handlePrint = useReactToPrint({ 
    content: () => printRef.current,
    documentTitle: `Sales_Performance_Report_${format(new Date(), 'yyyy-MM-dd')}`,
  });

  // Dynamic Currency Formatting
  const formatCurrency = (val: number) => {
    const currency = data?.summary?.currency_code || 'UGX';
    return new Intl.NumberFormat('en-US', { 
        style: 'currency', 
        currency: currency,
        maximumFractionDigits: 0 
    }).format(val);
  };

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto py-6 animate-in fade-in duration-500">
        
        {/* --- CONTROL PANEL --- */}
        <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6 border-b border-slate-100 pb-8">
            <div className="space-y-1">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-md">
                        <TrendingUp size={22} />
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900">Sales Performance Analytics</h2>
                </div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                    Business Insights Dashboard • Financial Reports
                </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
                <DatePickerWithRange date={date} setDate={setDate} />
                <Button 
                    variant="outline" 
                    size="icon" 
                    className="h-12 w-12 rounded-xl border-slate-200 bg-white" 
                    onClick={() => refetch()} 
                    disabled={isRefetching}
                >
                    <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
                </Button>
                <Button 
                    variant="default" 
                    className="bg-slate-900 hover:bg-black text-white font-bold h-12 px-8 rounded-xl text-xs uppercase tracking-wider shadow-lg"
                    onClick={handlePrint}
                >
                    <Printer className="mr-3 h-4 w-4"/> Export PDF / Print
                </Button>
            </div>
        </div>

        {isError && (
            <div className="p-4 bg-red-50 text-red-700 border border-red-100 rounded-xl flex items-center gap-3">
                <ShieldCheck className="h-5 w-5" />
                <span className="font-semibold text-sm">Error: Unable to retrieve business data. Please check your connection.</span>
            </div>
        )}

        {/* --- REPORT PREVIEW --- */}
        <div ref={printRef} className="space-y-10 bg-transparent p-1 print:p-12 print:bg-white">
            
            {/* Header for Printed Document */}
            <div className="hidden print:flex justify-between items-end border-b-2 border-slate-900 pb-6 mb-10">
                <div>
                    <h1 className="text-3xl font-bold uppercase tracking-tight">Sales Audit Report</h1>
                    <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mt-2">
                        Reporting Period: {format(date?.from || new Date(), 'PPP')} — {format(date?.to || new Date(), 'PPP')}
                    </p>
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600">Enterprise Reporting Center</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Generated: {format(new Date(), 'yyyy-MM-dd HH:mm')}</p>
                </div>
            </div>

            {/* --- PERFORMANCE SUMMARY --- */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card className="border-none shadow-xl shadow-slate-200/40 rounded-[1.5rem] bg-white overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                        <CardTitle className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Sales</CardTitle>
                        <DollarSign className="h-4 w-4 text-blue-600 opacity-40" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900 tabular-nums">
                            {isLoading ? "..." : formatCurrency(data?.summary.total_sales || 0)}
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-xl shadow-slate-200/40 rounded-[1.5rem] bg-white overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                        <CardTitle className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Net Profit</CardTitle>
                        <Scale className="h-4 w-4 text-emerald-600 opacity-40" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-600 tabular-nums">
                             {isLoading ? "..." : formatCurrency(data?.summary.gross_profit || 0)}
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-xl shadow-slate-200/40 rounded-[1.5rem] bg-white overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                        <CardTitle className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Number of Sales</CardTitle>
                        <ShoppingBag className="h-4 w-4 text-amber-600 opacity-40" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900 tabular-nums">
                             {isLoading ? "..." : (data?.summary.transaction_count || 0)}
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-xl shadow-slate-200/40 rounded-[1.5rem] bg-white overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                        <CardTitle className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Profit Margin</CardTitle>
                        <TrendingUp className="h-4 w-4 text-indigo-600 opacity-40" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-indigo-600 tabular-nums">
                             {isLoading ? "..." : `${(((data?.summary.gross_profit || 0) / (data?.summary.total_sales || 1)) * 100).toFixed(1)}%`}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* --- ANALYTICAL CHARTS --- */}
            <div className="grid gap-8 lg:grid-cols-3">
                <Card className="lg:col-span-2 border-none shadow-xl shadow-slate-200/40 rounded-[1.5rem] bg-white overflow-hidden">
                    <CardHeader className="px-8 pt-8 border-b border-slate-50 pb-6">
                        <CardTitle className="text-xs font-bold uppercase tracking-widest text-slate-400">Sales by Category</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[400px] p-8">
                        {isLoading ? <div className="h-full w-full flex items-center justify-center text-slate-300 font-bold uppercase text-[10px] tracking-widest">Loading Chart Data...</div> : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data?.salesByCategory || []}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" fontSize={10} fontWeight={700} tickLine={false} axisLine={false} tick={{fill: '#94a3b8'}} height={50} interval={0} />
                                    <YAxis fontSize={10} fontWeight={700} tickLine={false} axisLine={false} tick={{fill: '#94a3b8'}} tickFormatter={(value) => `${value / 1000}k`} />
                                    <Tooltip 
                                        contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.05)'}}
                                        formatter={(value: number) => [formatCurrency(value), "Total Sales"]}
                                        cursor={{ fill: '#f8fafc' }}
                                    />
                                    <Bar dataKey="Amount" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={32} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>

                {/* --- BUSINESS COMPLIANCE & SETTINGS --- */}
                <Card className="border-none shadow-xl shadow-slate-200/40 rounded-[1.5rem] bg-slate-900 text-white p-8 space-y-6">
                    <div className="h-12 w-12 bg-white/10 rounded-xl flex items-center justify-center">
                        <ShieldCheck className="text-emerald-400 h-6 w-6" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold uppercase tracking-tight italic">System Status</h3>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2">Data Sync: Active</p>
                    </div>
                    <div className="space-y-4 pt-4">
                        <div className="flex justify-between items-center border-b border-white/5 pb-4">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Region</span>
                            <Badge className="bg-emerald-500/10 text-emerald-400 border-none font-bold text-[9px]">UG / URA</Badge>
                        </div>
                        <div className="flex justify-between items-center border-b border-white/5 pb-4">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Accounting</span>
                            <span className="text-[11px] font-mono font-bold text-slate-300">IFRS-16</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Smart Sync</span>
                            <span className="text-[11px] font-mono font-bold text-blue-400 uppercase">Linked</span>
                        </div>
                    </div>
                    <div className="mt-auto pt-8 flex items-center gap-3">
                         <Fingerprint className="text-slate-800 h-8 w-8" />
                         <p className="text-[8px] text-slate-600 font-bold leading-tight uppercase tracking-widest">Verified Reporting Center Access</p>
                    </div>
                </Card>
            </div>

            {/* --- PRODUCT SALES LEADERBOARD --- */}
            <Card className="border-none shadow-xl shadow-slate-200/40 rounded-[1.5rem] bg-white overflow-hidden">
                <CardHeader className="px-8 pt-8 border-b border-slate-50 pb-6 flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-xs font-bold uppercase tracking-widest text-slate-400">Item Sales Analysis</CardTitle>
                        <CardDescription className="text-[10px] font-medium text-slate-400 mt-1 uppercase">Units Sold, Prices, Taxes & Profit</CardDescription>
                    </div>
                    <Box className="h-5 w-5 text-blue-600 opacity-20" />
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-slate-50">
                            <TableRow className="hover:bg-transparent border-none">
                                <TableHead className="px-8 h-12 font-bold text-[10px] uppercase tracking-wider text-slate-500">Product Name</TableHead>
                                <TableHead className="h-12 font-bold text-[10px] uppercase tracking-wider text-slate-500">Units Sold</TableHead>
                                <TableHead className="h-12 font-bold text-[10px] uppercase tracking-wider text-slate-500 text-right">Average Price</TableHead>
                                <TableHead className="h-12 font-bold text-[10px] uppercase tracking-wider text-slate-500 text-right">Taxes Collected</TableHead>
                                <TableHead className="px-8 h-12 font-bold text-[10px] uppercase tracking-wider text-slate-500 text-right">Profit</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={5} className="h-40 text-center animate-pulse font-bold text-slate-300 uppercase tracking-widest text-xs">Syncing Sales Data...</TableCell></TableRow>
                            ) : data?.productPerformance?.length === 0 ? (
                                <TableRow><TableCell colSpan={5} className="h-40 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px]">No sales recorded for this period</TableCell></TableRow>
                            ) : data?.productPerformance?.map((product, i) => (
                                <TableRow key={i} className="hover:bg-slate-50/50 border-slate-50">
                                    <TableCell className="px-8 py-5">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-slate-900 text-sm">{product.product_name}</span>
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">SKU: {product.sku}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="rounded-md border-slate-200 font-mono font-bold text-slate-600 px-3 py-0.5">
                                            {product.units_sold} UNITS
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right font-mono font-bold text-slate-500 text-sm">
                                        {formatCurrency(product.average_unit_rate)}
                                    </TableCell>
                                    <TableCell className="text-right font-mono font-bold text-red-400 text-sm">
                                        {formatCurrency(product.aggregate_taxes)}
                                    </TableCell>
                                    <TableCell className="px-8 text-right font-mono font-bold text-emerald-600 text-base tabular-nums">
                                        {formatCurrency(product.gross_margin)}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* --- REPORT FOOTER --- */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-[9px] text-slate-400 font-bold uppercase tracking-widest pt-12">
                <p>&copy; {new Date().getFullYear()} LITONU BUSINESS BASE UNIVERSE LTD • OFFICIAL BUSINESS REPORT</p>
                <div className="flex items-center gap-6">
                    <span className="flex items-center gap-1.5"><ShieldCheck size={12} className="text-emerald-500"/> SYSTEM SECURE</span>
                    <span>ACCOUNTING STANDARDS COMPLIANT</span>
                </div>
            </div>
        </div>
    </div>
  );
}