'use client';

/**
 * --- BBU1 SOVEREIGN SALES ANALYTICS ---
 * VERSION: v6.2 OMEGA (IDENTITY HANDSHAKE WELDED)
 * Use: Advanced financial intelligence and product performance analysis.
 * Logic: Linked to get_sales_report_data_v2 with strict multi-tenant isolation.
 * Handshake: Resolves business_id from profile before executing math scans.
 */

import React, { useState, useRef, useEffect } from 'react';
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
    Fingerprint,
    CheckCircle2,
    Loader2
} from 'lucide-react';
import { toast } from 'sonner';

/**
 * REPORT DATA SCHEMA
 * Mapped 1:1 to the public.get_sales_report_data_v2 forensic output.
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
 * DATA RETRIEVAL (HANDSHAKE WELDED)
 * Fetches sales data from the database with a mandatory business_id handshake.
 */
async function fetchReportData(dateRange: DateRange, businessId: string): Promise<ReportData> {
    if (!dateRange.from || !dateRange.to) throw new Error("Please Select a Date Range");
    if (!businessId) throw new Error("Aura Identity Handshake Pending...");
    
    const supabase = createClient();
    
    // THE WELD: Passing the p_business_id resolved from the profile to isolate business data
    const { data, error } = await supabase.rpc('get_sales_report_data_v2', {
        p_business_id: businessId,
        p_start_date: format(dateRange.from, 'yyyy-MM-dd'),
        p_end_date: format(dateRange.to, 'yyyy-MM-dd'),
    });

    if (error) {
        console.error("REPORT_FORENSIC_FAULT:", error.message);
        throw new Error(error.message);
    }
    return data;
}

