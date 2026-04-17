'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
    FileDigit, CheckCircle2, XCircle, ArrowRightLeft, 
    Search, Loader2, Calendar, ShieldCheck, Printer, Clock,
    Filter, ChevronRight, FileText, Download, TrendingUp, AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const supabase = createClient();

export default function QuotationManager() {
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');

    // --- 1. DATA FETCHING: Master Quotation Ledger ---
    const { data: quotes, isLoading } = useQuery({
        queryKey: ['commercial_quotes'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('estimates')
                .select(`
                    *,
                    items:estimate_line_items(*)
                `)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data;
        }
    });

    // --- 2. LIFECYCLE MUTATIONS ---
    
    // Mutation to Approve or Reject a Quote
    const updateStatus = useMutation({
        mutationFn: async ({ id, status }: { id: string, status: string }) => {
            const { error } = await supabase.from('estimates').update({ status }).eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success("Commercial Protocol Status Updated");
            queryClient.invalidateQueries({ queryKey: ['commercial_quotes'] });
        },
        onError: (err: any) => toast.error(err.message)
    });

    // Mutation to trigger the Fiscalization RPC (Quote -> Invoice)
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
            toast.success(`Conversion Successful: Invoice #${invId} generated.`);
            queryClient.invalidateQueries({ queryKey: ['commercial_quotes'] });
        },
        onError: (err: any) => toast.error(err.message)
    });

    // --- 3. FILTERING LOGIC ---
    const filteredQuotes = useMemo(() => {
        return quotes?.filter(q => {
            const matchesSearch = q.client_name?.toLowerCase().includes(search.toLowerCase()) || q.estimate_uid.toLowerCase().includes(search.toLowerCase());
            const matchesStatus = statusFilter === 'ALL' || q.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [quotes, search, statusFilter]);

    // --- 4. PRINT/PDF LOGIC (Branded for Headed Paper) ---
    const printQuotation = (q: any) => {
        const doc = new jsPDF('p', 'mm', 'a4');
        doc.setFontSize(22); doc.setFont("helvetica", "bold");
        doc.text("COMMERCIAL QUOTATION", 14, 25);
        
        doc.setFontSize(10); doc.setFont("helvetica", "normal");
        doc.text(`Ref: ${q.estimate_uid}`, 14, 32);
        doc.text(`Date: ${format(new Date(q.created_at), 'PPP')}`, 14, 37);
        
        doc.setFont("helvetica", "bold");
        doc.text(`CLIENT: ${q.client_name}`, 14, 50);

        autoTable(doc, {
            startY: 60,
            head: [['Description', 'Area', 'Qty', 'Rate', 'Total']],
            body: q.items.map((i: any) => [
                i.description, i.application_area || 'N/A', i.quantity, i.unit_price.toLocaleString(), i.total.toLocaleString()
            ]),
            headStyles: { fillColor: [15, 23, 42] },
            foot: [[{ content: 'TOTAL VALUE', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold' } }, { content: `${q.total_amount.toLocaleString()} ${q.currency_code}`, styles: { fontStyle: 'bold' } }]]
        });

        doc.save(`Quote_${q.estimate_uid}.pdf`);
    };

    if (isLoading) return (
        <div className="p-20 text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
            <p className="font-black text-slate-400 uppercase tracking-[0.3em]">Synchronizing Quotation Ledger...</p>
        </div>
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            
            {/* SEARCH & GLOBAL FILTERS */}
            <div className="flex flex-col lg:flex-row justify-between items-center gap-6 bg-white p-6 rounded-[2.5rem] shadow-xl border border-slate-100">
                <div className="flex items-center gap-4 w-full lg:w-auto">
                    <div className="relative flex-1 lg:w-96">
                        <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
                        <Input 
                            placeholder="Filter by Client or Protocol ID..." 
                            value={search} 
                            onChange={e => setSearch(e.target.value)} 
                            className="h-12 pl-12 rounded-2xl border-slate-200 font-bold focus:ring-4 focus:ring-blue-50 transition-all"
                        />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="h-12 w-52 rounded-2xl font-black bg-slate-50 border-none shadow-inner">
                            <SelectValue placeholder="Lifecycle Status" />
                        </SelectTrigger>
                        <SelectContent className="font-bold">
                            <SelectItem value="ALL">All Protocols</SelectItem>
                            <SelectItem value="PENDING" className="text-orange-500">PENDING REVIEW</SelectItem>
                            <SelectItem value="APPROVED" className="text-emerald-600">APPROVED</SelectItem>
                            <SelectItem value="ACCEPTED" className="text-blue-600">ACCEPTED / FISCALIZED</SelectItem>
                            <SelectItem value="REJECTED" className="text-red-500">REJECTED</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex items-center gap-3">
                    <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-100 font-black px-5 py-2 uppercase tracking-widest text-[10px]">
                        Active Spec-Pipeline: {quotes?.length || 0}
                    </Badge>
                </div>
            </div>

            {/* MASTER DATA TABLE */}
            <Card className="border-none shadow-[0_50px_100px_-20px_rgba(0,0,0,0.15)] rounded-[3.5rem] overflow-hidden bg-white">
                <CardHeader className="bg-slate-900 text-white p-10 border-b border-white/5 relative">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        <FileText size={120} />
                    </div>
                    <div className="flex justify-between items-center relative z-10">
                        <div className="flex items-center gap-6">
                            <div className="p-5 bg-white/10 rounded-3xl backdrop-blur-md border border-white/10 transform rotate-3">
                                <FileDigit size={36} className="text-blue-400" />
                            </div>
                            <div>
                                <CardTitle className="text-3xl font-black uppercase tracking-tight">Quotation Ledger</CardTitle>
                                <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.4em] mt-2 italic">Official Commercial Protocol Node</p>
                            </div>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="p-0">
                    <ScrollArea className="h-[650px]">
                        <Table>
                            <TableHeader className="bg-slate-50 sticky top-0 z-10 border-b">
                                <TableRow>
                                    <TableHead className="pl-10 h-20 text-[11px] font-black uppercase text-slate-400 tracking-widest">Reference & Date</TableHead>
                                    <TableHead className="text-[11px] font-black uppercase text-slate-400 tracking-widest">Client Identity</TableHead>
                                    <TableHead className="text-[11px] font-black uppercase text-slate-400 tracking-widest text-right">Value</TableHead>
                                    <TableHead className="text-[11px] font-black uppercase text-slate-400 tracking-widest text-center">Status</TableHead>
                                    <TableHead className="text-[11px] font-black uppercase text-slate-400 tracking-widest text-right pr-10">Audit Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredQuotes?.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-64 text-center text-slate-300 italic">No matching commercial protocols found.</TableCell>
                                    </TableRow>
                                ) : filteredQuotes?.map((q: any) => (
                                    <TableRow key={q.id} className="hover:bg-blue-50/40 transition-all border-b border-slate-50 group">
                                        <TableCell className="pl-10 py-8">
                                            <div className="font-mono text-blue-600 font-black text-xl tracking-tighter">{q.estimate_uid}</div>
                                            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 mt-2 uppercase">
                                                <Calendar size={12}/> {format(new Date(q.created_at), 'PPP')}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-black text-slate-800 text-2xl tracking-tighter uppercase">{q.client_name}</div>
                                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 truncate max-w-[300px]">{q.title}</div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="font-black text-slate-900 text-3xl tabular-nums tracking-tighter">
                                                {q.total_amount.toLocaleString()}
                                            </div>
                                            <Badge variant="outline" className="bg-white border-slate-200 font-black text-[10px] mt-2 py-1 px-3 uppercase text-blue-600">{q.currency_code}</Badge>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge className={`font-black px-6 py-2.5 rounded-2xl text-[10px] tracking-[0.2em] shadow-sm ${
                                                q.status === 'PENDING' ? 'bg-orange-100 text-orange-600' :
                                                q.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' :
                                                q.status === 'ACCEPTED' ? 'bg-blue-600 text-white shadow-xl' :
                                                'bg-slate-100 text-slate-500'
                                            }`}>
                                                {q.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right pr-10">
                                            <div className="flex justify-end gap-3 items-center">
                                                
                                                {/* CONDITIONAL ACTION PROTOCOLS */}
                                                {q.status === 'PENDING' && (
                                                    <div className="flex gap-2 animate-in slide-in-from-right duration-500">
                                                        <Button 
                                                            size="sm" 
                                                            onClick={() => updateStatus.mutate({ id: q.id, status: 'APPROVED' })}
                                                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] h-10 px-6 rounded-xl shadow-lg shadow-emerald-600/20"
                                                        >
                                                            <CheckCircle2 size={16} className="mr-2"/> APPROVE
                                                        </Button>
                                                        <Button 
                                                            variant="ghost" 
                                                            size="sm" 
                                                            onClick={() => updateStatus.mutate({ id: q.id, status: 'REJECTED' })}
                                                            className="text-slate-400 hover:text-red-500 font-black text-[10px] h-10"
                                                        >
                                                            <XCircle size={16} className="mr-2"/> REJECT
                                                        </Button>
                                                    </div>
                                                )}

                                                {q.status === 'APPROVED' && (
                                                    <Button 
                                                        onClick={() => convertToInvoice.mutate(q.id)}
                                                        disabled={convertToInvoice.isPending}
                                                        className="bg-blue-600 hover:bg-slate-900 shadow-[0_15px_30px_rgba(37,99,235,0.3)] font-black text-[11px] h-12 px-10 gap-3 rounded-[1.25rem] animate-in zoom-in duration-300"
                                                    >
                                                        {convertToInvoice.isPending ? <Loader2 className="animate-spin h-4 w-4"/> : <ArrowRightLeft size={18}/>} 
                                                        FISCALIZE TO INVOICE
                                                    </Button>
                                                )}

                                                {q.status === 'ACCEPTED' && (
                                                    <Badge className="bg-slate-900 text-emerald-400 border-none font-black h-12 px-10 rounded-2xl flex items-center gap-3 shadow-inner">
                                                        FISCAL RECORD SEALED <ShieldCheck size={18} />
                                                    </Badge>
                                                )}

                                                <Button 
                                                    variant="outline" 
                                                    size="icon" 
                                                    onClick={() => printQuotation(q)}
                                                    className="h-12 w-12 rounded-2xl border-slate-200 hover:bg-slate-50 shadow-sm transition-colors"
                                                >
                                                    <Printer size={20} className="text-slate-400" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </CardContent>
                
                <CardFooter className="bg-slate-50 p-10 border-t flex justify-between items-center font-black text-slate-400 text-[11px] tracking-[0.4em] uppercase">
                    BBU1 Sovereign Financial Protocol • Audit Key: QT-MASTER-2026
                    <div className="flex gap-3 items-center bg-white px-6 py-2.5 rounded-full shadow-sm border border-slate-200">
                         <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"/> 
                         <span className="text-emerald-600 tracking-tighter">Neural Lifecycle Engine Active</span>
                    </div>
                </CardFooter>
            </Card>

            {/* PROTOCOL COMPLIANCE WARNING */}
            <div className="p-10 bg-indigo-50 border-2 border-indigo-100 rounded-[3.5rem] flex items-start gap-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-10 opacity-5 rotate-12">
                    <TrendingUp size={180} />
                </div>
                <ShieldAlert size={48} className="text-indigo-600 shrink-0 mt-2" />
                <div className="space-y-3 z-10">
                    <h4 className="font-black text-indigo-900 uppercase text-lg tracking-widest italic">Operational Compliance Protocol</h4>
                    <p className="text-sm text-indigo-800/70 font-bold leading-relaxed max-w-5xl">
                        Quotations are pre-fiscal documents. Once a quotation status transitions to 'ACCEPTED' via the Fiscalization Node, the document is locked and the values are protocolized into the Multi-Tax Ledger. Any subsequent adjustments require a formal Credit Note via the Compliance Bridge.
                    </p>
                </div>
            </div>
        </div>
    );
}