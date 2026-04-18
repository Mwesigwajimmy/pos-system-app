'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
    Gavel, CheckCircle2, XCircle, ArrowRightLeft, 
    Search, Loader2, Landmark, ShieldCheck, Printer, 
    Wallet, DollarSign, Send, FileDigit, AlertTriangle, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const supabase = createClient();

export default function QuotationExecutionCenter() {
    const queryClient = useQueryClient();
    const [selectedQuote, setSelectedQuote] = useState<any>(null);
    const [payMethod, setPayMethod] = useState('NONE');

    // 1. FETCH PENDING QUOTES
    const { data: quotes, isLoading } = useQuery({
        queryKey: ['pending_quotes'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('estimates')
                .select('*, items:estimate_line_items(*)')
                .not('status', 'eq', 'ACCEPTED') // Hide already finalized ones
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data;
        }
    });

    // 2. EXECUTION MUTATION
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
            toast.success(`Commercial Protocol Sealed: Invoice #${invId} is now active.`);
            setSelectedQuote(null);
            queryClient.invalidateQueries({ queryKey: ['pending_quotes'] });
        },
        onError: (err: any) => toast.error(`Protocol Breach: ${err.message}`)
    });

    if (isLoading) return <div className="p-20 text-center font-black animate-pulse text-slate-400">LOADING SOVEREIGN LEDGER...</div>;

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <Card className="border-none shadow-[0_50px_100px_-20px_rgba(0,0,0,0.1)] rounded-[3rem] overflow-hidden bg-white">
                <CardHeader className="bg-slate-900 text-white p-10 border-b border-white/5">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-6">
                            <div className="p-5 bg-blue-600 rounded-3xl shadow-xl shadow-blue-600/20"><Gavel size={36} /></div>
                            <div>
                                <CardTitle className="text-3xl font-black uppercase tracking-tighter">Execution Console</CardTitle>
                                <p className="text-blue-400 text-[10px] font-black uppercase tracking-[0.4em] mt-2 italic">Commercial Approval & Fiscalization Node</p>
                            </div>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-slate-50 h-20">
                            <TableRow>
                                <TableHead className="pl-10 font-black text-[11px] uppercase text-slate-400 tracking-widest">Protocol ID</TableHead>
                                <TableHead className="font-black text-[11px] uppercase text-slate-400">Target Client</TableHead>
                                <TableHead className="font-black text-[11px] uppercase text-slate-400 text-right">Gross Value</TableHead>
                                <TableHead className="font-black text-[11px] uppercase text-slate-400 text-center">Current Status</TableHead>
                                <TableHead className="text-right pr-10 font-black text-[11px] uppercase text-slate-400">Decision</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {quotes?.map((q: any) => (
                                <TableRow key={q.id} className="hover:bg-blue-50/30 transition-all border-b border-slate-50">
                                    <TableCell className="pl-10 py-8 font-mono text-blue-600 font-black text-lg">{q.estimate_uid}</TableCell>
                                    <TableCell>
                                        <div className="font-black text-slate-800 text-xl tracking-tighter uppercase">{q.client_name}</div>
                                        <div className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-widest">{format(new Date(q.created_at), 'PPP')}</div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="font-black text-slate-900 text-2xl tabular-nums">{q.total_amount.toLocaleString()}</div>
                                        <Badge variant="outline" className="font-black text-[9px] mt-1">{q.currency_code}</Badge>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Badge className={`font-black px-4 py-1.5 rounded-lg text-[10px] ${q.status === 'PENDING' ? 'bg-orange-100 text-orange-600' : 'bg-emerald-100 text-emerald-700'}`}>
                                            {q.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right pr-10">
                                        <Button onClick={() => setSelectedQuote(q)} className="bg-slate-900 hover:bg-blue-600 font-black text-[10px] px-6 h-10 shadow-lg gap-2">
                                            PROCESS <ChevronRight size={14}/>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* --- MODAL: FINAL FISCALIZATION --- */}
            <Dialog open={!!selectedQuote} onOpenChange={() => setSelectedQuote(null)}>
                <DialogContent className="max-w-2xl rounded-[3rem] border-none shadow-2xl p-0 overflow-hidden">
                    <div className="bg-slate-900 p-10 text-white">
                        <DialogTitle className="text-3xl font-black uppercase italic">Seal Commercial Protocol</DialogTitle>
                        <DialogDescription className="text-blue-400 font-black text-[10px] uppercase tracking-[0.4em] mt-2">Transitioning Specification to Fiscal Asset</DialogDescription>
                    </div>

                    <div className="p-10 space-y-8">
                        <div className="flex justify-between items-center p-6 bg-slate-50 rounded-3xl border border-slate-100 shadow-inner">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Protocol Ref</p>
                                <p className="text-xl font-black text-slate-900">{selectedQuote?.estimate_uid}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Client Payable</p>
                                <p className="text-3xl font-black text-blue-600">{selectedQuote?.total_amount.toLocaleString()} <span className="text-xs">{selectedQuote?.currency_code}</span></p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <Label className="text-[11px] font-black uppercase tracking-widest text-slate-500 flex gap-2"><Wallet size={14}/> Instant Settlement Option</Label>
                            <Select value={payMethod} onValueChange={setPayMethod}>
                                <SelectTrigger className="h-16 font-black border-2 border-slate-200 rounded-2xl text-lg shadow-sm">
                                    <SelectValue placeholder="Select Settlement Status" />
                                </SelectTrigger>
                                <SelectContent className="font-black text-lg">
                                    <SelectItem value="NONE" className="text-slate-500 py-3">INVOICE ONLY (CREDIT SALE)</SelectItem>
                                    <SelectItem value="CASH" className="text-emerald-600 py-3 italic">FULL SETTLEMENT: DIRECT CASH</SelectItem>
                                    <SelectItem value="BANK" className="text-blue-600 py-3 italic">FULL SETTLEMENT: BANK TRANSFER</SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-[10px] text-slate-400 font-bold italic px-2">
                                * Choosing a settlement method will automatically write to the Cash Ledger and update your Daily Forensic Audit.
                            </p>
                        </div>
                    </div>

                    <DialogFooter className="bg-slate-50 border-t p-10 flex flex-col sm:flex-row items-center justify-between gap-10">
                        <div className="flex items-center gap-4 text-slate-500 text-[9px] font-black uppercase tracking-widest">
                            <ShieldCheck className="text-emerald-500 h-6 w-6" />
                            Security Seal: Once fiscalized, <br/>this document is immutable.
                        </div>
                        <div className="flex gap-4 w-full sm:w-auto">
                            <Button variant="ghost" onClick={() => setSelectedQuote(null)} className="font-black text-slate-400 h-16 px-10">Discard</Button>
                            <Button 
                                onClick={() => executeFiscalization.mutate()} 
                                disabled={executeFiscalization.isPending}
                                className="bg-blue-600 hover:bg-slate-900 text-white h-16 px-14 font-black text-sm shadow-2xl rounded-2xl transition-all transform hover:scale-105 active:scale-95 flex-1"
                            >
                                {executeFiscalization.isPending ? <Loader2 className="animate-spin h-6 w-6 mr-3"/> : <Send className="mr-3 h-5 w-5"/>}
                                {executeFiscalization.isPending ? "SEALING PROTOCOL..." : "FINALIZE & FISCALIZE"}
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}