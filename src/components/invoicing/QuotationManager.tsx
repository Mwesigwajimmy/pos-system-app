'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
    FileDigit, CheckCircle2, Search, Loader2, Printer, 
    FileText, Plus, Trash2, Calculator, Info, Settings2,
    ArrowRightLeft, AlertTriangle, ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const supabase = createClient();

export default function QuotationManager() {
    const queryClient = useQueryClient();
    const [view, setView] = useState<'LIST' | 'CREATE'>('LIST');
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');

    const [lineItems, setLineItems] = useState([{ 
        id: Date.now(), product: '', description: '', qty: 1, price: 0, discount: 0, tax: 0 
    }]);
    const [meta, setMeta] = useState({ adjustment: 0, terms: '', internal_info: '' });

    const { data: quotes, isLoading } = useQuery({
        queryKey: ['commercial_quotes'],
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
            toast.success("Operational status updated");
            queryClient.invalidateQueries({ queryKey: ['commercial_quotes'] });
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
            toast.success(`Fiscal Invoice Generated: #${invId}`);
            queryClient.invalidateQueries({ queryKey: ['commercial_quotes'] });
        }
    });

    const filteredQuotes = useMemo(() => {
        return quotes?.filter(q => {
            const matchesSearch = q.client_name?.toLowerCase().includes(search.toLowerCase()) || q.estimate_uid.toLowerCase().includes(search.toLowerCase());
            const matchesStatus = statusFilter === 'ALL' || q.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [quotes, search, statusFilter]);

    const totals = useMemo(() => {
        const subTotal = lineItems.reduce((acc, item) => acc + (item.qty * item.price), 0);
        const totalDiscount = lineItems.reduce((acc, item) => acc + item.discount, 0);
        const totalTax = lineItems.reduce((acc, item) => acc + item.tax, 0);
        const grandTotal = (subTotal - totalDiscount + totalTax) + Number(meta.adjustment);
        return { subTotal, totalDiscount, totalTax, grandTotal };
    }, [lineItems, meta.adjustment]);

    const addRow = () => setLineItems([...lineItems, { id: Date.now(), product: '', description: '', qty: 1, price: 0, discount: 0, tax: 0 }]);
    const removeRow = (id: number) => setLineItems(lineItems.filter(i => i.id !== id));

    const printQuotation = (q: any) => {
        const doc = new jsPDF('p', 'mm', 'a4');
        doc.setFontSize(22); doc.setFont("helvetica", "bold");
        doc.text("COMMERCIAL QUOTATION", 14, 25);
        doc.setFontSize(10); doc.setFont("helvetica", "normal");
        doc.text(`ID: ${q.estimate_uid} | Date: ${format(new Date(q.created_at), 'PPP')}`, 14, 32);
        autoTable(doc, {
            startY: 50,
            head: [['Item', 'Qty', 'Rate', 'Discount', 'Tax', 'Total']],
            body: q.items.map((i: any) => [i.description, i.quantity, i.unit_price, i.discount || 0, i.tax || 0, i.total]),
            headStyles: { fillColor: [30, 41, 59] }
        });
        doc.save(`Quote_${q.estimate_uid}.pdf`);
    };

    if (isLoading) return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest italic">Synchronizing Fiscal Records...</p>
        </div>
    );

    return (
        <ScrollArea className="h-screen bg-[#F8FAFC]">
            <div className="max-w-[1500px] mx-auto py-10 px-8 space-y-8">
                
                <div className="flex justify-between items-end">
                    <div className="space-y-1">
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Financial Quotations</h1>
                        <p className="text-slate-500 font-medium">Manage and generate professional client estimates</p>
                    </div>
                    <div className="flex gap-3">
                        {view === 'LIST' ? (
                            <Button onClick={() => setView('CREATE')} className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 px-6 py-6 rounded-xl font-bold gap-2">
                                <Plus size={20} /> Create New Quote
                            </Button>
                        ) : (
                            <Button variant="outline" onClick={() => setView('LIST')} className="border-slate-200 px-6 py-6 rounded-xl font-bold">
                                Back to Repository
                            </Button>
                        )}
                    </div>
                </div>

                {view === 'LIST' && (
                    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                        <div className="flex flex-col md:flex-row gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 items-center justify-between">
                            <div className="flex flex-1 gap-4 w-full">
                                <div className="relative flex-1 max-w-md">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <Input 
                                        placeholder="Search by client or reference number..." 
                                        value={search} 
                                        onChange={e => setSearch(e.target.value)} 
                                        className="pl-10 h-12 bg-slate-50 border-none focus-visible:ring-2 focus-visible:ring-blue-500/20"
                                    />
                                </div>
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger className="w-56 h-12 bg-slate-50 border-none font-semibold">
                                        <SelectValue placeholder="Status Filter" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ALL">All Transactions</SelectItem>
                                        <SelectItem value="PENDING">Pending Review</SelectItem>
                                        <SelectItem value="APPROVED">Verified</SelectItem>
                                        <SelectItem value="ACCEPTED">Invoiced</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex gap-8 px-6 border-l border-slate-100">
                                <div className="text-center">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Total Volume</p>
                                    <p className="text-xl font-black text-slate-900">{quotes?.length || 0}</p>
                                </div>
                            </div>
                        </div>

                        <Card className="rounded-2xl border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
                            <Table>
                                <TableHeader className="bg-slate-50/50">
                                    <TableRow className="hover:bg-transparent border-b-slate-100">
                                        <TableHead className="w-[180px] py-6 pl-8 font-bold text-slate-500 uppercase text-[11px] tracking-wider">Ref ID</TableHead>
                                        <TableHead className="font-bold text-slate-500 uppercase text-[11px] tracking-wider">Client / Title</TableHead>
                                        <TableHead className="text-right font-bold text-slate-500 uppercase text-[11px] tracking-wider">Valuation</TableHead>
                                        <TableHead className="text-center font-bold text-slate-500 uppercase text-[11px] tracking-wider">Status</TableHead>
                                        <TableHead className="text-right pr-8 font-bold text-slate-500 uppercase text-[11px] tracking-wider">Operations</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredQuotes?.map((q: any) => (
                                        <TableRow key={q.id} className="group hover:bg-slate-50/50 transition-all border-b-slate-50">
                                            <TableCell className="pl-8 py-5">
                                                <div className="font-black text-blue-600 text-sm">{q.estimate_uid}</div>
                                                <div className="text-[10px] font-bold text-slate-400 flex items-center gap-1 mt-1">
                                                    <Settings2 size={10} /> {format(new Date(q.created_at), 'dd MMM, yyyy')}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-bold text-slate-800">{q.client_name}</div>
                                                <div className="text-[11px] text-slate-400 font-medium mt-0.5 line-clamp-1">{q.title}</div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="font-black text-slate-900">${q.total_amount.toLocaleString()}</div>
                                                <div className="text-[9px] font-black text-blue-500/60 uppercase">{q.currency_code}</div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant="outline" className={`rounded-lg px-3 py-1 font-bold text-[10px] uppercase border-2 ${
                                                    q.status === 'PENDING' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                                    q.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                    q.status === 'ACCEPTED' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-slate-50'
                                                }`}>
                                                    {q.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right pr-8">
                                                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {q.status === 'PENDING' && (
                                                        <Button size="sm" onClick={() => updateStatus.mutate({ id: q.id, status: 'APPROVED' })} className="h-8 bg-emerald-600 hover:bg-emerald-700 font-bold text-[10px]">Approve</Button>
                                                    )}
                                                    {q.status === 'APPROVED' && (
                                                        <Button size="sm" onClick={() => convertToInvoice.mutate(q.id)} className="h-8 bg-blue-600 hover:bg-blue-700 font-bold text-[10px] gap-2">
                                                            <ArrowRightLeft size={12}/> Convert
                                                        </Button>
                                                    )}
                                                    <Button variant="ghost" size="icon" onClick={() => printQuotation(q)} className="h-8 w-8 hover:bg-blue-50 text-slate-400 hover:text-blue-600">
                                                        <Printer size={16} />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </Card>
                    </div>
                )}

                {view === 'CREATE' && (
                    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500 pb-20">
                        <div className="flex items-center gap-3 border-l-4 border-red-500 pl-4 py-2">
                            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Quoted Items</h2>
                        </div>

                        <Card className="rounded-2xl border-slate-200 overflow-hidden shadow-2xl shadow-slate-200/40">
                            <Table>
                                <TableHeader className="bg-[#F1F5F9]">
                                    <TableRow className="hover:bg-transparent border-none">
                                        <TableHead className="w-16 text-center font-black text-slate-600 text-[11px]">S.NO</TableHead>
                                        <TableHead className="min-w-[400px] border-l-2 border-red-500/30 font-black text-slate-600 text-[11px]">PRODUCT NAME / DESCRIPTION</TableHead>
                                        <TableHead className="w-24 text-center font-black text-slate-600 text-[11px]">QUANTITY</TableHead>
                                        <TableHead className="w-32 text-right font-black text-slate-600 text-[11px]">LIST PRICE($)</TableHead>
                                        <TableHead className="w-32 text-right font-black text-slate-600 text-[11px]">DISCOUNT($)</TableHead>
                                        <TableHead className="w-32 text-right font-black text-slate-600 text-[11px]">TAX($)</TableHead>
                                        <TableHead className="w-40 text-right font-black text-slate-600 text-[11px]">LINE TOTAL($)</TableHead>
                                        <TableHead className="w-16"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {lineItems.map((item, idx) => (
                                        <TableRow key={item.id} className="hover:bg-white align-top border-b-slate-100">
                                            <TableCell className="text-center pt-6 font-bold text-slate-400">{idx + 1}</TableCell>
                                            <TableCell className="pt-6 space-y-3">
                                                <Input 
                                                    placeholder="Enter Product Name..." 
                                                    className="h-11 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20" 
                                                />
                                                <Textarea 
                                                    placeholder="Service details, specifications, or scope of work..." 
                                                    className="min-h-[100px] resize-none border-slate-200 rounded-lg text-slate-500 placeholder:text-slate-300" 
                                                />
                                            </TableCell>
                                            <TableCell className="pt-6">
                                                <Input 
                                                    type="number" 
                                                    value={item.qty} 
                                                    onChange={e => {
                                                        const newItems = [...lineItems];
                                                        newItems[idx].qty = Number(e.target.value);
                                                        setLineItems(newItems);
                                                    }}
                                                    className="text-center h-11 border-slate-200" 
                                                />
                                            </TableCell>
                                            <TableCell className="pt-6">
                                                <Input 
                                                    type="number" 
                                                    placeholder="0.00"
                                                    onChange={e => {
                                                        const newItems = [...lineItems];
                                                        newItems[idx].price = Number(e.target.value);
                                                        setLineItems(newItems);
                                                    }}
                                                    className="text-right h-11 border-slate-200" 
                                                />
                                            </TableCell>
                                            <TableCell className="pt-6">
                                                <Input type="number" placeholder="0" className="text-right h-11 border-slate-200" />
                                            </TableCell>
                                            <TableCell className="pt-6">
                                                <Input type="number" placeholder="0" className="text-right h-11 border-slate-200" />
                                            </TableCell>
                                            <TableCell className="pt-6 text-right font-black text-slate-700 text-sm">
                                                <div className="h-11 flex items-center justify-end px-3 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                                                    ${(item.qty * item.price).toLocaleString()}
                                                </div>
                                            </TableCell>
                                            <TableCell className="pt-6 text-center">
                                                <Button variant="ghost" size="icon" onClick={() => removeRow(item.id)} className="h-11 w-11 text-slate-300 hover:text-red-500 hover:bg-red-50">
                                                    <Trash2 size={18} />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            <div className="p-6 bg-slate-50/50 border-t border-slate-100">
                                <Button variant="outline" onClick={addRow} className="h-12 border-blue-200 border-2 text-blue-600 hover:bg-blue-50 font-black rounded-xl gap-2">
                                    <Plus size={18} /> Add New Row
                                </Button>
                            </div>
                        </Card>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
                            <div className="space-y-8">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2">
                                        <Info size={16} className="text-blue-500" />
                                        <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider">Terms and Conditions</h3>
                                    </div>
                                    <Textarea 
                                        className="min-h-[120px] rounded-2xl border-slate-200 shadow-inner" 
                                        placeholder="Outline payment terms, validity periods, and delivery timelines..." 
                                    />
                                </div>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2">
                                        <FileDigit size={16} className="text-blue-500" />
                                        <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider">Internal Description</h3>
                                    </div>
                                    <Textarea 
                                        className="min-h-[120px] rounded-2xl border-slate-200 shadow-inner" 
                                        placeholder="Add notes for internal audit or project management..." 
                                    />
                                </div>
                            </div>

                            <div className="lg:pl-20">
                                <Card className="rounded-3xl border-none bg-white shadow-2xl shadow-slate-200/60 p-8 space-y-6">
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center text-slate-500">
                                            <span className="text-sm font-bold uppercase tracking-tight">Sub Total</span>
                                            <span className="font-black text-slate-800">${totals.subTotal.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-slate-500">
                                            <span className="text-sm font-bold uppercase tracking-tight">Total Discount</span>
                                            <span className="font-black text-red-500">-${totals.totalDiscount.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-slate-500">
                                            <span className="text-sm font-bold uppercase tracking-tight">Tax Liability</span>
                                            <span className="font-black text-slate-800">+${totals.totalTax.toLocaleString()}</span>
                                        </div>
                                        <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                                            <span className="text-sm font-bold text-slate-500 uppercase tracking-tight">Adjustment</span>
                                            <Input 
                                                type="number" 
                                                value={meta.adjustment}
                                                onChange={e => setMeta({...meta, adjustment: Number(e.target.value)})}
                                                className="w-32 h-10 border-slate-200 text-right font-black" 
                                            />
                                        </div>
                                    </div>

                                    <div className="pt-8 border-t-2 border-slate-900 flex justify-between items-end">
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Payable Amount</p>
                                            <h4 className="text-4xl font-black text-slate-900 tracking-tighter">
                                                ${totals.grandTotal.toLocaleString()}
                                            </h4>
                                        </div>
                                        <Badge className="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-black uppercase">USD Currency</Badge>
                                    </div>

                                    <Button className="w-full h-16 bg-blue-600 hover:bg-blue-700 rounded-2xl shadow-xl shadow-blue-200 font-black text-lg gap-3">
                                        <CheckCircle2 size={24} /> Finalize & Dispatch Quote
                                    </Button>
                                </Card>
                            </div>
                        </div>

                        <div className="p-8 bg-blue-900 rounded-3xl flex items-center gap-6 shadow-2xl shadow-blue-900/20">
                            <div className="h-16 w-16 rounded-2xl bg-white/10 flex items-center justify-center shrink-0 border border-white/20">
                                <Calculator className="text-white" size={32} />
                            </div>
                            <div className="space-y-1">
                                <h4 className="text-white font-black text-lg">Quotation Compliance Policy</h4>
                                <p className="text-blue-100/70 text-sm leading-relaxed font-medium">
                                    All quotes are legally non-binding until converted to a Tax Invoice. Ensure all adjustments and taxes comply with regional fiscal regulations before finalization.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </ScrollArea>
    );
}