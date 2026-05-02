'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
    Gavel, CheckCircle2, ArrowRightLeft, 
    Search, Loader2, ShieldCheck, Printer, 
    Wallet, Send, ChevronRight, FileText,
    Activity, Filter
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const supabase = createClient();

export default function QuotationExecutionCenter() {
    const queryClient = useQueryClient();
    const [selectedQuote, setSelectedQuote] = useState<any>(null);
    const [payMethod, setPayMethod] = useState('NONE');

    const { data: quotes, isLoading } = useQuery({
        queryKey: ['pending_quotes'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('estimates')
                .select('*, items:estimate_line_items(*)')
                .not('status', 'eq', 'ACCEPTED') 
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data;
        }
    });

    const executeFiscalization = useMutation({
        mutationFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            const { data, error } = await supabase.rpc('proc_fiscalize_quotation_v2', {
                p_estimate_id: selectedQuote.id,
                p_user_id: user?.id,
                p_payment_method: payMethod
            });
            if (error) throw error;
            return data;
        },
        onSuccess: (invId) => {
            toast.success(`Operational Success: Invoice #${invId} generated.`);
            setSelectedQuote(null);
            queryClient.invalidateQueries({ queryKey: ['pending_quotes'] });
        },
        onError: (err: any) => toast.error(`System Alert: ${err.message}`)
    });

    if (isLoading) return (
        <div className="flex flex-col items-center justify-center min-h-[500px] gap-6">
            <div className="relative flex items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
                <Activity className="absolute h-5 w-5 text-blue-400" />
            </div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">Synchronizing Fiscal Data</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50/50 pb-12">
            <div className="max-w-[1400px] mx-auto py-10 px-6 space-y-8 animate-in fade-in duration-700">
                
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-widest">
                            <Activity size={14} /> Operational Fulfillment
                        </div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Quotation Execution</h1>
                        <p className="text-sm font-medium text-slate-500">Authorize and transition verified quotations into fiscal tax invoices.</p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <Button variant="outline" className="bg-white border-slate-200 text-slate-600 font-bold text-xs h-11 px-5 rounded-xl shadow-sm">
                            <Filter size={16} className="mr-2" /> Filter Records
                        </Button>
                        <div className="h-11 px-5 bg-white border border-slate-200 rounded-xl flex items-center gap-3 shadow-sm">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Queue Volume</span>
                            <span className="text-sm font-black text-blue-600">{quotes?.length || 0}</span>
                        </div>
                    </div>
                </header>

                <Card className="border-slate-200 shadow-xl shadow-slate-200/40 rounded-2xl overflow-hidden bg-white">
                    <CardHeader className="bg-white border-b border-slate-100 px-8 py-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
                                <Gavel size={24} />
                            </div>
                            <CardTitle className="text-lg font-bold text-slate-800">Pending Fulfillment Queue</CardTitle>
                        </div>
                    </CardHeader>

                    <CardContent className="p-0">
                        <ScrollArea className="w-full whitespace-nowrap">
                            <Table className="min-w-[1000px]">
                                <TableHeader className="bg-slate-50/50">
                                    <TableRow className="h-14 border-none">
                                        <TableHead className="pl-8 font-black text-[10px] uppercase text-slate-400 tracking-widest">Reference ID</TableHead>
                                        <TableHead className="font-black text-[10px] uppercase text-slate-400 tracking-widest">Client / Counterparty</TableHead>
                                        <TableHead className="text-right font-black text-[10px] uppercase text-slate-400 tracking-widest">Valuation</TableHead>
                                        <TableHead className="text-center font-black text-[10px] uppercase text-slate-400 tracking-widest">Current Status</TableHead>
                                        <TableHead className="text-right pr-8 font-black text-[10px] uppercase text-slate-400 tracking-widest">Authorization</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {quotes?.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-60 text-center">
                                                <div className="flex flex-col items-center gap-2 opacity-40">
                                                    <FileText size={40} className="text-slate-300" />
                                                    <p className="font-bold text-sm text-slate-500 uppercase tracking-widest">No Pending Fulfillment Records</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : quotes?.map((q: any) => (
                                        <TableRow key={q.id} className="group hover:bg-slate-50 transition-all border-b-slate-100">
                                            <TableCell className="pl-8 py-6 font-black text-blue-600 text-sm tracking-tight">{q.estimate_uid}</TableCell>
                                            <TableCell>
                                                <div className="font-bold text-slate-900 text-sm">{q.client_name}</div>
                                                <div className="text-[10px] font-bold text-slate-400 uppercase mt-1 flex items-center gap-2">
                                                    <Activity size={10} /> Created: {format(new Date(q.created_at), 'dd MMM yyyy')}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="font-black text-slate-900 text-base tabular-nums">${q.total_amount.toLocaleString()}</div>
                                                <Badge variant="outline" className="font-black text-[9px] mt-1 uppercase border-slate-200 text-slate-500 rounded-md tracking-tighter bg-slate-50">
                                                    {q.currency_code} Standard
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge className={`font-black px-4 py-1.5 rounded-lg text-[9px] uppercase tracking-widest shadow-sm border-none ${
                                                    q.status === 'PENDING' 
                                                    ? 'bg-amber-100 text-amber-700' 
                                                    : 'bg-emerald-100 text-emerald-700'
                                                }`}>
                                                    {q.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right pr-8">
                                                <Button 
                                                    onClick={() => setSelectedQuote(q)} 
                                                    className="bg-blue-600 hover:bg-blue-700 text-white font-black text-[10px] px-6 h-10 rounded-xl shadow-lg shadow-blue-200 transition-all gap-2 uppercase tracking-tight"
                                                >
                                                    Process Invoice <ChevronRight size={14}/>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            <ScrollBar orientation="horizontal" />
                        </ScrollArea>
                    </CardContent>
                </Card>

                <div className="flex flex-col lg:flex-row gap-6">
                    <div className="flex-1 p-6 bg-white border border-slate-200 rounded-2xl flex items-start gap-4">
                        <div className="p-3 bg-amber-50 text-amber-600 rounded-xl border border-amber-100">
                            <ShieldCheck size={20} />
                        </div>
                        <div className="space-y-1">
                            <h4 className="text-sm font-bold text-slate-900 uppercase tracking-tight">Compliance Protocol</h4>
                            <p className="text-xs text-slate-500 leading-relaxed font-medium">
                                Once a quotation is converted to an invoice, the financial ledger entry becomes permanent. Please ensure all line items and tax calculations are verified before proceeding with the execution.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <Dialog open={!!selectedQuote} onOpenChange={() => setSelectedQuote(null)}>
                <DialogContent className="max-w-xl rounded-3xl border-none shadow-2xl p-0 overflow-hidden outline-none">
                    <div className="bg-white border-b border-slate-100 px-8 py-8">
                        <DialogHeader className="space-y-1">
                            <DialogTitle className="text-2xl font-black text-slate-900 tracking-tight">Fiscal Fulfillment</DialogTitle>
                            <DialogDescription className="text-xs font-bold text-slate-400 uppercase tracking-widest">Converting Quotation To Registered Invoice</DialogDescription>
                        </DialogHeader>
                    </div>

                    <div className="p-10 space-y-8 bg-slate-50/30">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-1">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Document Ref</p>
                                <p className="text-base font-black text-slate-900">{selectedQuote?.estimate_uid}</p>
                            </div>
                            <div className="p-6 bg-blue-600 rounded-2xl border border-blue-500 shadow-lg shadow-blue-100 space-y-1">
                                <p className="text-[10px] font-black text-blue-200 uppercase tracking-widest">Payable Valuation</p>
                                <p className="text-xl font-black text-white">${selectedQuote?.total_amount.toLocaleString()}</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <Label className="text-xs font-black text-slate-500 uppercase tracking-widest flex gap-2 items-center">
                                <Wallet size={14} className="text-blue-500"/> Select Settlement Channel
                            </Label>
                            <Select value={payMethod} onValueChange={setPayMethod}>
                                <SelectTrigger className="h-14 font-bold border-slate-200 rounded-2xl text-sm bg-white shadow-sm px-6">
                                    <SelectValue placeholder="Select Financial Method" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-slate-200">
                                    <SelectItem value="NONE" className="font-bold py-3 text-slate-600">PENDING (CREDIT SETTLEMENT)</SelectItem>
                                    <SelectItem value="CASH" className="font-bold py-3 text-emerald-600">LIQUID CASH DEPOSIT</SelectItem>
                                    <SelectItem value="BANK" className="font-bold py-3 text-blue-600">ELECTRONIC BANK TRANSFER</SelectItem>
                                </SelectContent>
                            </Select>
                            <div className="flex gap-2 items-center px-2">
                                <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                                    Funds will be reconciled against the corporate ledger instantly.
                                </p>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="bg-white border-t border-slate-100 p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-3 text-emerald-600 text-[10px] font-black uppercase tracking-widest bg-emerald-50 px-4 py-2 rounded-full border border-emerald-100">
                            <ShieldCheck size={16} /> Data Verified
                        </div>
                        <div className="flex gap-3 w-full sm:w-auto">
                            <Button variant="ghost" onClick={() => setSelectedQuote(null)} className="font-black text-slate-400 hover:text-slate-600 h-12 px-8 text-xs uppercase tracking-widest">Abort</Button>
                            <Button 
                                onClick={() => executeFiscalization.mutate()} 
                                disabled={executeFiscalization.isPending}
                                className="bg-blue-600 hover:bg-blue-700 text-white h-12 px-10 font-black text-xs rounded-2xl shadow-xl shadow-blue-200 transition-all uppercase tracking-widest flex gap-2"
                            >
                                {executeFiscalization.isPending ? (
                                    <>
                                        <Loader2 className="animate-spin h-4 w-4"/> PROCESSING
                                    </>
                                ) : (
                                    <>
                                        <Send size={16}/> Finalize Entry
                                    </>
                                )}
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}