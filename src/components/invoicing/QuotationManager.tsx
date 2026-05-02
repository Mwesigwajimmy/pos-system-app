'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
    FileDigit, CheckCircle2, Search, Loader2, Printer, 
    FileText, Plus, Settings2, ArrowRightLeft, 
    ArrowLeft, ShieldCheck, Filter, ChevronRight,
    LayoutDashboard, Activity
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useRouter } from 'next/navigation';

const supabase = createClient();

export default function QuotationHistoryManager() {
    const queryClient = useQueryClient();
    const router = useRouter();
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');

    const { data: quotes, isLoading } = useQuery({
        queryKey: ['commercial_quotes_history'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('estimates')
                .select(`*, items:estimate_line_items(*)`)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data;
        }
    });

    const updateStatus = useMutation({
        mutationFn: async ({ id, status }: { id: string, status: string }) => {
            const { error } = await supabase.from('estimates').update({ status }).eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success("Transaction status synchronized");
            queryClient.invalidateQueries({ queryKey: ['commercial_quotes_history'] });
        }
    });

    const convertToInvoice = useMutation({
        mutationFn: async (id: string) => {
            const { data: { user } } = await supabase.auth.getUser();
            const { data, error } = await supabase.rpc('proc_convert_estimate_to_tax_document', {
                p_estimate_id: id,
                p_user_id: user?.id
            });
            if (error) throw error;
            return data;
        },
        onSuccess: (invId) => {
            toast.success(`Ledger Entry Finalized: #${invId}`);
            queryClient.invalidateQueries({ queryKey: ['commercial_quotes_history'] });
        }
    });

    const filteredQuotes = useMemo(() => {
        return quotes?.filter(q => {
            const matchesSearch = q.client_name?.toLowerCase().includes(search.toLowerCase()) || 
                                q.estimate_uid?.toLowerCase().includes(search.toLowerCase());
            const matchesStatus = statusFilter === 'ALL' || q.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [quotes, search, statusFilter]);

    const printQuotation = (q: any) => {
        const doc = new jsPDF('p', 'mm', 'a4');
        doc.setFontSize(20); doc.setFont("helvetica", "bold");
        doc.text("COMMERCIAL QUOTATION", 14, 25);
        doc.setFontSize(9); doc.setFont("helvetica", "normal");
        doc.text(`REFERENCE: ${q.estimate_uid} | FISCAL DATE: ${format(new Date(q.created_at), 'PPP')}`, 14, 32);
        autoTable(doc, {
            startY: 50,
            head: [['Description', 'Quantity', 'Unit Rate', 'Total']],
            body: q.items.map((i: any) => [i.description, i.quantity, i.unit_price.toLocaleString(), i.total.toLocaleString()]),
            headStyles: { fillColor: [15, 23, 42] }
        });
        doc.save(`Record_${q.estimate_uid}.pdf`);
    };

    if (isLoading) return (
        <div className="flex flex-col items-center justify-center min-h-[400px] bg-white gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Synchronizing Records</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-white">
            <div className="max-w-[1400px] mx-auto py-8 px-4 md:px-8 space-y-8 animate-in fade-in duration-500">
                
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-slate-50 pb-6">
                    <div className="space-y-3">
                        <button 
                            onClick={() => router.back()}
                            className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-blue-600 transition-colors"
                        >
                            <ArrowLeft size={12} /> Return
                        </button>
                        
                        <div className="flex items-center gap-4">
                            <div className="p-2.5 bg-slate-900 rounded-lg text-white shadow-md">
                                <FileText size={20} />
                            </div>
                            <div className="space-y-0.5">
                                <div className="flex items-center gap-3">
                                    <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">Quotation Registry</h1>
                                    <Badge variant="outline" className="rounded-full px-3 py-0.5 bg-blue-50 text-blue-600 font-bold text-[8px] uppercase tracking-wider border-none">
                                        History Ledger
                                    </Badge>
                                </div>
                                <p className="text-xs font-medium text-slate-500">
                                    Manage historical estimates and approval workflows.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="hidden lg:flex items-center gap-3 bg-slate-50 border border-slate-100 px-5 py-3 rounded-xl">
                            <div className="p-1.5 bg-white text-emerald-500 rounded-lg shadow-sm">
                                <ShieldCheck size={16} />
                            </div>
                            <div className="space-y-0.5">
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Status</p>
                                <p className="text-xs font-bold text-slate-800">Operational</p>
                            </div>
                        </div>

                        <Button 
                            onClick={() => router.push('/invoicing/estimates/new')}
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700 h-10 px-6 rounded-lg shadow-md font-bold text-[10px] uppercase tracking-widest gap-2 transition-all active:scale-95"
                        >
                            <Plus size={16} /> New Entry
                        </Button>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="flex flex-col md:flex-row gap-4 bg-slate-50/50 p-4 rounded-xl border border-slate-100 items-center justify-between">
                        <div className="flex flex-1 gap-3 w-full">
                            <div className="relative flex-1 max-w-sm">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                                <Input 
                                    placeholder="Filter by client or ID..." 
                                    value={search} 
                                    onChange={e => setSearch(e.target.value)} 
                                    className="pl-10 h-10 bg-white border-slate-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-blue-500"
                                />
                            </div>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-48 h-10 bg-white border-slate-200 rounded-lg font-bold text-[10px] uppercase tracking-wider px-4">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent className="rounded-lg border-slate-200 shadow-xl">
                                    <SelectItem value="ALL" className="text-xs font-bold py-2">ALL RECORDS</SelectItem>
                                    <SelectItem value="PENDING" className="text-xs font-bold py-2">PENDING</SelectItem>
                                    <SelectItem value="APPROVED" className="text-xs font-bold py-2 text-emerald-600">VERIFIED</SelectItem>
                                    <SelectItem value="ACCEPTED" className="text-xs font-bold py-2 text-blue-600">FISCALIZED</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        
                        <div className="hidden md:flex items-center gap-6 px-6 border-l border-slate-200">
                            <div className="text-right">
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Registry Nodes</p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className="text-sm font-bold text-slate-900">{filteredQuotes?.length || 0}</span>
                                    <Activity size={12} className="text-blue-500" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <Card className="rounded-xl border border-slate-100 shadow-sm overflow-hidden bg-white">
                        <ScrollArea className="w-full">
                            <Table>
                                <TableHeader className="bg-slate-50">
                                    <TableRow className="h-12 border-none">
                                        <TableHead className="w-[180px] pl-6 font-bold text-[9px] uppercase text-slate-500 tracking-wider">Reference</TableHead>
                                        <TableHead className="font-bold text-[9px] uppercase text-slate-500 tracking-wider">Client Identity</TableHead>
                                        <TableHead className="text-right font-bold text-[9px] uppercase text-slate-500 tracking-wider">Net Valuation</TableHead>
                                        <TableHead className="text-center font-bold text-[9px] uppercase text-slate-500 tracking-wider">Status</TableHead>
                                        <TableHead className="text-right pr-6 font-bold text-[9px] uppercase text-slate-500 tracking-wider">Operations</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredQuotes?.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-48 text-center">
                                                <div className="flex flex-col items-center gap-2 opacity-30">
                                                    <FileText size={32} className="text-slate-400" />
                                                    <p className="font-bold text-[10px] uppercase tracking-widest text-slate-500">No records found</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredQuotes?.map((q: any) => (
                                            <TableRow key={q.id} className="group hover:bg-slate-50/50 transition-all border-b last:border-none">
                                                <TableCell className="pl-6 py-4">
                                                    <div className="font-bold text-blue-600 text-xs uppercase tracking-wide">{q.estimate_uid}</div>
                                                    <div className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">
                                                        {format(new Date(q.created_at), 'dd MMM yyyy')}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="font-bold text-slate-800 text-xs">{q.client_name}</div>
                                                    <div className="text-[10px] text-slate-400 font-medium mt-0.5 truncate max-w-xs">{q.title}</div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="font-bold text-slate-900 text-xs tabular-nums">${q.total_amount.toLocaleString()}</div>
                                                    <div className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">{q.currency_code}</div>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Badge variant="outline" className={`rounded-full px-3 py-0.5 font-bold text-[8px] uppercase tracking-wider border-none shadow-none ${
                                                        q.status === 'PENDING' ? 'bg-amber-50 text-amber-600' :
                                                        q.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600' :
                                                        q.status === 'ACCEPTED' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'
                                                    }`}>
                                                        {q.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right pr-6">
                                                    <div className="flex justify-end gap-2">
                                                        {q.status === 'PENDING' && (
                                                            <Button 
                                                                size="sm" 
                                                                onClick={() => updateStatus.mutate({ id: q.id, status: 'APPROVED' })} 
                                                                className="h-8 bg-emerald-600 hover:bg-emerald-700 rounded-lg font-bold text-[9px] uppercase tracking-widest px-4"
                                                            >
                                                                Verify
                                                            </Button>
                                                        )}
                                                        {q.status === 'APPROVED' && (
                                                            <Button 
                                                                size="sm" 
                                                                onClick={() => convertToInvoice.mutate(q.id)} 
                                                                className="h-8 bg-blue-600 hover:bg-blue-700 rounded-lg font-bold text-[9px] uppercase tracking-widest px-4 gap-1.5"
                                                            >
                                                                <ArrowRightLeft size={12}/> Fiscalize
                                                            </Button>
                                                        )}
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            onClick={() => printQuotation(q)} 
                                                            className="h-8 w-8 text-slate-300 hover:text-blue-600 rounded-lg transition-all"
                                                        >
                                                            <Printer size={16} />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                            <ScrollBar orientation="horizontal" />
                        </ScrollArea>
                    </Card>
                </div>
            </div>

            <footer className="pt-12 pb-10 flex flex-col items-center gap-2 opacity-30 border-t border-slate-50">
                <div className="flex items-center gap-3 text-[9px] font-bold text-slate-500 uppercase tracking-[0.4em]">
                    <Activity size={12} /> Node: QT-HIST-LE-09
                </div>
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Data Synchronization active</p>
            </footer>
        </div>
    );
}