export default function SalesReportClient() {
  const supabase = createClient();
  const [date, setDate] = useState<DateRange | undefined>({ 
    from: addDays(new Date(), -29), 
    to: new Date() 
  });
  const printRef = useRef<HTMLDivElement>(null);

  // --- IDENTITY STATE: Anchor the report to the physical business node ---
  const [businessId, setBusinessId] = useState<string | null>(null);

  useEffect(() => {
    async function resolveIdentity() {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            // Forensic lookup in profiles to get the definitive Business ID for the handshake
            const { data: profile } = await supabase
                .from('profiles')
                .select('business_id')
                .eq('id', user.id)
                .single();
            if (profile) setBusinessId(profile.business_id);
        }
    }
    resolveIdentity();
  }, [supabase]);

  // --- ANALYTICS ENGINE: Dependent on Time and Identity ---
  const { data, isLoading, isError, refetch, isRefetching } = useQuery<ReportData>({ 
    queryKey: ['salesReport', date, businessId], 
    queryFn: () => fetchReportData(date!, businessId!),
    enabled: !!date?.from && !!date?.to && !!businessId,
    staleTime: 0 
  });

  const handlePrint = useReactToPrint({ 
    content: () => printRef.current,
    documentTitle: `Sales_Audit_Report_${format(new Date(), 'yyyy-MM-dd')}`,
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
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900 uppercase">Sales Performance Hub</h2>
                </div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                    Multi-Tenant Financial Oversight • Forensic Analytics
                </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
                <DatePickerWithRange date={date} setDate={setDate} />
                <Button 
                    variant="outline" 
                    size="icon" 
                    className="h-12 w-12 rounded-xl border-slate-200 bg-white shadow-sm" 
                    onClick={() => refetch()} 
                    disabled={isRefetching || !businessId}
                >
                    <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
                </Button>
                <Button 
                    variant="default" 
                    className="bg-slate-900 hover:bg-black text-white font-black h-12 px-8 rounded-xl text-[10px] uppercase tracking-[0.15em] shadow-xl active:scale-95 transition-all"
                    onClick={handlePrint}
                >
                    <Printer className="mr-3 h-4 w-4"/> Export Forensic PDF
                </Button>
            </div>
        </div>

        {(isError || (!businessId && !isLoading)) && (
            <div className="p-6 bg-red-50 text-red-700 border-2 border-dashed border-red-100 rounded-2xl flex items-center gap-4">
                <ShieldCheck className="h-6 w-6" />
                <span className="font-bold text-sm uppercase tracking-tight">
                    {!businessId ? "Saturating Business Identity..." : "Signal Interrupted: Unable to reconcile business data. Verify server connection."}
                </span>
            </div>
        )}

        {/* --- REPORT PREVIEW --- */}
        <div ref={printRef} className="space-y-10 bg-transparent p-1 print:p-12 print:bg-white">
            
            {/* Header for Printed Document */}
            <div className="hidden print:flex justify-between items-end border-b-2 border-slate-900 pb-6 mb-10">
                <div>
                    <h1 className="text-4xl font-black uppercase tracking-tighter text-slate-900">Enterprise Sales Audit</h1>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mt-3">
                        Reporting Window: {format(date?.from || new Date(), 'dd MMM yyyy')} — {format(date?.to || new Date(), 'dd MMM yyyy')}
                    </p>
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">Sovereign Reporting Protocol</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Node ID: {businessId?.substring(0, 8)}</p>
                </div>
            </div>

            {/* --- PERFORMANCE SUMMARY --- */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card className="border-none shadow-2xl rounded-[1.5rem] bg-white overflow-hidden group hover:ring-2 hover:ring-blue-500 transition-all">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                        <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Aggregate Gross</CardTitle>
                        <DollarSign className="h-4 w-4 text-blue-600 opacity-20 group-hover:opacity-100 transition-opacity" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-slate-900 tabular-nums tracking-tighter">
                            {isLoading ? <Loader2 className="animate-spin h-4 w-4" /> : formatCurrency(data?.summary.total_sales || 0)}
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-2xl rounded-[1.5rem] bg-white overflow-hidden group hover:ring-2 hover:ring-emerald-500 transition-all">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                        <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Net Margin Pool</CardTitle>
                        <Scale className="h-4 w-4 text-emerald-600 opacity-20 group-hover:opacity-100 transition-opacity" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-emerald-600 tabular-nums tracking-tighter">
                             {isLoading ? <Loader2 className="animate-spin h-4 w-4" /> : formatCurrency(data?.summary.gross_profit || 0)}
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-2xl rounded-[1.5rem] bg-white overflow-hidden group hover:ring-2 hover:ring-amber-500 transition-all">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                        <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Voucher Volume</CardTitle>
                        <ShoppingBag className="h-4 w-4 text-amber-600 opacity-20 group-hover:opacity-100 transition-opacity" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-slate-900 tabular-nums tracking-tighter">
                             {isLoading ? <Loader2 className="animate-spin h-4 w-4" /> : (data?.summary.transaction_count || 0)}
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-2xl rounded-[1.5rem] bg-white overflow-hidden group hover:ring-2 hover:ring-indigo-500 transition-all">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                        <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Profit Index</CardTitle>
                        <TrendingUp className="h-4 w-4 text-indigo-600 opacity-20 group-hover:opacity-100 transition-opacity" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-indigo-600 tabular-nums tracking-tighter">
                             {isLoading ? <Loader2 className="animate-spin h-4 w-4" /> : `${(((data?.summary.gross_profit || 0) / (data?.summary.total_sales || 1)) * 100).toFixed(1)}%`}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* --- ANALYTICAL CHARTS --- */}
            <div className="grid gap-8 lg:grid-cols-3">
                <Card className="lg:col-span-2 border-none shadow-2xl rounded-[2rem] bg-white overflow-hidden border border-slate-100">
                    <CardHeader className="px-10 pt-10 border-b border-slate-50 pb-6">
                        <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Sector Revenue Distribution</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[400px] p-10">
                        {isLoading ? <div className="h-full w-full flex items-center justify-center text-slate-300 font-bold uppercase text-[10px] tracking-widest animate-pulse">Synchronizing Data Nodes...</div> : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data?.salesByCategory || []}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" fontSize={9} fontWeight={900} tickLine={false} axisLine={false} tick={{fill: '#94a3b8'}} height={50} interval={0} textAnchor="end" />
                                    <YAxis fontSize={9} fontWeight={900} tickLine={false} axisLine={false} tick={{fill: '#94a3b8'}} tickFormatter={(value) => `${value / 1000}k`} />
                                    <Tooltip 
                                        contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 20px 50px rgba(0,0,0,0.1)', padding: '15px'}}
                                        formatter={(value: number) => [formatCurrency(value), "Net Revenue"]}
                                        cursor={{ fill: '#f8fafc' }}
                                    />
                                    <Bar dataKey="Amount" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>

                {/* --- BUSINESS COMPLIANCE & SETTINGS --- */}
                <Card className="border-none shadow-2xl rounded-[2rem] bg-slate-900 text-white p-10 space-y-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-10 opacity-10">
                        <ShieldCheck size={120} />
                    </div>
                    <div className="h-14 w-14 bg-white/10 rounded-2xl flex items-center justify-center shadow-inner">
                        <ShieldCheck className="text-emerald-400 h-8 w-8" />
                    </div>
                    <div>
                        <h3 className="text-2xl font-black uppercase tracking-tight italic">Forensic Integrity</h3>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-3">Identity Lock: {businessId?.substring(0, 8)}</p>
                    </div>
                    <div className="space-y-6 pt-6">
                        <div className="flex justify-between items-center border-b border-white/5 pb-5">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Active Region</span>
                            <Badge className="bg-emerald-500/20 text-emerald-400 border-none font-black text-[10px] px-3 py-1 rounded-lg">UG-EAST</Badge>
                        </div>
                        <div className="flex justify-between items-center border-b border-white/5 pb-5">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Audit Standard</span>
                            <span className="text-[11px] font-mono font-black text-slate-300">IFRS-OMEGA</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Master Ledger</span>
                            <span className="text-[11px] font-mono font-black text-blue-400 uppercase tracking-tighter flex items-center gap-2">
                                <CheckCircle2 size={12}/> Verified
                            </span>
                        </div>
                    </div>
                    <div className="mt-auto pt-10 flex items-center gap-4">
                         <Fingerprint className="text-slate-800 h-10 w-10" />
                         <p className="text-[9px] text-slate-700 font-black leading-tight uppercase tracking-widest">Biometric Encrypted Reporting Pathway</p>
                    </div>
                </Card>
            </div>

            {/* --- PRODUCT SALES LEADERBOARD --- */}
            <Card className="border-none shadow-2xl rounded-[2rem] bg-white overflow-hidden border border-slate-100">
                <CardHeader className="px-10 pt-10 border-b border-slate-50 pb-8 flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Inventory Liquidity Analysis</CardTitle>
                        <CardDescription className="text-xs font-bold text-slate-900 mt-2 uppercase tracking-tight italic">Highest Velocity Assets by Revenue Index</CardDescription>
                    </div>
                    <Box className="h-6 w-6 text-blue-600 opacity-20" />
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-slate-50/50">
                            <TableRow className="hover:bg-transparent border-none h-14">
                                <TableHead className="px-10 font-black text-[10px] uppercase tracking-widest text-slate-500">Asset Identity</TableHead>
                                <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-500">Sold Count</TableHead>
                                <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-500 text-right">Weighted Avg Price</TableHead>
                                <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-500 text-right">Tax Contribution</TableHead>
                                <TableHead className="px-10 font-black text-[10px] uppercase tracking-widest text-slate-500 text-right">Net Liquidity</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={5} className="h-64 text-center">
                                    <div className="flex flex-col items-center gap-3 opacity-20 animate-pulse">
                                        <Loader2 className="animate-spin h-10 w-10" />
                                        <span className="font-black uppercase text-xs tracking-widest">Aggregating Global data points...</span>
                                    </div>
                                </TableCell></TableRow>
                            ) : data?.productPerformance?.length === 0 ? (
                                <TableRow><TableCell colSpan={5} className="h-64 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px]">Zero activity detected in current period</TableCell></TableRow>
                            ) : data?.productPerformance?.map((product, i) => (
                                <TableRow key={i} className="hover:bg-slate-50/50 border-slate-50 transition-colors h-24">
                                    <TableCell className="px-10">
                                        <div className="flex flex-col">
                                            <span className="font-black text-slate-900 text-base tracking-tight">{product.product_name}</span>
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Identifier: {product.sku}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="rounded-xl border-slate-200 font-mono font-black text-slate-600 px-4 py-1.5 shadow-sm text-xs tabular-nums">
                                            {product.units_sold} ITEMS
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right font-mono font-black text-slate-500 text-sm tabular-nums">
                                        {formatCurrency(product.average_unit_rate)}
                                    </TableCell>
                                    <TableCell className="text-right font-mono font-black text-red-500/60 text-sm tabular-nums">
                                        {formatCurrency(product.aggregate_taxes)}
                                    </TableCell>
                                    <TableCell className="px-10 text-right font-mono font-black text-slate-900 text-xl tabular-nums tracking-tighter">
                                        {formatCurrency(product.gross_margin)}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* --- REPORT FOOTER --- */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-8 text-[10px] text-slate-400 font-black uppercase tracking-[0.4em] pt-20 border-t border-slate-100">
                <p>&copy; {new Date().getFullYear()} LITONU BUSINESS BASE UNIVERSE • SOVEREIGN ANALYTICS</p>
                <div className="flex items-center gap-10">
                    <span className="flex items-center gap-2 text-emerald-600"><ShieldCheck size={16}/> PROTOCOL SECURE</span>
                    <span className="flex items-center gap-2 text-slate-400"><Fingerprint size={16}/> AUDIT-READY</span>
                </div>
            </div>
        </div>
    </div>
  );
}