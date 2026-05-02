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
            toast.success(`Success: Invoice #${invId} generated.`);
            setSelectedQuote(null);
            queryClient.invalidateQueries({ queryKey: ['pending_quotes'] });
        },
        onError: (err: any) => toast.error(`Alert: ${err.message}`)
    });

    if (isLoading) return (
        <div className="flex flex-col items-center justify-center min-h-[500px] gap-6">
            <div className="relative flex items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
            </div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Accessing Records</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#F8FAFC] pb-12">
            <div className="max-w-[1400px] mx-auto py-10 px-6 space-y-8 animate-in fade-in duration-700">
                
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-blue-600 font-semibold text-xs uppercase tracking-wider">
                            <Activity size={14} /> Billing Workflow
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Review & Dispatch</h1>
                        <p className="text-sm font-medium text-slate-500">Process verified quotes into final tax invoices.</p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <Button variant="outline" className="bg-white border-slate-200 text-slate-600 font-semibold text-xs h-10 px-5 rounded-xl shadow-sm">
                            <Filter size={16} className="mr-2" /> Filter Records
                        </Button>
                        <div className="h-10 px-4 bg-white border border-slate-200 rounded-xl flex items-center gap-3 shadow-sm">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Pending Items</span>
                            <span className="text-sm font-bold text-blue-600">{quotes?.length || 0}</span>
                        </div>
                    </div>
                </header>

                <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white">
                    <CardHeader className="bg-white border-b border-slate-100 px-8 py-5">
                        <div className="flex items-center gap-4">
                            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg border border-blue-100">
                                <FileText size={20} />
                            </div>
                            <CardTitle className="text-base font-semibold text-slate-800">Authorization Queue</CardTitle>
                        </div>
                    </CardHeader>

                    <CardContent className="p-0">
                        <ScrollArea className="w-full">
                            <Table>
                                <TableHeader className="bg-slate-50/50">
                                    <TableRow className="h-12 border-none">
                                        <TableHead className="pl-8 font-bold text-[10px] uppercase text-slate-500 tracking-wider">Reference No.</TableHead>
                                        <TableHead className="font-bold text-[10px] uppercase text-slate-500 tracking-wider">Client Details</TableHead>
                                        <TableHead className="text-right font-bold text-[10px] uppercase text-slate-500 tracking-wider">Total Amount</TableHead>
                                        <TableHead className="text-center font-bold text-[10px] uppercase text-slate-500 tracking-wider">Current Status</TableHead>
                                        <TableHead className="text-right pr-8 font-bold text-[10px] uppercase text-slate-500 tracking-wider">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {quotes?.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-48 text-center">
                                                <div className="flex flex-col items-center gap-2 opacity-50">
                                                    <FileText size={32} className="text-slate-300" />
                                                    <p className="text-sm text-slate-400 font-medium">No records found</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : quotes?.map((q: any) => (
                                        <TableRow key={q.id} className="group hover:bg-slate-50/50 transition-colors border-b-slate-100">
                                            <TableCell className="pl-8 py-5 font-semibold text-blue-600 text-sm">{q.estimate_uid}</TableCell>
                                            <TableCell>
                                                <div className="font-semibold text-slate-800 text-sm">{q.client_name}</div>
                                                <div className="text-[10px] font-medium text-slate-400 mt-0.5">
                                                    Created: {format(new Date(q.created_at), 'dd MMM yyyy')}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="font-bold text-slate-900 text-sm tabular-nums">${q.total_amount.toLocaleString()}</div>
                                                <div className="text-[9px] font-bold text-slate-400 uppercase">{q.currency_code}</div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant="secondary" className={`font-bold px-3 py-1 rounded-lg text-[9px] uppercase border-none shadow-none ${
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
                                                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] px-5 h-9 rounded-xl shadow-sm transition-all gap-2"
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

                <div className="p-5 bg-white border border-slate-200 rounded-2xl flex items-start gap-4">
                    <ShieldCheck size={18} className="text-blue-500 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                        <h4 className="text-xs font-bold text-slate-900 uppercase">Policy Notice</h4>
                        <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                            Once converted to an invoice, the entry is recorded permanently. Verify all amounts and taxes before processing.
                        </p>
                    </div>
                </div>
            </div>

            <Dialog open={!!selectedQuote} onOpenChange={() => setSelectedQuote(null)}>
                <DialogContent className="max-w-lg rounded-2xl border-none shadow-xl p-0 overflow-hidden outline-none">
                    <div className="bg-white border-b border-slate-100 px-8 py-6">
                        <DialogHeader className="space-y-1">
                            <DialogTitle className="text-xl font-bold text-slate-900">Invoice Generation</DialogTitle>
                            <DialogDescription className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Convert Quote to Fiscal Document</DialogDescription>
                        </DialogHeader>
                    </div>

                    <div className="p-8 space-y-6 bg-[#FCFDFF]">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm space-y-1">
                                <p className="text-[9px] font-bold text-slate-400 uppercase">Quote Ref</p>
                                <p className="text-sm font-bold text-slate-900">{selectedQuote?.estimate_uid}</p>
                            </div>
                            <div className="p-5 bg-blue-600 rounded-xl shadow-md space-y-1">
                                <p className="text-[9px] font-bold text-blue-100 uppercase">Payable Total</p>
                                <p className="text-lg font-bold text-white">${selectedQuote?.total_amount.toLocaleString()}</p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex gap-2 items-center">
                                <Wallet size={12} className="text-blue-500"/> Settlement Method
                            </Label>
                            <Select value={payMethod} onValueChange={setPayMethod}>
                                <SelectTrigger className="h-12 font-semibold border-slate-200 rounded-xl text-sm bg-white shadow-sm px-4">
                                    <SelectValue placeholder="Select Payment Method" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-slate-200">
                                    <SelectItem value="NONE" className="font-semibold py-2.5">Credit / Account Post</SelectItem>
                                    <SelectItem value="CASH" className="font-semibold py-2.5 text-emerald-600">Cash Deposit</SelectItem>
                                    <SelectItem value="BANK" className="font-semibold py-2.5 text-blue-600">Bank Transfer</SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-[10px] text-slate-400 font-medium px-1 leading-tight">
                                Entries will reconcile against the company ledger upon confirmation.
                            </p>
                        </div>
                    </div>

                    <DialogFooter className="bg-white border-t border-slate-100 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-2 text-emerald-600 text-[9px] font-bold uppercase tracking-widest bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">
                            <ShieldCheck size={14} /> Data Verified
                        </div>
                        <div className="flex gap-2.5 w-full sm:w-auto">
                            <Button variant="ghost" onClick={() => setSelectedQuote(null)} className="font-bold text-slate-400 hover:text-slate-600 h-10 px-6 text-[10px] uppercase">Cancel</Button>
                            <Button 
                                onClick={() => executeFiscalization.mutate()} 
                                disabled={executeFiscalization.isPending}
                                className="bg-blue-600 hover:bg-blue-700 text-white h-10 px-8 font-bold text-[10px] rounded-xl shadow-sm uppercase flex gap-2"
                            >
                                {executeFiscalization.isPending ? (
                                    <>
                                        <Loader2 className="animate-spin h-3 w-3"/> Processing
                                    </>
                                ) : (
                                    <>
                                        <Send size={14}/> Finalize Invoice
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