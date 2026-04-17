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
    // --- 1. DATE STATE MANAGEMENT ---
    const [dateRange, setDateRange] = useState({
        from: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
        to: format(new Date(), 'yyyy-MM-dd')
    });

    // --- 2. DATA FETCHING (Linked to view_manufacturing_audit_master) ---
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

    // --- 3. ANALYTICS CALCULATIONS ---
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

    // --- 4. PROFESSIONAL PDF EXPORT LOGIC ---
    const exportToPDF = () => {
        if (!auditData || auditData.length === 0) {
            toast.error("No data available to export.");
            return;
        }

        const doc = new jsPDF('l', 'mm', 'a4');
        const timestamp = format(new Date(), 'yyyy-MM-dd HH:mm');

        // Branded Header
        doc.setFontSize(22);
        doc.setTextColor(15, 23, 42); // slate-900
        doc.text('BBU1 SYSTEM: MANUFACTURING AUDIT REPORT', 14, 22);
        
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Period: ${dateRange.from} to ${dateRange.to}`, 14, 30);
        doc.text(`Generated: ${timestamp}`, 14, 35);

        // Summary Statistics Box
        doc.setDrawColor(230);
        doc.setFillColor(248, 250, 252); // slate-50
        doc.rect(14, 42, 270, 20, 'F');
        doc.setFontSize(10);
        doc.setTextColor(15, 23, 42);
        doc.text(`Total Production Value: ${summary.totalValue.toLocaleString()} UGX`, 20, 54);
        doc.text(`Wastage: ${summary.totalWastage} Units`, 100, 54);
        doc.text(`Estimated VAT Input: ${summary.vatInput.toLocaleString()} UGX`, 180, 54);

        // Audit Table
        autoTable(doc, {
            startY: 70,
            head: [['Batch ID', 'Finished Product', 'Yield', 'Wastage', 'Landed Cost/Unit', 'Total Expenditure', 'Date']],
            body: auditData.map(r => [
                r.batch_number,
                r.finished_product,
                r.yield,
                r.wastage,
                `${r.landed_cost_per_unit.toLocaleString()} UGX`,
                `${r.total_batch_expenditure.toLocaleString()} UGX`,
                format(new Date(r.production_date), 'yyyy-MM-dd')
            ]),
            styles: { fontSize: 8, font: 'helvetica', cellPadding: 4 },
            headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [245, 247, 250] },
        });

        doc.save(`Mfg_Audit_${dateRange.from}_to_${dateRange.to}.pdf`);
        toast.success("Audit Report Downloaded Successfully");
    };

    return (
        <div className="p-8 space-y-8 bg-white min-h-screen animate-in fade-in duration-700">
            {/* TOP COMMAND BAR */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 border-b pb-8">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Manufacturing Intelligence</h1>
                    <p className="text-slate-500 font-bold flex items-center gap-2 mt-1">
                        <ShieldCheck className="text-emerald-500 h-4 w-4" /> Comprehensive Production Cycle & Landed Cost Audit
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* PROFESSIONAL DATE SELECTOR */}
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="h-12 border-slate-200 font-black gap-2 px-6 shadow-sm">
                                <Calendar size={18} className="text-blue-600" />
                                {format(new Date(dateRange.from), 'MMM d')} - {format(new Date(dateRange.to), 'MMM d, yyyy')}
                                <ChevronDown size={14} className="opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 p-6 space-y-4 rounded-2xl shadow-2xl border-none">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400">Quick Select</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <Button variant="ghost" size="sm" onClick={() => setDateRange({from: format(new Date(), 'yyyy-MM-dd'), to: format(new Date(), 'yyyy-MM-dd')})} className="text-xs font-bold">Today</Button>
                                    <Button variant="ghost" size="sm" onClick={() => setDateRange({from: format(startOfMonth(new Date()), 'yyyy-MM-dd'), to: format(new Date(), 'yyyy-MM-dd')})} className="text-xs font-bold">This Month</Button>
                                    <Button variant="ghost" size="sm" onClick={() => setDateRange({from: format(subDays(new Date(), 30), 'yyyy-MM-dd'), to: format(new Date(), 'yyyy-MM-dd')})} className="text-xs font-bold">Last 30 Days</Button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400">Custom Range</label>
                                <div className="space-y-2">
                                    <Input type="date" value={dateRange.from} onChange={e => setDateRange({...dateRange, from: e.target.value})} className="h-9 text-xs font-bold" />
                                    <Input type="date" value={dateRange.to} onChange={e => setDateRange({...dateRange, to: e.target.value})} className="h-9 text-xs font-bold" />
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>

                    <Button onClick={exportToPDF} className="bg-slate-900 hover:bg-blue-600 text-white font-black h-12 px-8 gap-3 shadow-xl transition-all rounded-xl">
                        <FileDown size={20} /> DOWNLOAD AUDIT (PDF)
                    </Button>
                </div>
            </div>

            {/* ANALYTICS PILLARS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="border-none shadow-xl rounded-[2rem] overflow-hidden bg-slate-900 text-white">
                    <CardContent className="p-8 space-y-4">
                        <div className="bg-white/10 w-12 h-12 rounded-2xl flex items-center justify-center text-blue-400"><TrendingUp size={24}/></div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50">Total Produced Value</p>
                            <p className="text-3xl font-black mt-1 tabular-nums">{summary.totalValue.toLocaleString()}</p>
                            <p className="text-[10px] font-bold text-emerald-400 mt-2 flex items-center gap-1">
                                <Activity size={10}/> Financial Asset Growth
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-xl rounded-[2rem] overflow-hidden bg-white">
                    <CardContent className="p-8 space-y-4">
                        <div className="bg-orange-50 w-12 h-12 rounded-2xl flex items-center justify-center text-orange-600"><AlertTriangle size={24}/></div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Production Wastage</p>
                            <p className="text-3xl font-black mt-1 tabular-nums text-slate-900">{summary.totalWastage.toLocaleString()}</p>
                            <p className="text-[10px] font-bold text-orange-500 mt-2 italic">Units lost in cycle</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-xl rounded-[2rem] overflow-hidden bg-white">
                    <CardContent className="p-8 space-y-4">
                        <div className="bg-blue-50 w-12 h-12 rounded-2xl flex items-center justify-center text-blue-600"><Database size={24}/></div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Input VAT Provision</p>
                            <p className="text-3xl font-black mt-1 tabular-nums text-slate-900">{summary.vatInput.toLocaleString()}</p>
                            <p className="text-[10px] font-bold text-blue-500 mt-2">Compliance Credit Ready</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-xl rounded-[2rem] overflow-hidden bg-emerald-600 text-white">
                    <CardContent className="p-8 space-y-4">
                        <div className="bg-white/20 w-12 h-12 rounded-2xl flex items-center justify-center"><ShieldCheck size={24}/></div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Avg. Batch Efficiency</p>
                            <p className="text-3xl font-black mt-1 tabular-nums">{summary.avgEfficiency}%</p>
                            <p className="text-[10px] font-bold mt-2">Yield optimization active</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* THE MASTER AUDIT TABLE */}
            <Card className="border-none shadow-2xl rounded-[2.5rem] overflow-hidden bg-white">
                <CardHeader className="border-b bg-slate-50/50 p-8">
                    <div className="flex justify-between items-center">
                        <CardTitle className="text-2xl font-black text-slate-800 flex items-center gap-3">
                            <Filter size={20} className="text-blue-600" /> Deep Batch Cycle Audit Trail
                        </CardTitle>
                        <Badge className="bg-slate-900 text-white font-black px-4 py-1.5">VERIFIED SESSIONS</Badge>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <ScrollArea className="h-[600px]">
                        <Table>
                            <TableHeader className="bg-slate-50 sticky top-0 z-10">
                                <TableRow>
                                    <TableHead className="font-black text-[10px] uppercase tracking-widest px-8 py-5">Batch ID</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase tracking-widest">Target Product</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-center">Efficiency (Yield)</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-right">Landed Cost/Unit</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-right px-8">Total Expenditure</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow><TableCell colSpan={5} className="h-64 text-center text-slate-400 font-black animate-pulse uppercase tracking-widest">Auditing System Records...</TableCell></TableRow>
                                ) : auditData?.length === 0 ? (
                                    <TableRow><TableCell colSpan={5} className="h-64 text-center text-slate-400 italic">No production batches found for this period.</TableCell></TableRow>
                                ) : auditData?.map((report: any) => (
                                    <TableRow key={report.batch_number} className="hover:bg-blue-50/40 transition-all border-b border-slate-50">
                                        <TableCell className="font-mono text-blue-600 font-black px-8 py-6 text-base">{report.batch_number}</TableCell>
                                        <TableCell>
                                            <div className="font-black text-slate-800 text-base">{report.finished_product}</div>
                                            <div className="text-[10px] font-bold text-slate-400 uppercase">{format(new Date(report.production_date), 'MMMM dd, yyyy')}</div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="font-black text-slate-900">{report.yield} / {report.planned_quantity}</div>
                                            <Badge variant={report.wastage > 0 ? "destructive" : "outline"} className="text-[9px] font-black uppercase px-2 mt-1">
                                                {report.wastage > 0 ? `${report.wastage} Units Loss` : "Zero Wastage"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right font-black text-slate-900 text-lg tabular-nums">
                                            {report.landed_cost_per_unit.toLocaleString()} <span className="text-[10px] text-slate-400">UGX</span>
                                        </TableCell>
                                        <TableCell className="text-right font-black text-blue-600 text-lg tabular-nums px-8">
                                            {report.total_batch_expenditure.toLocaleString()}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </CardContent>
                <CardFooter className="bg-slate-50 p-6 flex justify-between items-center border-t">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Security Protocol: IFRS-15 Compliant Logging</p>
                    <div className="flex gap-2">
                         <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                         <span className="text-[10px] font-bold text-emerald-600 uppercase">Live Engine Active</span>
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
}