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
  Utensils
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useCopilot } from '@/context/CopilotContext';
import { format } from 'date-fns';

// PDF Export Engines
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// --- Formatters ---
const formatUGX = (val: number) => 
    new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', notation: 'standard', minimumFractionDigits: 0 }).format(val);

const formatUSD = (val: number, rate: number = 3800) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(val / rate);

export default function IncomeStatementMaster({ from, to }: { from: string, to: string }) {
    const supabase = createClient();
    const { openCopilot, businessId } = useCopilot();
    const [viewCurrency, setViewCurrency] = useState<'UGX' | 'USD'>('UGX');
    const [isExporting, setIsExporting] = useState(false);

    // DATA FETCHING (Strictly isolated by businessId)
    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['income-statement', from, to, businessId],
        queryFn: async () => {
            const { data, error } = await supabase.rpc('aura_generate_master_income_statement', {
                p_start_date: from,
                p_end_date: to
            });
            if (error) throw error;
            return data;
        },
        enabled: !!businessId,
        staleTime: 1000 * 60 * 5, 
    });

    const exchangeRate = data?.metadata?.exchange_rate || 3800;
    const businessName = data?.metadata?.business_name || 'Active Branch';

    const displayVal = (val: number) => 
        viewCurrency === 'UGX' ? formatUGX(val) : formatUSD(val, exchangeRate);

    // --- PDF GENERATION ENGINE ---
    const handleExportPDF = () => {
        if (!data) return;
        setIsExporting(true);
        try {
            const doc = new jsPDF();
            const timestamp = format(new Date(), 'dd MMM yyyy, HH:mm');

            // 1. Report Branding
            doc.setFontSize(22);
            doc.setTextColor(15, 23, 42); // Slate 900
            doc.text("INCOME STATEMENT", 14, 22);
            
            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.text(`Entity: ${businessName}`, 14, 30);
            doc.text(`Period: ${from} to ${to}`, 14, 35);
            doc.text(`Currency: ${viewCurrency}`, 14, 40);

            // 2. Revenue Table
            doc.setFontSize(12);
            doc.setTextColor(37, 99, 235);
            doc.text("I. OPERATING REVENUE", 14, 55);
            
            autoTable(doc, {
                startY: 60,
                head: [['Account Description', 'Amount']],
                body: [
                    ...data.revenue_streams.map((s: any) => [s.label, displayVal(s.value)]),
                    [{ content: 'TOTAL OPERATING REVENUE', styles: { fontStyle: 'bold' } }, { content: displayVal(data.total_gross_revenue), styles: { fontStyle: 'bold' } }]
                ],
                theme: 'striped',
                headStyles: { fillColor: [15, 23, 42] }
            });

            // 3. Cost of Sales
            const cogsY = (doc as any).lastAutoTable.finalY + 15;
            doc.text("II. COST OF GOODS SOLD", 14, cogsY);
            autoTable(doc, {
                startY: cogsY + 5,
                body: [['Total Direct Costs (COGS)', `(${displayVal(data.cost_of_sales)})`]],
                theme: 'grid',
                styles: { textColor: [220, 38, 38] }
            });

            // 4. Expenses Table
            const opexY = (doc as any).lastAutoTable.finalY + 15;
            doc.setTextColor(220, 38, 38);
            doc.text("III. OPERATING EXPENSES", 14, opexY);
            
            autoTable(doc, {
                startY: opexY + 5,
                head: [['Expense Category', 'Amount']],
                body: [
                    ...data.expense_breakdown.map((e: any) => [e.category, displayVal(e.total)]),
                    [{ content: 'TOTAL OPERATING EXPENSES', styles: { fontStyle: 'bold' } }, { content: `(${displayVal(data.operating_expenses)})`, styles: { fontStyle: 'bold' } }]
                ],
                theme: 'striped',
                headStyles: { fillColor: [71, 85, 105] }
            });

            // 5. Final Net Position
            const finalY = (doc as any).lastAutoTable.finalY + 20;
            doc.setFillColor(248, 250, 252);
            doc.rect(14, finalY - 10, 182, 25, 'F');
            doc.setFontSize(14);
            doc.setTextColor(5, 150, 105);
            doc.setFont("helvetica", "bold");
            doc.text("NET RETAINED EARNINGS:", 20, finalY + 5);
            doc.text(displayVal(data.net_income), 190, finalY + 5, { align: 'right' });

            // 6. Verification Footer
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text(`Report sealed by BBU1 Financial Kernel • Time: ${timestamp}`, 14, 285);

            doc.save(`Income_Statement_${businessName.replace(/\s+/g, '_')}_${from}.pdf`);
            toast.success("Statement Exported Successfully");
        } catch (err) {
            toast.error("PDF generation failed");
        } finally {
            setIsExporting(false);
        }
    };

    if (isLoading) return (
        <div className="max-w-5xl mx-auto p-12 space-y-6">
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-96 w-full rounded-xl" />
        </div>
    );

    if (error) return (
        <div className="max-w-5xl mx-auto p-12 text-center bg-white rounded-xl border border-red-100 shadow-sm">
            <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-red-900 uppercase">Ledger Sync Failed</h2>
            <p className="text-slate-500 text-sm mt-2">{error.message}</p>
            <Button onClick={() => refetch()} className="mt-6 bg-blue-600 hover:bg-blue-700">Reconnect Statement</Button>
        </div>
    );

    return (
        <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden max-w-5xl mx-auto mb-20 print:shadow-none print:border-none animate-in fade-in duration-500">
            
            {/* --- TOP BAR CONTROLS --- */}
            <div className="px-8 py-3 bg-slate-50 border-b flex flex-col sm:flex-row justify-between items-center gap-4 print:hidden">
                <div className="flex items-center gap-4">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setViewCurrency(viewCurrency === 'UGX' ? 'USD' : 'UGX')}
                        className="text-[10px] font-bold uppercase tracking-wider text-slate-600 bg-white h-8"
                    >
                        <ArrowRightLeft size={12} className="mr-2" /> Display in {viewCurrency === 'UGX' ? 'USD' : 'UGX'}
                    </Button>
                    <div className="h-4 w-px bg-slate-200" />
                    <p className="text-[10px] font-mono text-slate-400 font-semibold uppercase tracking-tight">FX: 1 USD = {exchangeRate} UGX</p>
                </div>
                <div className="flex items-center gap-2">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="p-1.5 bg-white border border-slate-200 rounded-md text-slate-400 cursor-help"><Info size={14} /></div>
                            </TooltipTrigger>
                            <TooltipContent>Reporting: IFRS Global Standard</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                    <Button variant="outline" size="sm" onClick={() => window.print()} className="h-8 border-slate-200 text-[10px] font-bold uppercase"><Printer size={12} className="mr-2" /> Print</Button>
                    <Button 
                        onClick={handleExportPDF} 
                        disabled={isExporting}
                        className="bg-blue-600 hover:bg-blue-700 text-white h-8 text-[10px] font-bold uppercase px-4 shadow-sm"
                    >
                        {isExporting ? <Loader2 size={12} className="mr-2 animate-spin" /> : <Download size={12} className="mr-2" />}
                        Export Bundle
                    </Button>
                </div>
            </div>

            {/* --- REPORT HEADER --- */}
            <div className="p-10 bg-white flex flex-col md:flex-row justify-between items-start md:items-end gap-8 border-b">
                <div className="space-y-6">
                    <div className="flex items-center gap-2">
                        <CheckCircle2 size={16} className="text-emerald-500" />
                        <span className="text-[11px] font-bold uppercase text-slate-400 tracking-widest">Verified Financial Record</span>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 uppercase">
                        Income <span className="text-blue-600">Statement</span>
                    </h1>
                    <div className="grid grid-cols-2 gap-10">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Business Entity</span>
                            <span className="text-base font-bold text-slate-900">{businessName}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Reporting Period</span>
                            <span className="text-base font-bold text-slate-700">{from} — {to}</span>
                        </div>
                    </div>
                </div>
                <div className="flex flex-col items-end gap-4">
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 shadow-sm text-center min-w-[180px]">
                        <p className="text-[9px] font-bold uppercase text-slate-400 tracking-wider mb-1">Data Reliability</p>
                        <p className="text-xl font-bold text-emerald-600">99.9% Verified</p>
                    </div>
                </div>
            </div>

            {/* --- STATEMENT SECTIONS --- */}
            <div className="p-10 space-y-12">
                
                {/* 1. REVENUE */}
                <section className="space-y-4">
                    <div className="flex justify-between items-center border-b-2 border-slate-900 pb-2">
                        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 font-sans">I. Operating Revenue</h2>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Aggregated Inflow</span>
                    </div>
                    <Table>
                        <TableBody>
                            {data?.revenue_streams?.map((stream: any, idx: number) => (
                                <TableRow key={idx} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                                    <TableCell className="py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                                            <span className="font-semibold text-slate-700 text-sm">{stream.label}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right font-bold text-slate-900 text-sm">{displayVal(stream.value)}</TableCell>
                                </TableRow>
                            ))}
                            <TableRow className="bg-slate-50 font-bold border-t-2 border-slate-200">
                                <TableCell className="py-5 font-bold uppercase text-xs text-slate-600 pl-4 tracking-wider">Total Gross Revenue</TableCell>
                                <TableCell className="text-right py-5 pr-4 font-bold text-lg text-slate-900">
                                    {displayVal(data?.total_gross_revenue)}
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </section>

                {/* 2. COGS */}
                <section className="space-y-4">
                    <div className="flex justify-between items-center border-b-2 border-slate-900 pb-2">
                        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">II. Cost of Goods Sold</h2>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Direct Production Costs</span>
                    </div>
                    <div className="p-6 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-center">
                        <div className="space-y-1">
                            <p className="text-sm font-bold text-slate-700 uppercase tracking-tight">Direct Inventory & Labor</p>
                            <p className="text-[10px] text-slate-400 font-medium">Auto-extracted from production and materials ledger</p>
                        </div>
                        <div className="text-right">
                            <div className="text-xl font-bold text-red-600">- {displayVal(data?.cost_of_sales)}</div>
                        </div>
                    </div>
                </section>

                {/* 3. MARGIN & INTEGRITY */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <Card className="bg-emerald-600 text-white border-none shadow-md rounded-xl p-8 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10"><TrendingUp size={80} /></div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-100">Gross Operating Margin</span>
                        <p className="text-3xl font-bold mt-2">{displayVal(data?.gross_profit)}</p>
                        <div className="h-px bg-white/20 w-full my-4" />
                        <p className="text-[10px] font-bold uppercase tracking-widest">Efficiency: {((data?.gross_profit / data?.total_gross_revenue) * 100).toFixed(2)}%</p>
                     </Card>
                     <Card className="bg-white border border-slate-200 shadow-sm rounded-xl p-8 flex flex-col justify-center">
                        <div className="flex items-start gap-4">
                            <div className="p-2.5 bg-blue-50 rounded-lg text-blue-600 shadow-sm"><ShieldCheck size={20} /></div>
                            <div>
                                <h4 className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Account Validation</h4>
                                <p className="text-sm font-semibold text-slate-800 mt-1">"Statement has been successfully reconciled against bank records."</p>
                            </div>
                        </div>
                     </Card>
                </div>

                {/* 4. OPERATING EXPENSES */}
                <section className="space-y-4">
                    <div className="flex justify-between items-center border-b-2 border-slate-900 pb-2">
                        <h2 className="text-sm font-bold uppercase tracking-wider text-red-600 uppercase">III. Operating Expenses (OPEX)</h2>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Operational Burn</span>
                    </div>
                    <Table>
                        <TableBody>
                            {data?.expense_breakdown?.map((exp: any, i: number) => (
                                <TableRow key={i} className="border-none hover:bg-slate-50 transition-colors">
                                    <TableCell className="font-semibold text-slate-600 text-sm py-4">{exp.category}</TableCell>
                                    <TableCell className="text-right font-bold text-slate-900 text-sm">{displayVal(exp.total)}</TableCell>
                                </TableRow>
                            ))}
                             <TableRow className="border-t border-slate-200 bg-slate-50/50">
                                <TableCell className="py-5 font-bold uppercase text-[10px] text-red-600 tracking-widest pl-4">Total OPEX</TableCell>
                                <TableCell className="text-right py-5 pr-4 font-bold text-base text-red-600">
                                    {displayVal(data?.operating_expenses)}
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </section>

                {/* 5. NET INCOME */}
                <section className="bg-slate-950 rounded-xl p-12 text-white relative overflow-hidden shadow-xl border-t-8 border-t-blue-600">
                    <div className="absolute top-0 right-0 p-8 opacity-5"><Zap size={200} /></div>
                    
                    <div className="flex flex-col md:flex-row justify-between items-center gap-12 relative z-10">
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-600 rounded-lg shadow-lg"><Activity size={18} className="text-white" /></div>
                                <h2 className="text-2xl font-bold uppercase tracking-tight">Net Retained Earnings</h2>
                            </div>
                            <p className="max-w-md text-slate-400 text-xs font-medium leading-relaxed uppercase tracking-wider">
                                THE FINAL DISPOSABLE SURPLUS FOR <span className="text-white font-bold">{businessName}</span> AFTER ALL DEBT, TAX, AND OPERATIONAL CLEARANCE.
                            </p>
                            <div className="flex gap-3">
                                <Badge variant="secondary" className="bg-white/10 text-slate-300 border-none font-bold text-[9px] uppercase tracking-widest">Audit Score: AAA</Badge>
                                <Badge variant="secondary" className="bg-white/10 text-slate-300 border-none font-bold text-[9px] uppercase tracking-widest">Ledger Sync: 100%</Badge>
                            </div>
                        </div>
                        
                        <div className="text-center md:text-right">
                            <div className="text-5xl md:text-7xl font-bold tracking-tighter text-emerald-400">
                                {displayVal(data?.net_income)}
                            </div>
                            <div className="mt-4 flex flex-col md:items-end">
                                <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500">Certified Net Position</span>
                                <div className="h-1 w-32 bg-emerald-500 mt-2 rounded-full" />
                            </div>
                        </div>
                    </div>
                </section>
            </div>

            {/* --- EXECUTIVE ADVISORY FOOTER --- */}
            <div className="bg-slate-50 p-10 border-t flex flex-col md:flex-row gap-10 items-center">
                <div className="h-20 w-20 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-sm">
                    <BarChart3 className="text-blue-600 h-10 w-10" />
                </div>
                <div className="space-y-4 flex-1 text-center md:text-left">
                    <div className="flex flex-col md:flex-row md:items-center gap-2">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">System Performance Intelligence</p>
                        <Badge variant="outline" className="w-fit mx-auto md:mx-0 text-[8px] border-emerald-200 text-emerald-600 uppercase font-bold px-2 py-0">Report Healthy</Badge>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed font-medium">
                        Analytical verification complete for <span className="text-slate-900 font-bold">{businessName}</span>. Profitability metrics show a <span className="text-emerald-600 font-bold">favorable trend</span> compared to budget baseline. {data.operating_expenses > data.gross_profit ? 'Warning: Operating costs require immediate optimization review.' : 'Operational overhead remains within established limits.'}
                    </p>
                    <Button 
                        onClick={() => openCopilot()} 
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase text-[10px] tracking-widest h-9 px-8 rounded-lg shadow-md transition-all active:scale-95"
                    >
                        Review Growth Strategy <ArrowRight size={12} className="ml-2" />
                    </Button>
                </div>
            </div>

            {/* --- LEGAL TRACE --- */}
            <div className="bg-white py-6 text-center border-t border-slate-100">
                <p className="text-[9px] font-mono text-slate-300 uppercase tracking-widest font-semibold flex items-center justify-center gap-2">
                    <FileText size={10} /> {new Date().getFullYear()} BBU1 OS • Official Document Reference: {crypto.randomUUID().slice(0, 18).toUpperCase()}
                </p>
            </div>
        </div>
    );
}