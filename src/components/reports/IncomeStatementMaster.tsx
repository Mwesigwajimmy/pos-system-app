'use client';

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { 
  TrendingUp, Landmark, CheckCircle2, Printer, Download, 
  Globe, RefreshCw, AlertCircle, Info, Calculator, 
  ArrowRightLeft, Briefcase, Activity, FileText, ShieldCheck,
  ArrowRight, Beaker, FileSpreadsheet, Percent, Search,
  ChevronDown, Layers, MousePointerClick, Clock, Loader2,
  TrendingDown, Hash, Scale
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Table, TableBody, TableCell, TableRow, TableHeader, TableHead } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { cn } from '@/lib/utils';
import { useCopilot } from '@/context/CopilotContext';
import { format } from 'date-fns';
import { toast } from 'sonner';

// Export Engines
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

// --- Formatters ---
const formatMoney = (val: number, currency: string) => 
    new Intl.NumberFormat('en-US', { 
        style: 'currency', 
        currency: currency, 
        minimumFractionDigits: 0,
        maximumFractionDigits: 0 
    }).format(val || 0);

export default function IncomeStatementMaster({ from, to }: { from: string, to: string }) {
    const supabase = createClient();
    const { businessId, openCopilot } = useCopilot();
    const [commonSizeView, setCommonSizeView] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    // 1. DATA FETCHING (Executive Kernel Call v11 Logic)
    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['enterprise-pnl-v11', from, to, businessId],
        queryFn: async () => {
            const { data, error } = await supabase.rpc('get_enterprise_pnl_v11', {
                p_business_id: businessId,
                p_start_date: from,
                p_end_date: to,
                // Comparison period defaults to previous month if logic is added to props
            });
            if (error) throw error;
            return data;
        },
        enabled: !!businessId,
    });

    const currency = data?.metadata?.currency || 'USD';
    const totalRev = data?.summary?.revenue || 1;

    // --- Helper for % of Revenue (Common Size) ---
    const getPct = (val: number) => ((Math.abs(val) / totalRev) * 100).toFixed(1) + '%';
    const display = (val: number) => commonSizeView ? getPct(val) : formatMoney(val, currency);

    // --- Trend Indicator ---
    const Trend = ({ val }: { val?: number }) => {
        if (!val) return null;
        return val > 0 ? 
            <span className="text-emerald-500 flex items-center text-[10px] font-bold ml-2"><TrendingUp size={10} className="mr-1"/>+{val.toFixed(1)}%</span> : 
            <span className="text-red-500 flex items-center text-[10px] font-bold ml-2"><TrendingDown size={10} className="mr-1"/>{val.toFixed(1)}%</span>;
    };

    // --- EXCEL EXPORT ENGINE ---
    const handleExportExcel = () => {
        const wb = XLSX.utils.book_new();
        const wsData = [
            ["BBU1 ENTERPRISE PERFORMANCE REPORT"],
            [`Entity: ${data?.metadata?.entity}`],
            [`Jurisdiction: ${data?.audit?.jurisdiction}`],
            [`Period: ${from} to ${to}`],
            [`Compliance: ${data?.audit?.compliance_standard}`],
            [],
            ["Financial Line Item", "Value", "% of Revenue", "Notes"],
            ["Total Revenue", data?.summary?.revenue, "100%", "Operating Inflow"],
            ["Cost of Sales", -data?.summary?.cogs, getPct(data?.summary?.cogs), "Direct Costs"],
            ["Gross Profit", data?.summary?.gross_profit, getPct(data?.summary?.gross_profit), ""],
            ["Operating Expenses", -data?.summary?.opex, getPct(data?.summary?.opex), "OPEX Burn"],
            ["EBITDA", data?.summary?.ebitda, getPct(data?.summary?.ebitda), "Cash Flow Proxy"],
            ["D&A", -data?.summary?.da, getPct(data?.summary?.da), "Non-Cash"],
            ["EBIT", data?.summary?.ebit, getPct(data?.summary?.ebit), "Operating Income"],
            ["Interest/Finance", -data?.summary?.interest, getPct(data?.summary?.interest), ""],
            ["Other Income/FX", data?.summary?.other_income, getPct(data?.summary?.other_income), "Non-Operating"],
            ["Taxes (Total)", -data?.summary?.total_tax, getPct(data?.summary?.total_tax), "Statutory Liability"],
            ["NET INCOME", data?.summary?.net_income, getPct(data?.summary?.net_income), "Final Surplus"]
        ];
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        XLSX.utils.book_append_sheet(wb, ws, "Financial Statement");
        XLSX.writeFile(wb, `BBU1_Executive_Report_${from}.xlsx`);
        toast.success("Excel Ledger Exported");
    };

    if (isLoading) return (
        <div className="max-w-6xl mx-auto p-20 space-y-8">
            <Skeleton className="h-20 w-full rounded-2xl" />
            <Skeleton className="h-[600px] w-full rounded-3xl" />
        </div>
    );

    if (error) return (
        <div className="max-w-xl mx-auto my-20 p-10 border-2 border-dashed border-red-200 rounded-3xl text-center bg-red-50">
            <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-red-900 uppercase">Statement Sync Failed</h2>
            <p className="text-sm text-red-600/70 mt-2">{error.message}</p>
            <Button onClick={() => refetch()} className="mt-6 bg-red-600 hover:bg-red-700 text-white rounded-xl">Re-establish Handshake</Button>
        </div>
    );

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-20 animate-in fade-in duration-500 font-sans antialiased">
            
            {/* --- EXECUTIVE TOOLBAR --- */}
            <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 print:hidden">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3">
                        <Switch checked={commonSizeView} onCheckedChange={setCommonSizeView} />
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-slate-900 uppercase tracking-tighter">Common Size Analysis</span>
                            <span className="text-[9px] text-slate-400 font-bold uppercase">Toggle % of Revenue</span>
                        </div>
                    </div>
                    <div className="h-6 w-px bg-slate-200" />
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-blue-600 bg-blue-50 border-blue-100 font-bold px-3 py-1">
                            <Scale size={12} className="mr-1.5" /> {data?.audit?.jurisdiction || 'Global'} Compliance
                        </Badge>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleExportExcel} className="h-10 font-bold border-slate-200 rounded-lg px-4 hover:bg-slate-50 transition-all">
                        <FileSpreadsheet size={14} className="mr-2 text-emerald-600" /> Export XLSX
                    </Button>
                    <Button className="h-10 px-6 bg-slate-950 hover:bg-slate-900 text-white font-bold rounded-lg shadow-sm" onClick={() => window.print()}>
                        <Printer size={14} className="mr-2" /> Final Print
                    </Button>
                </div>
            </div>

            {/* --- THE INCOME STATEMENT --- */}
            <Card className="border-slate-200 shadow-2xl rounded-[2rem] overflow-hidden bg-white">
                <CardHeader className="bg-slate-50/50 border-b p-8 md:p-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-emerald-600">
                            <div className="bg-emerald-100 p-1 rounded-md"><CheckCircle2 size={12} /></div>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Validated General Ledger Data</span>
                        </div>
                        <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">Income Statement</h1>
                        <div className="flex items-center gap-4">
                            <p className="text-sm font-bold text-slate-500 uppercase tracking-tight">{data?.metadata?.entity}</p>
                            <div className="h-1 w-1 bg-slate-300 rounded-full" />
                            <p className="text-sm font-medium text-slate-400 italic">Fiscal Period: {from} — {to}</p>
                        </div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-2">
                        <Badge variant="secondary" className="bg-white border shadow-sm text-slate-500 font-mono text-[10px]">
                            <Hash size={10} className="mr-1" /> {data?.audit?.hash?.slice(0, 12)}
                        </Badge>
                        <div className="text-right">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Functional Currency</p>
                            <p className="text-2xl font-black text-slate-900">{currency}</p>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="p-8 md:p-14 space-y-12">
                    
                    {/* 1. REVENUE TIER */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-end border-b-2 border-slate-900 pb-3">
                            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-900">I. Operating Revenue</h2>
                            <span className="text-[10px] text-slate-400 font-bold uppercase">Accrual Basis</span>
                        </div>
                        <div className="flex justify-between py-4 hover:bg-slate-50 px-4 rounded-xl transition-all group">
                            <div className="flex items-center">
                                <span className="font-bold text-slate-700 uppercase text-sm tracking-tight">Total Gross Sales</span>
                                <Trend val={data?.variance?.revenue_change_pct} />
                            </div>
                            <span className="font-black text-slate-900 text-lg">{display(data?.summary?.revenue)}</span>
                        </div>
                        <div className="flex justify-between py-4 bg-slate-50/50 px-6 rounded-xl border border-slate-100 italic">
                            <span className="text-slate-500 font-semibold text-sm">Direct Cost of Goods Sold (COGS)</span>
                            <span className="text-red-500 font-bold">{display(-data?.summary?.cogs)}</span>
                        </div>
                        <div className="flex justify-between py-6 bg-emerald-50 px-8 rounded-2xl font-black border border-emerald-100 shadow-sm">
                            <div className="flex flex-col">
                                <span className="text-emerald-700 uppercase text-[10px] tracking-widest mb-1">Gross Trading Profit</span>
                                <span className="text-[10px] text-emerald-600/60 uppercase">Margin: {data?.ratios?.gross_margin?.toFixed(1)}%</span>
                            </div>
                            <span className="text-emerald-900 text-2xl tracking-tighter">{display(data?.summary?.gross_profit)}</span>
                        </div>
                    </div>

                    {/* 2. OPERATIONAL TIER (EBITDA) */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-end border-b border-slate-200 pb-3">
                            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">II. Operating Expenditures</h2>
                        </div>
                        <div className="flex justify-between py-4 hover:bg-slate-50 px-4 rounded-xl transition-all">
                            <div className="flex items-center gap-2">
                                <span className="text-slate-600 font-bold uppercase text-xs tracking-tight">Selling, General & Admin (SG&A)</span>
                                <TooltipProvider><Tooltip><TooltipTrigger><Info size={12} className="text-slate-300"/></TooltipTrigger><TooltipContent>Includes payroll, rent, and marketing</TooltipContent></Tooltip></TooltipProvider>
                            </div>
                            <span className="text-red-500 font-bold tracking-tight">{display(-data?.summary?.opex)}</span>
                        </div>

                        {/* EBITDA - THE GOLD STANDARD */}
                        <div className="flex justify-between py-8 bg-slate-950 text-white px-10 rounded-[2rem] shadow-2xl relative overflow-hidden group">
                            <Activity className="absolute -left-4 -top-4 text-blue-500 h-24 w-24 opacity-10 rotate-12 transition-transform group-hover:scale-110" />
                            <div className="relative z-10 flex flex-col justify-center">
                                <div className="flex items-center gap-3">
                                    <span className="uppercase text-xs font-black tracking-[0.3em] text-blue-400">EBITDA</span>
                                    <Badge className="bg-blue-500/20 text-blue-300 border-none text-[8px] font-bold uppercase">Operational Cashflow</Badge>
                                </div>
                                <p className="text-[10px] text-slate-500 font-bold uppercase mt-2 tracking-widest">Earnings Before Interest, Taxes, Depr, Amort</p>
                            </div>
                            <div className="relative z-10 text-right">
                                <span className="text-emerald-400 font-black text-4xl tracking-tighter block">{display(data?.summary?.ebitda)}</span>
                                <span className="text-[10px] font-bold text-slate-500 uppercase">Op Margin: {data?.ratios?.operating_margin?.toFixed(1)}%</span>
                            </div>
                        </div>
                    </div>

                    {/* 3. ASSET DEPLETION & FINANCE */}
                    <div className="space-y-3 pt-4">
                        <div className="flex justify-between items-center py-4 px-4 hover:bg-slate-50 rounded-xl transition-all">
                            <span className="text-slate-500 font-bold uppercase text-xs">Depreciation & Amortization (Non-Cash)</span>
                            <span className="text-slate-400 font-bold">{display(-data?.summary?.da)}</span>
                        </div>
                        <div className="flex justify-between items-center py-4 px-4 border-t border-slate-100 hover:bg-slate-50 rounded-xl transition-all">
                            <div className="flex flex-col">
                                <span className="text-slate-500 font-bold uppercase text-xs tracking-tight">Finance Costs & Net Interest</span>
                                <span className="text-[9px] text-slate-400 font-bold uppercase">Adjusted for FX Gains/Losses</span>
                            </div>
                            <span className="text-slate-400 font-bold">{display(-(data?.summary?.interest || 0) + (data?.summary?.other_income || 0))}</span>
                        </div>
                        <div className="flex justify-between py-6 bg-slate-100 px-8 rounded-2xl font-black border border-slate-200">
                            <span className="text-slate-900 uppercase text-xs tracking-widest">EBT (Earnings Before Tax)</span>
                            <span className="text-slate-900 text-xl tracking-tighter">{display(data?.summary?.ebt)}</span>
                        </div>
                    </div>

                    {/* 4. DYNAMIC TAX & NET POSITION */}
                    <div className="pt-8 border-t-2 border-slate-900 space-y-8">
                         <div className="space-y-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Receipt size={14} className="text-red-500" />
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Statutory Breakdown ({data?.audit?.jurisdiction})</span>
                            </div>
                            {data?.summary?.taxes?.length > 0 ? (
                                data.summary.taxes.map((t: any, i: number) => (
                                    <div key={i} className="flex justify-between items-center px-6 py-2 border-l-2 border-red-100">
                                        <span className="text-xs font-bold text-slate-600 uppercase tracking-tight">{t.label}</span>
                                        <span className="text-xs font-bold text-red-500">{display(-t.value)}</span>
                                    </div>
                                ))
                            ) : (
                                <div className="px-6 text-xs italic text-slate-400">No statutory tax lines discovered in this period.</div>
                            )}
                         </div>

                         {/* FINAL BOTTOM LINE HERO */}
                         <div className={cn(
                            "rounded-[2.5rem] p-12 text-white shadow-2xl flex flex-col md:flex-row justify-between items-center gap-10 relative overflow-hidden transition-all duration-700",
                            (data?.summary?.net_income || 0) >= 0 ? "bg-blue-600 shadow-blue-200" : "bg-red-600 shadow-red-200"
                         )}>
                            <ShieldCheck size={200} className="absolute -right-10 -top-10 opacity-10 rotate-12" />
                            <div className="relative z-10 space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md"><Briefcase size={24} /></div>
                                    <h3 className="text-2xl font-black uppercase tracking-tight">Net Period Income</h3>
                                </div>
                                <p className="text-xs text-white/70 max-w-sm font-medium uppercase leading-relaxed tracking-wider">
                                    This figure represents the final audited surplus for <span className="text-white font-bold">{data?.metadata?.entity}</span> after all operational, financial, and statutory liabilities.
                                </p>
                                <div className="flex gap-2 pt-2">
                                    <Badge className="bg-white/10 text-white border-none font-bold text-[9px] uppercase tracking-widest px-3">Etr: {data?.ratios?.net_margin?.toFixed(1)}%</Badge>
                                    <Badge className="bg-white/10 text-white border-none font-bold text-[9px] uppercase tracking-widest px-3">Status: Finalized</Badge>
                                </div>
                            </div>
                            <div className="text-center md:text-right relative z-10">
                                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/50 mb-2">Bottom Line Surplus</p>
                                <div className="text-6xl lg:text-8xl font-black tracking-tighter drop-shadow-xl">
                                    {display(data?.summary?.net_income)}
                                </div>
                                <div className="h-2 w-32 bg-white/30 ml-auto mt-6 rounded-full shadow-inner" />
                            </div>
                         </div>
                    </div>

                </CardContent>

                {/* --- EXECUTIVE DRILL-DOWN & AI --- */}
                <div className="px-8 md:px-14 pb-12">
                    <Card className="bg-slate-50 border-slate-200 rounded-3xl overflow-hidden shadow-inner">
                        <CardHeader className="pb-4 pt-8 px-10">
                            <CardTitle className="text-[11px] font-black uppercase text-slate-400 flex items-center gap-2 tracking-[0.2em]">
                                <Layers size={14} className="text-blue-600" />
                                Intelligent Ledger Investigation
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="px-10 pb-10">
                            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                                <p className="text-xs text-slate-500 max-w-md font-medium leading-relaxed">
                                    BBU1 allows deep-trace investigation. You can click to see the specific ledger entries for any account movement reflected in this statement.
                                </p>
                                <div className="flex flex-wrap gap-3 w-full md:w-auto">
                                    <Sheet>
                                        <SheetTrigger asChild>
                                            <Button variant="outline" className="h-12 px-6 rounded-xl text-[10px] font-black uppercase bg-white border-slate-200 shadow-sm hover:shadow-md transition-all">
                                                <Search size={14} className="mr-2 text-blue-600" /> Audit Accounts
                                            </Button>
                                        </SheetTrigger>
                                        <SheetContent className="w-[400px] sm:w-[600px] border-l-0 shadow-2xl p-0">
                                            <div className="bg-slate-900 p-8 text-white">
                                                <SheetHeader>
                                                    <SheetTitle className="text-white text-2xl font-black uppercase">Ledger Drill-down</SheetTitle>
                                                    <SheetDescription className="text-slate-400 font-bold uppercase text-[10px]">Granular Account Breakdown</SheetDescription>
                                                </SheetHeader>
                                            </div>
                                            <div className="p-8 space-y-3 overflow-y-auto max-h-[calc(100vh-160px)]">
                                                {data?.drill_down ? Object.entries(data.drill_down).map(([name, val]: any) => (
                                                    <div key={name} className="flex justify-between items-center p-5 bg-white rounded-xl border border-slate-100 shadow-sm hover:border-blue-200 transition-colors">
                                                        <span className="font-bold text-slate-700 text-xs uppercase tracking-tight">{name}</span>
                                                        <span className={cn("font-black font-mono", val < 0 ? "text-red-500" : "text-blue-600")}>
                                                            {formatMoney(val, currency)}
                                                        </span>
                                                    </div>
                                                )) : <div className="text-center py-20 text-slate-400">Loading audit trail...</div>}
                                            </div>
                                        </SheetContent>
                                    </Sheet>
                                    
                                    <Button onClick={() => openCopilot()} className="h-12 px-8 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-200 active:scale-95 transition-all">
                                        <Zap size={14} className="mr-2" /> Discuss Growth Strategy <ArrowRight size={14} className="ml-2" />
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <CardFooter className="bg-white border-t py-6 px-12 flex flex-col md:flex-row justify-between items-center gap-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <ShieldCheck size={14} className="text-emerald-500" />
                            Data Integrity Certified
                        </div>
                        <div className="h-4 w-px bg-slate-200 hidden md:block" />
                        <div className="flex items-center gap-2">
                            <Clock size={14} />
                            Generated {format(new Date(), 'MMM dd, HH:mm')}
                        </div>
                    </div>
                    <div className="flex items-center gap-4 font-mono text-slate-300">
                        <span>Node: {data?.metadata?.node || 'Primary Terminal'}</span>
                        <span>v11.0.4-LTS</span>
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
}

// Sub-component for dynamic icons
function Receipt({ className, size }: { className?: string, size?: number }) {
    return <FileText className={className} size={size} />;
}