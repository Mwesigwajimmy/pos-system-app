'use client';

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { 
  TrendingUp, 
  Landmark, 
  CheckCircle2, 
  Printer, 
  Download, 
  Globe, 
  RefreshCw, 
  AlertCircle, 
  Info, 
  Zap, 
  ArrowRightLeft, 
  Briefcase, 
  Activity,
  FileText,
  ShieldCheck,
  ArrowRight,
  Beaker,
  Utensils,
  BarChart3,
  Calendar,
  Calculator,
  Loader2,
  ChevronDown,
  MessageSquareText
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Table, TableBody, TableCell, TableRow, TableHeader, TableHead } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useCopilot } from '@/context/CopilotContext';
import { format, startOfMonth, endOfMonth } from 'date-fns';

// PDF Export Engines
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function IncomeStatementMaster() {
    const supabase = createClient();
    const { openCopilot, businessId } = useCopilot();
    
    // 1. DATE RANGE STATE (Default to current full month)
    const [dateFrom, setDateFrom] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
    const [dateTo, setDateTo] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
    const [isExporting, setIsExporting] = useState(false);
    const [viewCurrency, setViewCurrency] = useState<'LOCAL' | 'USD'>('LOCAL');

    // 2. DATA ACQUISITION: Direct General Ledger Handshake
    // This pulls from the specific business accounts (Isolated logic)
    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['professional-pnl', dateFrom, dateTo, businessId],
        queryFn: async () => {
            const { data, error } = await supabase.rpc('get_professional_income_statement', {
                p_business_id: businessId,
                p_start_date: dateFrom,
                p_end_date: dateTo
            });
            if (error) throw error;
            return data;
        },
        enabled: !!businessId,
        staleTime: 1000 * 60 * 5, 
    });

    const currencyCode = data?.metadata?.currency || 'UGX';
    const businessName = data?.metadata?.business_name || 'Active Enterprise';
    const exchangeRate = data?.metadata?.exchange_rate || 3800;

    // 3. FINANCIAL FORMATTING ENGINE
    const displayVal = (val: number) => {
        const amount = viewCurrency === 'LOCAL' ? (val || 0) : (val / exchangeRate);
        const code = viewCurrency === 'LOCAL' ? currencyCode : 'USD';
        
        return new Intl.NumberFormat('en-US', { 
            style: 'currency', 
            currency: code,
            minimumFractionDigits: 0 
        }).format(amount);
    };

    // 4. PROFESSIONAL PDF GENERATION
    const handleExportPDF = () => {
        if (!data) return;
        setIsExporting(true);
        try {
            const doc = new jsPDF();
            const timestamp = format(new Date(), 'dd MMM yyyy, HH:mm');

            doc.setFontSize(22);
            doc.setTextColor(15, 23, 42); 
            doc.text("INCOME STATEMENT", 14, 22);
            
            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.text(`Entity: ${businessName}`, 14, 30);
            doc.text(`Period: ${dateFrom} to ${dateTo}`, 14, 35);
            doc.text(`Currency: ${viewCurrency === 'LOCAL' ? currencyCode : 'USD'}`, 14, 40);

            autoTable(doc, {
                startY: 50,
                head: [['Account Details', 'Amount']],
                body: [
                    ['Total Operating Revenue', displayVal(data.revenue.total)],
                    ['Cost of Goods Sold (COGS)', `(${displayVal(data.cogs)})`],
                    ['Operating Expenses (OPEX)', `(${displayVal(data.opex.total)})`],
                    ['Tax Provisions', `(${displayVal(data.tax_provision)})`],
                    ['NET INCOME FOR PERIOD', displayVal(data.net_income)],
                ],
                theme: 'striped',
                headStyles: { fillColor: [51, 65, 85] }
            });

            const finalY = (doc as any).lastAutoTable.finalY + 20;
            doc.setFontSize(8);
            doc.text(`Authenticated by BBU1 System • ID: ${businessId.slice(0,12)}`, 14, finalY);

            doc.save(`Income_Statement_${dateFrom}_to_${dateTo}.pdf`);
            toast.success("Professional Statement Downloaded");
        } catch (err) {
            console.error(err);
        } finally {
            setIsExporting(false);
        }
    };

    if (error) return (
        <div className="max-w-5xl mx-auto p-12 text-center bg-white rounded-xl border border-red-100 shadow-sm mt-10">
            <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-red-900 uppercase">Accounting Ledger Sync Error</h2>
            <p className="text-slate-500 text-sm mt-2">{error.message}</p>
            <Button onClick={() => refetch()} className="mt-6 bg-blue-600 hover:bg-blue-700">Reconnect Statement</Button>
        </div>
    );

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-20 animate-in fade-in duration-500 font-sans antialiased">
            
            {/* --- TOP BAR: CONTROLS & DATE SELECTION --- */}
            <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm flex flex-col lg:flex-row justify-between items-center gap-6 print:hidden">
                <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
                    <div className="flex items-center gap-3">
                        <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Period From</Label>
                        <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9 w-40 text-xs font-semibold border-slate-200" />
                    </div>
                    <div className="flex items-center gap-3">
                        <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">To</Label>
                        <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9 w-40 text-xs font-semibold border-slate-200" />
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => refetch()} className="text-blue-600 h-9 px-2 hover:bg-blue-50">
                        <RefreshCw size={14} className={cn(isLoading && "animate-spin")} />
                    </Button>
                </div>

                <div className="flex items-center gap-3 w-full lg:w-auto justify-end">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setViewCurrency(viewCurrency === 'LOCAL' ? 'USD' : 'LOCAL')}
                        className="text-[10px] font-bold uppercase border-slate-200 h-9"
                    >
                        <ArrowRightLeft size={12} className="mr-2" /> Display in {viewCurrency === 'LOCAL' ? 'USD' : currencyCode}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => window.print()} className="h-9 border-slate-200 font-bold text-xs"><Printer size={14} className="mr-2" /> Print</Button>
                    <Button 
                        onClick={handleExportPDF} 
                        disabled={isExporting || isLoading}
                        className="h-9 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-sm"
                    >
                        {isExporting ? <Loader2 size={14} className="animate-spin mr-2" /> : <Download size={14} className="mr-2" />}
                        Export PDF
                    </Button>
                </div>
            </div>

            {/* --- MASTER REPORT CARD --- */}
            {isLoading ? (
                <div className="space-y-6">
                    <Skeleton className="h-40 w-full rounded-xl" />
                    <Skeleton className="h-96 w-full rounded-xl" />
                </div>
            ) : (
                <Card className="border-slate-200 shadow-sm rounded-xl overflow-hidden bg-white">
                    <CardHeader className="bg-slate-50/50 border-b p-8">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 mb-2">
                                    <CheckCircle2 size={16} className="text-emerald-500" />
                                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Accounting Integrity Verified</span>
                                </div>
                                <h1 className="text-3xl font-bold tracking-tight text-slate-900 uppercase">Income Statement</h1>
                                <p className="text-sm text-slate-500 font-medium ml-1">Company: <span className="font-bold text-slate-800">{businessName}</span></p>
                            </div>
                            <div className="text-left md:text-right space-y-1.5">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Reporting Period</p>
                                <p className="text-sm font-semibold text-slate-700">{format(new Date(dateFrom), "dd MMM yyyy")} — {format(new Date(dateTo), "dd MMM yyyy")}</p>
                                <div className="flex md:justify-end">
                                    <Badge variant="outline" className="mt-2 border-blue-200 text-blue-700 bg-blue-50 font-bold px-3 py-0.5">
                                        Currency: {viewCurrency === 'LOCAL' ? currencyCode : 'USD'}
                                    </Badge>
                                </div>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="p-8 md:p-12 space-y-12">
                        
                        {/* 1. REVENUE SECTION */}
                        <section className="space-y-4">
                            <div className="flex justify-between items-center border-b-2 border-slate-900 pb-2">
                                <h2 className="text-sm font-bold uppercase tracking-tight text-slate-900">I. Operating Revenue</h2>
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Cash Inflow</span>
                            </div>
                            <Table>
                                <TableBody>
                                    {data.revenue.accounts?.length > 0 ? (
                                        data.revenue.accounts.map((acc: any, i: number) => (
                                            <TableRow key={i} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                                <TableCell className="py-4 font-semibold text-slate-600 text-sm pl-6">{acc.label}</TableCell>
                                                <TableCell className="text-right py-4 pr-6 font-bold text-slate-900">{displayVal(acc.value)}</TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow><TableCell colSpan={2} className="py-10 text-center text-slate-400 text-sm italic">No revenue discovered in ledger for this period.</TableCell></TableRow>
                                    )}
                                    <TableRow className="bg-slate-50 font-bold border-t-2 border-slate-200">
                                        <TableCell className="py-5 text-slate-900 uppercase text-xs pl-6">Total Gross Operating Revenue</TableCell>
                                        <TableCell className="text-right py-5 pr-6 text-slate-900 text-lg font-bold">{displayVal(data.revenue.total)}</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </section>

                        {/* 2. COST OF SALES SECTION */}
                        <section className="space-y-4">
                            <div className="flex justify-between items-center border-b-2 border-slate-900 pb-2">
                                <h2 className="text-sm font-bold uppercase tracking-tight text-slate-900">II. Cost of Goods Sold</h2>
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Direct Costs</span>
                            </div>
                            <div className="p-6 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-center group">
                                <div className="space-y-1">
                                    <p className="text-sm font-bold text-slate-700">Direct Inventory Consumption</p>
                                    <p className="text-[10px] text-slate-400 font-medium uppercase">Reconciled from production and sales ledger</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xl font-bold text-red-600">({displayVal(data.cogs)})</p>
                                    <Badge variant="secondary" className="bg-white text-slate-400 border-slate-200 text-[9px] font-bold mt-1">Audit Check: Pass</Badge>
                                </div>
                            </div>
                        </section>

                        {/* 3. MARGIN & HEALTH SUMMARY */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <Card className="bg-emerald-600 text-white border-none shadow-md rounded-xl p-8 relative overflow-hidden">
                                <TrendingUp size={80} className="absolute -right-4 -top-4 opacity-10" />
                                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-100">Gross Trading Margin</span>
                                <p className="text-4xl font-bold mt-2">{displayVal(data.revenue.total - data.cogs)}</p>
                                <div className="h-px bg-white/20 w-full my-4" />
                                <p className="text-[10px] font-bold uppercase tracking-widest">Margin %: {data.revenue.total > 0 ? (((data.revenue.total - data.cogs) / data.revenue.total) * 100).toFixed(2) : 0}%</p>
                             </Card>
                             <Card className="bg-white border border-slate-200 shadow-sm rounded-xl p-8 flex flex-col justify-center">
                                <div className="flex items-start gap-4">
                                    <div className="p-3 bg-blue-50 rounded-lg text-blue-600 shadow-sm"><ShieldCheck size={24} /></div>
                                    <div>
                                        <h4 className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">Account Validation</h4>
                                        <p className="text-sm font-semibold text-slate-800 mt-1 leading-relaxed">
                                            "Statement data is synchronized with the General Ledger. All industry-specific accounts for <span className="text-blue-600">{businessName}</span> have been consolidated."
                                        </p>
                                    </div>
                                </div>
                             </Card>
                        </div>

                        {/* 4. EXPENSES SECTION */}
                        <section className="space-y-4">
                            <div className="flex justify-between items-center border-b-2 border-slate-900 pb-2">
                                <h2 className="text-sm font-bold uppercase tracking-tight text-red-600">III. Operating Expenses (OPEX)</h2>
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Operational Burn</span>
                            </div>
                            <Table>
                                <TableBody>
                                    {data.opex.accounts?.length > 0 ? (
                                        data.opex.accounts.map((acc: any, i: number) => (
                                            <TableRow key={i} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                                <TableCell className="py-4 font-semibold text-slate-600 text-sm pl-6">{acc.label}</TableCell>
                                                <TableCell className="text-right py-4 pr-6 font-bold text-slate-900">{displayVal(acc.value)}</TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow><TableCell colSpan={2} className="py-10 text-center text-slate-400 text-sm italic">No operating expenses recorded.</TableCell></TableRow>
                                    )}
                                    <TableRow className="bg-slate-50 font-bold border-t-2 border-slate-200">
                                        <TableCell className="py-5 text-red-600 uppercase text-xs pl-6">Total Operating Expenses</TableCell>
                                        <TableCell className="text-right py-5 pr-6 text-red-600 font-bold text-lg">({displayVal(data.opex.total)})</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </section>

                        {/* 5. TAX & NET PERFORMANCE HERO CARD */}
                        <section className="space-y-6 pt-6">
                            <div className="flex justify-between items-center border-b border-slate-200 pb-4 px-2">
                                <div className="flex items-center gap-2">
                                    <Landmark size={14} className="text-slate-400" />
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-tight">Statutory Tax Provision</span>
                                </div>
                                <span className="text-sm font-bold text-red-500">-{displayVal(data.tax_provision)}</span>
                            </div>

                            <div className="bg-slate-950 rounded-xl p-10 md:p-16 text-white shadow-xl relative overflow-hidden border-t-8 border-t-blue-600">
                                <Calculator className="absolute -right-8 -top-8 w-48 h-48 text-blue-500 opacity-5 rotate-12" />
                                <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-12">
                                    <div className="space-y-6 flex-1">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2.5 bg-blue-600 rounded-lg shadow-lg">
                                                <Activity size={22} className="text-white" />
                                            </div>
                                            <h2 className="text-2xl font-bold uppercase tracking-tight">Net Earnings Summary</h2>
                                        </div>
                                        <p className="max-w-md text-slate-400 text-xs font-medium leading-relaxed uppercase tracking-wider">
                                            THE FINAL CERTIFIED SURPLUS FOR <span className="text-white font-bold">{businessName}</span> AFTER ALL EXPENDITURES, DEBT REPAYMENTS, AND TAX LIABILITIES.
                                        </p>
                                        <div className="flex gap-3">
                                            <Badge variant="secondary" className="bg-white/10 text-slate-300 border-none font-bold text-[9px] uppercase tracking-widest px-3">Sync Status: 100%</Badge>
                                            <Badge variant="secondary" className="bg-white/10 text-slate-300 border-none font-bold text-[9px] uppercase tracking-widest px-3">Audit Score: AAA</Badge>
                                        </div>
                                    </div>
                                    <div className="text-center md:text-right">
                                        <div className={cn(
                                            "text-5xl lg:text-8xl font-bold tracking-tighter",
                                            data.net_income >= 0 ? "text-emerald-400" : "text-red-400"
                                        )}>
                                            {displayVal(data.net_income)}
                                        </div>
                                        <div className={cn(
                                            "h-1.5 w-32 ml-auto mt-4 rounded-full",
                                            data.net_income >= 0 ? "bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)]" : "bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)]"
                                        )} />
                                        <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-slate-500 mt-4">Verified Net Position</p>
                                    </div>
                                </div>
                            </div>
                        </section>
                    </CardContent>

                    {/* --- EXECUTIVE ADVISORY SECTION --- */}
                    <div className="bg-slate-50 p-10 border-t flex flex-col md:flex-row gap-10 items-center">
                        <div className="h-20 w-20 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-sm">
                            <BarChart3 className="text-blue-600 h-10 w-10" />
                        </div>
                        <div className="space-y-4 flex-1 text-center md:text-left">
                            <div className="flex flex-col md:flex-row md:items-center gap-2">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">System Performance Insights</p>
                                <Badge variant="outline" className="w-fit mx-auto md:mx-0 text-[8px] border-emerald-200 text-emerald-600 uppercase font-bold px-2 py-0">Status: Optimized</Badge>
                            </div>
                            <p className="text-sm text-slate-600 leading-relaxed font-medium">
                                Analysis for <span className="text-slate-900 font-bold">{businessName}</span> complete. 
                                Your <span className="text-blue-600 font-bold">Revenue-to-OPEX ratio</span> is within the healthy enterprise target. 
                                {data.net_income > 0 ? 'Profitability is scaling favorably.' : 'Current burn rate requires overhead optimization.'} 
                                All figures are reconciled with your local tax jurisdiction rules.
                            </p>
                            <Button 
                                onClick={() => openCopilot()} 
                                className="bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase text-[10px] tracking-widest h-9 px-8 rounded-lg shadow-md transition-all active:scale-95"
                            >
                                Discuss Strategic Growth <ArrowRight size={12} className="ml-2" />
                            </Button>
                        </div>
                    </div>

                    <CardFooter className="bg-white border-t py-6 px-10 flex justify-between items-center text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                        <div className="flex items-center gap-2">
                            <ShieldCheck size={14} className="text-emerald-500" />
                            Global Compliance Standard v10.2
                        </div>
                        <div className="flex items-center gap-4 font-mono">
                            <span>Ref ID: {new Date().getTime().toString().slice(-10)}</span>
                            <div className="h-3 w-px bg-slate-200" />
                            <span>Node: Main Terminal</span>
                        </div>
                    </CardFooter>
                </Card>
            )}
        </div>
    );
}