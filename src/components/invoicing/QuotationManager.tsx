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
        <div className="flex flex-col items-center justify-center min-h-screen bg-white gap-6">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Accessing Record Ledger</p>
        </div>
    );

    return (
        <ScrollArea className="h-screen bg-[#F8FAFC]">
            <div className="max-w-[1500px] mx-auto py-12 px-8 space-y-12 animate-in fade-in duration-700">
                
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                    <div className="space-y-4">
                        <button 
                            onClick={() => router.back()}
                            className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-blue-600 transition-colors"
                        >
                            <ArrowLeft size={14} /> Back to Dashboard
                        </button>
                        
                        <div className="flex items-center gap-6">
                            <div className="p-4 bg-slate-900 rounded-3xl text-white shadow-2xl shadow-slate-900/20">
                                <FileText size={32} />
                            </div>
                            <div className="space-y-1">
                                <div className="flex items-center gap-3">
                                    <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Quotation History</h1>
                                    <Badge variant="outline" className="rounded-full px-4 py-1 border-blue-100 bg-blue-50 text-blue-600 font-black text-[9px] uppercase tracking-widest">
                                        Record Ledger
                                    </Badge>
                                </div>
                                <p className="text-sm font-semibold text-slate-500 max-w-xl leading-relaxed">
                                    Review historical estimates, track approval workflows, and manage fiscal document conversions.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="hidden lg:flex items-center gap-4 bg-white border border-slate-100 p-6 rounded-3xl shadow-sm">
                            <div className="p-2 bg-emerald-50 text-emerald-500 rounded-xl">
                                <ShieldCheck size={20} />
                            </div>
                            <div className="space-y-0.5">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Account Verified</p>
                                <p className="text-sm font-black text-slate-800">Operational Node</p>
                            </div>
                        </div>

                        <Button 
                            onClick={() => router.push('/invoicing/estimates/new')}
                            className="bg-blue-600 hover:bg-blue-700 h-16 px-10 rounded-[2rem] shadow-2xl shadow-blue-200 font-black text-sm uppercase tracking-widest gap-3 transition-all active:scale-95"
                        >
                            <Plus size={20} /> New Quotation
                        </Button>
                    </div>
                </div>

                <div className="space-y-8 pb-20">
                    <div className="flex flex-col md:flex-row gap-4 bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 items-center justify-between">
                        <div className="flex flex-1 gap-4 w-full">
                            <div className="relative flex-1 max-w-md">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input 
                                    placeholder="Search by client or reference ID..." 
                                    value={search} 
                                    onChange={e => setSearch(e.target.value)} 
                                    className="pl-12 h-14 bg-slate-50/50 border-none rounded-2xl font-bold text-sm focus-visible:ring-4 focus-visible:ring-blue-500/10"
                                />
                            </div>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-64 h-14 bg-slate-50/50 border-none rounded-2xl font-black text-[11px] uppercase tracking-widest">
                                    <SelectValue placeholder="Lifecycle Filter" />
                                </SelectTrigger>
                                <SelectContent className="rounded-2xl border-none shadow-2xl">
                                    <SelectItem value="ALL" className="font-bold py-3">ALL TRANSACTIONS</SelectItem>
                                    <SelectItem value="PENDING" className="font-bold py-3">PENDING REVIEW</SelectItem>
                                    <SelectItem value="APPROVED" className="font-bold py-3 text-emerald-600">VERIFIED QUOTES</SelectItem>
                                    <SelectItem value="ACCEPTED" className="font-bold py-3 text-blue-600">FISCALIZED INVOICES</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        
                        <div className="flex items-center gap-4 px-8 border-l border-slate-100">
                            <div className="text-right">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Queue Status</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-base font-black text-slate-900">{filteredQuotes?.length || 0}</span>
                                    <Activity size={14} className="text-blue-500" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <Card className="rounded-[3rem] border-none shadow-2xl shadow-slate-200/40 overflow-hidden bg-white">
                        <ScrollArea className="w-full">
                            <Table>
                                <TableHeader className="bg-slate-50/50 border-b border-slate-50">
                                    <TableRow className="hover:bg-transparent h-16">
                                        <TableHead className="w-[200px] pl-10 font-black text-[10px] uppercase text-slate-400 tracking-[0.2em]">Reference</TableHead>
                                        <TableHead className="font-black text-[10px] uppercase text-slate-400 tracking-[0.2em]">Counterparty</TableHead>
                                        <TableHead className="text-right font-black text-[10px] uppercase text-slate-400 tracking-[0.2em]">Valuation</TableHead>
                                        <TableHead className="text-center font-black text-[10px] uppercase text-slate-400 tracking-[0.2em]">Status</TableHead>
                                        <TableHead className="text-right pr-10 font-black text-[10px] uppercase text-slate-400 tracking-[0.2em]">Operations</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredQuotes?.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-64 text-center">
                                                <div className="flex flex-col items-center gap-3 opacity-30">
                                                    <FileText size={48} className="text-slate-300" />
                                                    <p className="font-black text-[10px] uppercase tracking-[0.3em]">Zero Records in Ledger</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : filteredQuotes?.map((q: any) => (
                                        <TableRow key={q.id} className="group hover:bg-slate-50/50 transition-all border-b-slate-50">
                                            <TableCell className="pl-10 py-7">
                                                <div className="font-black text-blue-600 text-sm tracking-tighter">{q.estimate_uid}</div>
                                                <div className="text-[10px] font-black text-slate-400 uppercase mt-1.5 flex items-center gap-2">
                                                    <Settings2 size={10} /> Logged: {format(new Date(q.created_at), 'dd MMM, yyyy')}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-bold text-slate-800 text-sm">{q.client_name}</div>
                                                <div className="text-[11px] text-slate-400 font-medium mt-1 truncate max-w-xs">{q.title}</div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="font-black text-slate-900 text-base tabular-nums">${q.total_amount.toLocaleString()}</div>
                                                <div className="text-[9px] font-black text-blue-500/50 uppercase mt-1">{q.currency_code} Net Value</div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge className={`rounded-xl px-4 py-1.5 font-black text-[9px] uppercase tracking-widest shadow-sm border-none ${
                                                    q.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                                                    q.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' :
                                                    q.status === 'ACCEPTED' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'
                                                }`}>
                                                    {q.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right pr-10">
                                                <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {q.status === 'PENDING' && (
                                                        <Button 
                                                            size="sm" 
                                                            onClick={() => updateStatus.mutate({ id: q.id, status: 'APPROVED' })} 
                                                            className="h-10 bg-emerald-600 hover:bg-emerald-700 rounded-xl font-black text-[10px] uppercase tracking-widest px-6"
                                                        >
                                                            Verify
                                                        </Button>
                                                    )}
                                                    {q.status === 'APPROVED' && (
                                                        <Button 
                                                            size="sm" 
                                                            onClick={() => convertToInvoice.mutate(q.id)} 
                                                            className="h-10 bg-blue-600 hover:bg-blue-700 rounded-xl font-black text-[10px] uppercase tracking-widest px-6 gap-2"
                                                        >
                                                            <ArrowRightLeft size={14}/> Fiscalize
                                                        </Button>
                                                    )}
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        onClick={() => printQuotation(q)} 
                                                        className="h-10 w-10 hover:bg-white hover:shadow-lg text-slate-300 hover:text-blue-600 rounded-xl transition-all"
                                                    >
                                                        <Printer size={18} />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            <ScrollBar orientation="horizontal" />
                        </ScrollArea>
                    </Card>
                </div>
            </div>

            <footer className="pb-12 text-center opacity-30">
                <div className="flex items-center justify-center gap-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.5em]">
                    <Activity size={14} /> System Node: QT-HIST-LE-09
                </div>
            </footer>
            <ScrollBar orientation="vertical" />
        </ScrollArea>
    );
}