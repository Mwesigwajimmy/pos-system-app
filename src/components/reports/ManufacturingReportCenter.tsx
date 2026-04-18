'use client';

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
    TrendingUp, FlaskConical, AlertTriangle, FileDown, 
    ShieldCheck, Calendar, Filter, ChevronDown, 
    Printer, Database, Activity
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
    Popover, PopoverContent, PopoverTrigger 
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format, startOfMonth, endOfMonth, subDays } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import toast from 'react-hot-toast';

const supabase = createClient();

export default function ManufacturingReportCenter() {
    // --- 1. DATE STATE MANAGEMENT (Logic Intact) ---
    const [dateRange, setDateRange] = useState({
        from: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
        to: format(new Date(), 'yyyy-MM-dd')
    });

    // --- 2. DATA FETCHING (Logic Intact) ---
    const { data: auditData, isLoading } = useQuery({
        queryKey: ['mfg_audit_report', dateRange],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('view_manufacturing_audit_master')
                .select('*')
                .gte('production_date', dateRange.from)
                .lte('production_date', dateRange.to)
                .order('production_date', { ascending: false });
            
            if (error) throw error;
            return data || [];
        }
    });

    // --- 3. ANALYTICS CALCULATIONS (Logic Intact) ---
    const summary = useMemo(() => {
        if (!auditData) return { totalValue: 0, totalWastage: 0, avgEfficiency: 0, vatInput: 0 };
        const totalValue = auditData.reduce((s, i) => s + i.total_batch_expenditure, 0);
        const totalWastage = auditData.reduce((s, i) => s + i.wastage, 0);
        const vatInput = auditData.reduce((s, i) => s + (i.estimated_vat_input || 0), 0);
        const efficiency = auditData.length > 0 
            ? (auditData.reduce((s, i) => s + (i.yield / i.planned_quantity), 0) / auditData.length) * 100 
            : 0;
        
        return { totalValue, totalWastage, avgEfficiency: efficiency.toFixed(1), vatInput };
    }, [auditData]);

    // --- 4. PDF EXPORT LOGIC (Logic Intact) ---
    const exportToPDF = () => {
        if (!auditData || auditData.length === 0) {
            toast.error("No data available to export.");
            return;
        }

        const doc = new jsPDF('l', 'mm', 'a4');
        const timestamp = format(new Date(), 'yyyy-MM-dd HH:mm');

        doc.setFontSize(20);
        doc.setTextColor(30, 41, 59);
        doc.text('Manufacturing Production Audit Report', 14, 22);
        
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Reporting Period: ${dateRange.from} to ${dateRange.to}`, 14, 30);
        doc.text(`Generated on: ${timestamp}`, 14, 35);

        doc.setDrawColor(226, 232, 240);
        doc.setFillColor(248, 250, 252); 
        doc.rect(14, 42, 270, 15, 'F');
        doc.setFontSize(9);
        doc.setTextColor(30, 41, 59);
        doc.text(`Total Value: ${summary.totalValue.toLocaleString()} UGX`, 20, 52);
        doc.text(`Total Wastage: ${summary.totalWastage} Units`, 110, 52);
        doc.text(`Estimated VAT Input: ${summary.vatInput.toLocaleString()} UGX`, 190, 52);

        autoTable(doc, {
            startY: 65,
            head: [['Batch No.', 'Product Name', 'Actual Yield', 'Wastage', 'Unit Cost', 'Total Cost', 'Date']],
            body: auditData.map(r => [
                r.batch_number,
                r.finished_product,
                r.yield,
                r.wastage,
                `${r.landed_cost_per_unit.toLocaleString()} UGX`,
                `${r.total_batch_expenditure.toLocaleString()} UGX`,
                format(new Date(r.production_date), 'yyyy-MM-dd')
            ]),
            styles: { fontSize: 8, cellPadding: 3 },
            headStyles: { fillColor: [37, 87, 214], textColor: 255, fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [252, 252, 252] },
        });

        doc.save(`Production_Report_${dateRange.from}.pdf`);
        toast.success("Export successful");
    };

    return (
        <div className="max-w-[1500px] mx-auto py-8 px-6 space-y-6 animate-in fade-in duration-500 bg-slate-50/30 min-h-screen">
            
            {/* TOP COMMAND BAR */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 border-b border-slate-200 pb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Production & Manufacturing Report</h1>
                    <p className="text-sm text-slate-500 font-medium flex items-center gap-2 mt-1">
                        <ShieldCheck size={16} className="text-emerald-500" /> Audit trail for batch yields and landed costs
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="h-10 border-slate-200 font-semibold gap-2 px-4 shadow-sm bg-white">
                                <Calendar size={16} className="text-blue-600" />
                                {format(new Date(dateRange.from), 'MMM d')} - {format(new Date(dateRange.to), 'MMM d, yyyy')}
                                <ChevronDown size={14} className="opacity-40" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 p-5 space-y-4 rounded-xl shadow-lg border border-slate-200" align="end">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Presets</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <Button variant="ghost" size="sm" onClick={() => setDateRange({from: format(new Date(), 'yyyy-MM-dd'), to: format(new Date(), 'yyyy-MM-dd')})} className="text-xs font-semibold">Today</Button>
                                    <Button variant="ghost" size="sm" onClick={() => setDateRange({from: format(startOfMonth(new Date()), 'yyyy-MM-dd'), to: format(new Date(), 'yyyy-MM-dd')})} className="text-xs font-semibold">This Month</Button>
                                    <Button variant="ghost" size="sm" onClick={() => setDateRange({from: format(subDays(new Date(), 30), 'yyyy-MM-dd'), to: format(new Date(), 'yyyy-MM-dd')})} className="text-xs font-semibold">Past 30 Days</Button>
                                </div>
                            </div>
                            <div className="space-y-2 border-t pt-4">
                                <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Custom Period</label>
                                <div className="grid gap-2">
                                    <Input type="date" value={dateRange.from} onChange={e => setDateRange({...dateRange, from: e.target.value})} className="h-9 text-xs" />
                                    <Input type="date" value={dateRange.to} onChange={e => setDateRange({...dateRange, to: e.target.value})} className="h-9 text-xs" />
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>

                    <Button onClick={exportToPDF} className="bg-[#2557D6] hover:bg-[#1e44a8] text-white font-bold h-10 px-6 gap-2 shadow-sm rounded-lg transition-all">
                        <FileDown size={18} /> Export PDF
                    </Button>
                </div>
            </div>

            {/* ANALYTICS PILLARS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border border-slate-200 shadow-sm rounded-xl overflow-hidden bg-slate-900 text-white">
                    <CardContent className="p-6">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Production Value</p>
                        <div className="flex items-baseline gap-2 mt-2">
                            <p className="text-2xl font-bold tabular-nums">{summary.totalValue.toLocaleString()}</p>
                            <span className="text-xs font-medium text-slate-400">UGX</span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-3 text-emerald-400">
                            <TrendingUp size={14}/>
                            <span className="text-[10px] font-bold uppercase">Asset Value</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-slate-200 shadow-sm rounded-xl overflow-hidden bg-white">
                    <CardContent className="p-6">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Stock Wastage</p>
                        <p className="text-2xl font-bold mt-2 tabular-nums text-slate-900">{summary.totalWastage.toLocaleString()}</p>
                        <div className="flex items-center gap-1.5 mt-3 text-amber-500">
                            <AlertTriangle size={14}/>
                            <span className="text-[10px] font-bold uppercase tracking-tight">Units Lost</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-slate-200 shadow-sm rounded-xl overflow-hidden bg-white">
                    <CardContent className="p-6">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Input VAT Summary</p>
                        <div className="flex items-baseline gap-2 mt-2">
                            <p className="text-2xl font-bold tabular-nums text-slate-900">{summary.vatInput.toLocaleString()}</p>
                            <span className="text-xs font-medium text-slate-400">UGX</span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-3 text-blue-600">
                            <Database size={14}/>
                            <span className="text-[10px] font-bold uppercase tracking-tight">Tax Credit</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-slate-200 shadow-sm rounded-xl overflow-hidden bg-emerald-600 text-white">
                    <CardContent className="p-6">
                        <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">Cycle Efficiency</p>
                        <p className="text-2xl font-bold mt-2 tabular-nums">{summary.avgEfficiency}%</p>
                        <div className="flex items-center gap-1.5 mt-3">
                            <ShieldCheck size={14}/>
                            <span className="text-[10px] font-bold uppercase tracking-tight">Yield Accuracy</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* MAIN DATA TABLE */}
            <Card className="border border-slate-200 shadow-sm rounded-xl overflow-hidden bg-white">
                <CardHeader className="border-b bg-white p-8">
                    <div className="flex justify-between items-center">
                        <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <Filter size={18} className="text-blue-500" /> Batch Production Log
                        </CardTitle>
                        <Badge variant="outline" className="bg-slate-50 text-slate-500 font-bold px-3 py-1 border-slate-200 uppercase text-[9px]">Verified Records</Badge>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <ScrollArea className="h-[550px]">
                        <Table>
                            <TableHeader className="bg-slate-50 sticky top-0 z-10 border-b">
                                <TableRow>
                                    <TableHead className="font-bold text-[10px] uppercase h-12 tracking-wider px-8">Batch ID</TableHead>
                                    <TableHead className="font-bold text-[10px] uppercase h-12 tracking-wider">Product Description</TableHead>
                                    <TableHead className="font-bold text-[10px] uppercase h-12 tracking-wider text-center">Batch Performance</TableHead>
                                    <TableHead className="font-bold text-[10px] uppercase h-12 tracking-wider text-right">Landed Cost/Unit</TableHead>
                                    <TableHead className="font-bold text-[10px] uppercase h-12 tracking-wider text-right px-8">Total Expenditure</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow><TableCell colSpan={5} className="h-40 text-center"><Loader2 className="animate-spin inline mr-2 h-5 w-5"/>Syncing production data...</TableCell></TableRow>
                                ) : auditData?.length === 0 ? (
                                    <TableRow><TableCell colSpan={5} className="h-40 text-center text-slate-400 text-sm">No production data found for this range.</TableCell></TableRow>
                                ) : auditData?.map((report: any) => (
                                    <TableRow key={report.batch_number} className="hover:bg-slate-50 transition-colors border-b border-slate-100">
                                        <TableCell className="font-mono text-blue-600 font-bold px-8 py-5 text-sm">{report.batch_number}</TableCell>
                                        <TableCell>
                                            <div className="font-bold text-slate-800 text-sm">{report.finished_product}</div>
                                            <div className="text-[10px] font-semibold text-slate-400 uppercase mt-0.5">{format(new Date(report.production_date), 'dd MMM yyyy')}</div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="text-sm font-bold text-slate-700">{report.yield} / {report.planned_quantity}</div>
                                            <Badge variant={report.wastage > 0 ? "destructive" : "secondary"} className="text-[9px] font-bold px-2 py-0 mt-1 uppercase tracking-tighter">
                                                {report.wastage > 0 ? `${report.wastage} Units Loss` : "Optimal Yield"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="text-sm font-bold text-slate-900">{report.landed_cost_per_unit.toLocaleString()}</div>
                                            <span className="text-[9px] font-bold text-slate-400 uppercase">UGX</span>
                                        </TableCell>
                                        <TableCell className="text-right px-8">
                                            <div className="text-sm font-bold text-blue-600 tabular-nums">{report.total_batch_expenditure.toLocaleString()}</div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </CardContent>
                <CardFooter className="bg-slate-50 p-5 flex justify-between items-center border-t text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Standard Compliance: Batch Auditing Policy Active
                    <div className="flex items-center gap-2 text-emerald-600">
                         <div className="h-2 w-2 rounded-full bg-emerald-500" />
                         Reporting Status Online
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
}