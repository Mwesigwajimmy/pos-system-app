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

    // 1. FETCH PENDING QUOTES (Logic Intact)
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

    // 2. EXECUTION MUTATION (Logic Intact)
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
            toast.success(`Quotation processed: Invoice #${invId} generated.`);
            setSelectedQuote(null);
            queryClient.invalidateQueries({ queryKey: ['pending_quotes'] });
        },
        onError: (err: any) => toast.error(`Error: ${err.message}`)
    });

    if (isLoading) return (
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
            <p className="text-sm font-semibold text-slate-500 uppercase tracking-widest">Loading Records...</p>
        </div>
    );

    return (
        <div className="max-w-[1400px] mx-auto py-8 px-6 space-y-6 animate-in fade-in duration-500">
            <Card className="border border-slate-200 shadow-sm rounded-xl overflow-hidden bg-white">
                <CardHeader className="bg-white border-b border-slate-100 p-8">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-5">
                            <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 text-blue-600">
                                <Gavel size={28} />
                            </div>
                            <div>
                                <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">Quotation Processing</CardTitle>
                                <p className="text-sm text-slate-500 mt-1 font-medium">Review pending estimates and convert to active invoices.</p>
                            </div>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-slate-50 h-14 border-b">
                            <TableRow>
                                <TableHead className="pl-8 font-bold text-[10px] uppercase text-slate-500 tracking-wider">Quotation No.</TableHead>
                                <TableHead className="font-bold text-[10px] uppercase text-slate-500 tracking-wider">Client Name</TableHead>
                                <TableHead className="font-bold text-[10px] uppercase text-slate-500 tracking-wider text-right">Total Amount</TableHead>
                                <TableHead className="font-bold text-[10px] uppercase text-slate-500 tracking-wider text-center">Status</TableHead>
                                <TableHead className="text-right pr-8 font-bold text-[10px] uppercase text-slate-500 tracking-wider">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {quotes?.map((q: any) => (
                                <TableRow key={q.id} className="hover:bg-slate-50 transition-colors border-b border-slate-100">
                                    <TableCell className="pl-8 py-6 font-bold text-blue-600 text-sm">{q.estimate_uid}</TableCell>
                                    <TableCell>
                                        <div className="font-bold text-slate-800 text-base">{q.client_name}</div>
                                        <div className="text-[10px] font-semibold text-slate-400 uppercase mt-0.5 tracking-tight">{format(new Date(q.created_at), 'dd MMM yyyy')}</div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="font-bold text-slate-900 text-lg tabular-nums">{q.total_amount.toLocaleString()}</div>
                                        <Badge variant="outline" className="font-bold text-[9px] mt-0.5 uppercase border-slate-200">{q.currency_code}</Badge>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Badge variant="secondary" className={`font-bold px-3 py-1 rounded-full text-[9px] uppercase tracking-wider ${q.status === 'PENDING' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
                                            {q.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right pr-8">
                                        <Button 
                                            onClick={() => setSelectedQuote(q)} 
                                            className="bg-[#2557D6] hover:bg-[#1e44a8] text-white font-bold text-[10px] px-5 h-9 rounded-lg shadow-sm gap-2"
                                        >
                                            PROCESS RECORD <ChevronRight size={14}/>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* --- MODAL: FINAL PROCESSING --- */}
            <Dialog open={!!selectedQuote} onOpenChange={() => setSelectedQuote(null)}>
                <DialogContent className="max-w-xl rounded-xl border border-slate-200 shadow-xl p-0 overflow-hidden">
                    <div className="bg-white border-b border-slate-100 p-6">
                        <DialogTitle className="text-xl font-bold text-slate-900">Generate Tax Invoice</DialogTitle>
                        <DialogDescription className="text-xs font-medium text-slate-500 mt-1">Convert this quotation into a formal billing document.</DialogDescription>
                    </div>

                    <div className="p-8 space-y-6">
                        <div className="flex justify-between items-center p-5 bg-slate-50 rounded-lg border border-slate-200">
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Quote Reference</p>
                                <p className="text-base font-bold text-slate-900">{selectedQuote?.estimate_uid}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Payable Balance</p>
                                <p className="text-2xl font-bold text-blue-600">{selectedQuote?.total_amount.toLocaleString()} <span className="text-xs">{selectedQuote?.currency_code}</span></p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <Label className="text-xs font-bold text-slate-600 flex gap-2 items-center"><Wallet size={14} className="text-slate-400"/> Settlement Method</Label>
                            <Select value={payMethod} onValueChange={setPayMethod}>
                                <SelectTrigger className="h-12 font-bold border-slate-200 rounded-lg text-sm bg-white">
                                    <SelectValue placeholder="Select Method" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="NONE" className="font-semibold">UNPAID (CREDIT SALE)</SelectItem>
                                    <SelectItem value="CASH" className="font-semibold text-emerald-600">PAID VIA CASH</SelectItem>
                                    <SelectItem value="BANK" className="font-semibold text-blue-600">PAID VIA BANK TRANSFER</SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-[10px] text-slate-400 font-medium px-1">
                                * Payments selected here will be logged to your business accounts and cash registers immediately.
                            </p>
                        </div>
                    </div>

                    <DialogFooter className="bg-slate-50 border-t border-slate-200 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-3 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                            <ShieldCheck size={18} className="text-emerald-500" />
                            Confirmed Data Accuracy Required
                        </div>
                        <div className="flex gap-3 w-full sm:w-auto">
                            <Button variant="outline" onClick={() => setSelectedQuote(null)} className="font-bold text-slate-500 h-10 px-6 rounded-lg text-xs">Cancel</Button>
                            <Button 
                                onClick={() => executeFiscalization.mutate()} 
                                disabled={executeFiscalization.isPending}
                                className="bg-[#2557D6] hover:bg-[#1e44a8] text-white h-10 px-8 font-bold text-xs rounded-lg shadow-sm transition-all"
                            >
                                {executeFiscalization.isPending ? <Loader2 className="animate-spin h-4 w-4 mr-2"/> : <Send className="mr-2 h-4 w-4"/>}
                                {executeFiscalization.isPending ? "PROCESSING..." : "FINALIZE INVOICE"}
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}