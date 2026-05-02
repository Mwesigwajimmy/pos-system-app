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
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Synchronizing Registry</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-white pb-12">
            <div className="max-w-[1400px] mx-auto py-8 px-4 md:px-8 space-y-8 animate-in fade-in duration-500">
                
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-50 pb-6">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-blue-600 font-bold text-[11px] uppercase tracking-wider">
                            <Activity size={14} /> Billing Pipeline
                        </div>
                        <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">Review & Dispatch</h1>
                        <p className="text-xs font-medium text-slate-500">Convert verified quotations into official fiscal invoices.</p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <Button variant="outline" size="sm" className="h-9 px-4 border-slate-200 text-slate-600 font-bold text-[10px] uppercase tracking-widest rounded-lg">
                            <Filter size={14} className="mr-2" /> Filter
                        </Button>
                        <div className="h-9 px-4 bg-slate-50 border border-slate-100 rounded-lg flex items-center gap-3">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Queue</span>
                            <span className="text-xs font-bold text-blue-600">{quotes?.length || 0}</span>
                        </div>
                    </div>
                </header>

                <Card className="border border-slate-100 shadow-sm rounded-xl overflow-hidden bg-white">
                    <CardHeader className="bg-slate-50/30 border-b border-slate-50 px-6 py-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white text-blue-600 rounded-lg border border-slate-100 shadow-sm">
                                <FileText size={16} />
                            </div>
                            <CardTitle className="text-sm font-bold text-slate-800 uppercase tracking-wider">Authorization Registry</CardTitle>
                        </div>
                    </CardHeader>

                    <CardContent className="p-0">
                        <ScrollArea className="w-full">
                            <Table>
                                <TableHeader className="bg-slate-50/50">
                                    <TableRow className="h-10 border-none">
                                        <TableHead className="pl-6 font-bold text-[9px] uppercase text-slate-500 tracking-widest">Ref No.</TableHead>
                                        <TableHead className="font-bold text-[9px] uppercase text-slate-500 tracking-widest">Counterparty</TableHead>
                                        <TableHead className="text-right font-bold text-[9px] uppercase text-slate-500 tracking-widest">Valuation</TableHead>
                                        <TableHead className="text-center font-bold text-[9px] uppercase text-slate-500 tracking-widest">Status</TableHead>
                                        <TableHead className="text-right pr-6 font-bold text-[9px] uppercase text-slate-500 tracking-widest">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {quotes?.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-48 text-center">
                                                <div className="flex flex-col items-center gap-2 opacity-30">
                                                    <FileText size={24} className="text-slate-400" />
                                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">No Pending records</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        <div className="contents">
                                            {quotes?.map((q: any) => (
                                                <TableRow key={q.id} className="hover:bg-slate-50/50 transition-colors border-b last:border-none">
                                                    <TableCell className="pl-6 py-4 font-bold text-blue-600 text-xs tracking-wide uppercase">{q.estimate_uid}</TableCell>
                                                    <TableCell>
                                                        <div className="font-bold text-slate-800 text-xs">{q.client_name}</div>
                                                        <div className="text-[9px] font-bold text-slate-400 uppercase mt-0.5 tracking-tight">
                                                            {format(new Date(q.created_at), 'dd MMM yyyy')}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="font-bold text-slate-900 text-xs tabular-nums">${q.total_amount.toLocaleString()}</div>
                                                        <div className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">{q.currency_code}</div>
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <Badge variant="outline" className={`font-bold px-3 py-0.5 rounded-full text-[8px] uppercase border-none shadow-none ${
                                                            q.status === 'PENDING' 
                                                            ? 'bg-amber-50 text-amber-600' 
                                                            : 'bg-emerald-50 text-emerald-600'
                                                        }`}>
                                                            {q.status}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right pr-6">
                                                        <Button 
                                                            onClick={() => setSelectedQuote(q)} 
                                                            className="bg-slate-900 hover:bg-black text-white font-bold text-[9px] px-4 h-8 rounded-lg shadow-sm uppercase tracking-widest transition-all gap-2"
                                                        >
                                                            Dispatch <ChevronRight size={12}/>
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </div>
                                    )}
                                </TableBody>
                            </Table>
                            <ScrollBar orientation="horizontal" />
                        </ScrollArea>
                    </CardContent>
                </Card>

                <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex items-start gap-3">
                    <ShieldCheck size={14} className="text-blue-500 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                        <h4 className="text-[10px] font-bold text-slate-900 uppercase tracking-wider">Regulatory Notice</h4>
                        <p className="text-[10px] text-slate-500 leading-normal font-medium">
                            Authorized conversion to a fiscal invoice creates a permanent ledger entry. Ensure all taxation nodes are verified before commitment.
                        </p>
                    </div>
                </div>
            </div>

            <Dialog open={!!selectedQuote} onOpenChange={() => setSelectedQuote(null)}>
                <DialogContent className="max-w-md rounded-xl border-none shadow-2xl p-0 overflow-hidden outline-none bg-white">
                    <div className="bg-slate-900 px-6 py-5">
                        <DialogHeader className="space-y-0.5">
                            <DialogTitle className="text-base font-bold text-white uppercase tracking-wider">Fiscal Authorization</DialogTitle>
                            <DialogDescription className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Convert Proposal to Binding Invoice</DialogDescription>
                        </DialogHeader>
                    </div>

                    <div className="p-6 space-y-6 bg-white">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 space-y-0.5">
                                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Reference</p>
                                <p className="text-xs font-bold text-slate-900 uppercase tracking-wide">{selectedQuote?.estimate_uid}</p>
                            </div>
                            <div className="p-4 bg-blue-600 rounded-lg shadow-sm space-y-0.5">
                                <p className="text-[8px] font-bold text-blue-100 uppercase tracking-widest">Post-Trade Sum</p>
                                <p className="text-sm font-bold text-white tabular-nums">${selectedQuote?.total_amount.toLocaleString()}</p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex gap-2 items-center">
                                <Wallet size={12} className="text-blue-500"/> Settlement Protocol
                            </Label>
                            <Select value={payMethod} onValueChange={setPayMethod}>
                                <SelectTrigger className="h-10 font-bold border-slate-200 rounded-lg text-xs bg-white shadow-sm px-4">
                                    <SelectValue placeholder="Select Payment Method" />
                                </SelectTrigger>
                                <SelectContent className="rounded-lg border-slate-200">
                                    <SelectItem value="NONE" className="text-xs font-bold py-2">Credit / Account Posting</SelectItem>
                                    <SelectItem value="CASH" className="text-xs font-bold py-2 text-emerald-600">Cash Settlement</SelectItem>
                                    <SelectItem value="BANK" className="text-xs font-bold py-2 text-blue-600">Bank Wire / EFT</SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-[9px] text-slate-400 font-medium px-1 leading-tight italic">
                                * System will automatically reconcile ledger balances upon dispatch.
                            </p>
                        </div>
                    </div>

                    <DialogFooter className="bg-slate-50 border-t border-slate-100 p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-2 text-emerald-600 text-[8px] font-bold uppercase tracking-widest bg-white px-3 py-1 rounded-md border border-emerald-100">
                            <ShieldCheck size={12} /> Verified
                        </div>
                        <div className="flex gap-3 w-full sm:w-auto">
                            <Button variant="ghost" size="sm" onClick={() => setSelectedQuote(null)} className="font-bold text-slate-400 hover:text-slate-600 h-9 px-5 text-[10px] uppercase tracking-widest">Abort</Button>
                            <Button 
                                size="sm"
                                onClick={() => executeFiscalization.mutate()} 
                                disabled={executeFiscalization.isPending}
                                className="bg-blue-600 hover:bg-blue-700 text-white h-9 px-6 font-bold text-[10px] rounded-lg shadow-md uppercase tracking-widest flex gap-2"
                            >
                                {executeFiscalization.isPending ? (
                                    <>
                                        <Loader2 className="animate-spin h-3 w-3"/> Dispatching
                                    </>
                                ) : (
                                    <>
                                        <Send size={12}/> Post Invoice
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