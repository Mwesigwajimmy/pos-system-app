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
    Filter, ChevronRight, FileText, Download, TrendingUp, ShieldAlert, AlertTriangle
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

    // --- 1. DATA FETCHING (Logic Intact) ---
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

    // --- 2. LIFECYCLE MUTATIONS (Logic Intact) ---
    const updateStatus = useMutation({
        mutationFn: async ({ id, status }: { id: string, status: string }) => {
            const { error } = await supabase.from('estimates').update({ status }).eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success("Quotation status updated successfully");
            queryClient.invalidateQueries({ queryKey: ['commercial_quotes'] });
        },
        onError: (err: any) => toast.error(err.message)
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
            toast.success(`Converted to Invoice #${invId}`);
            queryClient.invalidateQueries({ queryKey: ['commercial_quotes'] });
        },
        onError: (err: any) => toast.error(err.message)
    });

    // --- 3. FILTERING LOGIC (Logic Intact) ---
    const filteredQuotes = useMemo(() => {
        return quotes?.filter(q => {
            const matchesSearch = q.client_name?.toLowerCase().includes(search.toLowerCase()) || q.estimate_uid.toLowerCase().includes(search.toLowerCase());
            const matchesStatus = statusFilter === 'ALL' || q.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [quotes, search, statusFilter]);

    // --- 4. PRINT/PDF LOGIC (Logic Intact) ---
    const printQuotation = (q: any) => {
        const doc = new jsPDF('p', 'mm', 'a4');
        doc.setFontSize(22); doc.setFont("helvetica", "bold");
        doc.text("QUOTATION", 14, 25);
        
        doc.setFontSize(10); doc.setFont("helvetica", "normal");
        doc.text(`Reference: ${q.estimate_uid}`, 14, 32);
        doc.text(`Date: ${format(new Date(q.created_at), 'PPP')}`, 14, 37);
        
        doc.setFont("helvetica", "bold");
        doc.text(`CLIENT: ${q.client_name}`, 14, 50);

        autoTable(doc, {
            startY: 60,
            head: [['Description', 'Area', 'Qty', 'Rate', 'Total']],
            body: q.items.map((i: any) => [
                i.description, i.application_area || 'N/A', i.quantity, i.unit_price.toLocaleString(), i.total.toLocaleString()
            ]),
            headStyles: { fillColor: [37, 87, 214] },
            foot: [[{ content: 'TOTAL AMOUNT', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold' } }, { content: `${q.total_amount.toLocaleString()} ${q.currency_code}`, styles: { fontStyle: 'bold' } }]]
        });

        doc.save(`Quotation_${q.estimate_uid}.pdf`);
    };

    if (isLoading) return (
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
            <p className="text-sm font-medium text-slate-500 uppercase tracking-widest">Loading records...</p>
        </div>
    );

    return (
        <div className="max-w-[1400px] mx-auto py-8 px-6 space-y-6 animate-in fade-in duration-500">
            
            {/* SEARCH & FILTERS */}
            <div className="flex flex-col lg:flex-row justify-between items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="flex items-center gap-4 w-full lg:w-auto">
                    <div className="relative flex-1 lg:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input 
                            placeholder="Search by client or ID..." 
                            value={search} 
                            onChange={e => setSearch(e.target.value)} 
                            className="h-10 pl-10 rounded-lg border-slate-200 text-sm focus:ring-blue-500/10 focus:border-blue-500"
                        />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="h-10 w-48 rounded-lg border-slate-200 bg-white text-sm font-medium">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">All Records</SelectItem>
                            <SelectItem value="PENDING">Pending Approval</SelectItem>
                            <SelectItem value="APPROVED">Approved</SelectItem>
                            <SelectItem value="ACCEPTED">Accepted / Invoiced</SelectItem>
                            <SelectItem value="REJECTED">Rejected</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Total Estimates: {quotes?.length || 0}
                    </span>
                </div>
            </div>

            {/* MAIN DATA CARD */}
            <Card className="border border-slate-200 shadow-sm rounded-xl overflow-hidden bg-white">
                <CardHeader className="bg-white border-b border-slate-100 p-8">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 text-blue-600">
                                <FileText size={24} />
                            </div>
                            <div>
                                <CardTitle className="text-xl font-bold tracking-tight text-slate-900">Quotations</CardTitle>
                                <p className="text-xs text-slate-500 mt-1 font-medium">Review and manage client estimates and conversions.</p>
                            </div>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="p-0">
                    <ScrollArea className="h-[600px]">
                        <Table>
                            <TableHeader className="bg-slate-50 sticky top-0 z-10 border-b">
                                <TableRow>
                                    <TableHead className="pl-8 h-12 text-[10px] font-bold uppercase text-slate-500 tracking-wider">Reference</TableHead>
                                    <TableHead className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Client Name</TableHead>
                                    <TableHead className="text-[10px] font-bold uppercase text-slate-500 tracking-wider text-right">Amount</TableHead>
                                    <TableHead className="text-[10px] font-bold uppercase text-slate-500 tracking-wider text-center">Status</TableHead>
                                    <TableHead className="text-[10px] font-bold uppercase text-slate-500 tracking-wider text-right pr-8">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredQuotes?.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-40 text-center text-slate-400 text-sm">No records found matching your criteria.</TableCell>
                                    </TableRow>
                                ) : filteredQuotes?.map((q: any) => (
                                    <TableRow key={q.id} className="hover:bg-slate-50 transition-colors border-b border-slate-100">
                                        <TableCell className="pl-8 py-4">
                                            <div className="text-sm font-bold text-blue-600">{q.estimate_uid}</div>
                                            <div className="text-[10px] font-medium text-slate-400 mt-1 uppercase">
                                                {format(new Date(q.created_at), 'dd MMM yyyy')}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm font-bold text-slate-800">{q.client_name}</div>
                                            <div className="text-[10px] text-slate-400 mt-1 truncate max-w-[250px]">{q.title}</div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="text-sm font-bold text-slate-900">
                                                {q.total_amount.toLocaleString()}
                                            </div>
                                            <div className="text-[10px] font-bold text-slate-400 uppercase">{q.currency_code}</div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant="secondary" className={`font-bold px-3 py-1 rounded-full text-[9px] uppercase tracking-wider ${
                                                q.status === 'PENDING' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                                q.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                                q.status === 'ACCEPTED' ? 'bg-blue-600 text-white border-transparent' :
                                                'bg-slate-100 text-slate-500 border-slate-200'
                                            }`}>
                                                {q.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right pr-8">
                                            <div className="flex justify-end gap-2 items-center">
                                                
                                                {q.status === 'PENDING' && (
                                                    <div className="flex gap-2">
                                                        <Button 
                                                            size="sm" 
                                                            onClick={() => updateStatus.mutate({ id: q.id, status: 'APPROVED' })}
                                                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold h-8 px-4"
                                                        >
                                                            Approve
                                                        </Button>
                                                        <Button 
                                                            variant="ghost" 
                                                            size="sm" 
                                                            onClick={() => updateStatus.mutate({ id: q.id, status: 'REJECTED' })}
                                                            className="text-slate-400 hover:text-red-500 text-[10px] font-bold h-8"
                                                        >
                                                            Reject
                                                        </Button>
                                                    </div>
                                                )}

                                                {q.status === 'APPROVED' && (
                                                    <Button 
                                                        onClick={() => convertToInvoice.mutate(q.id)}
                                                        disabled={convertToInvoice.isPending}
                                                        className="bg-[#2557D6] hover:bg-[#1e44a8] text-white font-bold text-[10px] h-9 px-4 rounded-lg flex gap-2"
                                                    >
                                                        {convertToInvoice.isPending ? <Loader2 className="animate-spin h-3 w-3"/> : <ArrowRightLeft size={14}/>} 
                                                        Generate Invoice
                                                    </Button>
                                                )}

                                                {q.status === 'ACCEPTED' && (
                                                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 mr-2">
                                                        <CheckCircle2 size={14} className="text-emerald-500" />
                                                        Processed
                                                    </div>
                                                )}

                                                <Button 
                                                    variant="outline" 
                                                    size="icon" 
                                                    onClick={() => printQuotation(q)}
                                                    className="h-8 w-8 rounded-lg border-slate-200 hover:bg-slate-50"
                                                >
                                                    <Printer size={16} className="text-slate-400" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </CardContent>
                
                <CardFooter className="bg-slate-50 p-6 border-t flex justify-between items-center text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                    Standard Business Audit Policy • QT-2026
                    <div className="flex gap-2 items-center text-slate-500">
                         <div className="h-2 w-2 rounded-full bg-emerald-500" /> 
                         System Online
                    </div>
                </CardFooter>
            </Card>

            {/* POLICY INFO */}
            <div className="p-6 bg-blue-50 border border-blue-100 rounded-xl flex items-start gap-4">
                <AlertTriangle size={20} className="text-blue-600 shrink-0" />
                <div className="space-y-1">
                    <h4 className="text-sm font-bold text-blue-900">Quotation Policy</h4>
                    <p className="text-xs text-blue-700 leading-relaxed font-medium">
                        Quotations are preliminary records. Upon transitioning to 'ACCEPTED' status and generating a tax invoice, the document becomes legally binding. Subsequent modifications to invoiced amounts require a formal Credit Note for audit compliance.
                    </p>
                </div>
            </div>
        </div>
    );
}