'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
    ShieldCheck, ArrowUpRight, ArrowDownRight, User, Phone,
    Download, Search, Loader2, PlusCircle, Landmark, 
    FileSpreadsheet, Send, Smartphone, Clock, Filter, Wallet, Building2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import toast from 'react-hot-toast';

const supabase = createClient();

export default function DailyForensicAudit() {
    const queryClient = useQueryClient();
    const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [search, setSearch] = useState('');
    const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);

    // --- FORM STATE ---
    const [entry, setEntry] = useState({ 
        type: 'EXPENSE', 
        amount: 0, 
        description: '', 
        account_id: '',
        client_name: '',
        phone: ''
    });

    // 1. DATA: Operational Master Stream
    const { data: records, isLoading } = useQuery({
        queryKey: ['bbu1_ops_audit', date],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('view_bbu1_operational_audit_master')
                .select('*')
                .eq('operational_date', date);
            if (error) throw error;
            return data || [];
        }
    });

    // 2. DATA: Accounts (Filtering for Banks and Expense Categories)
    const { data: accounts } = useQuery({
        queryKey: ['operational_accounts'],
        queryFn: async () => {
            const { data } = await supabase.from('accounting_accounts').select('id, name, subtype').order('name');
            return data || [];
        }
    });

    // 3. MUTATION: Auto-Locked Recording
    const saveOperation = useMutation({
        mutationFn: async () => {
            const { error } = await supabase.rpc('proc_record_enterprise_operation', {
                p_activity_type: entry.type,
                p_amount: entry.amount,
                p_description: entry.description,
                p_target_account_id: entry.account_id,
                p_client_name: entry.client_name,
                p_phone_number: entry.phone
            });
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success("Transaction Securely Locked to Ledger");
            setIsEntryModalOpen(false);
            setEntry({ type: 'EXPENSE', amount: 0, description: '', account_id: '', client_name: '', phone: '' });
            queryClient.invalidateQueries({ queryKey: ['bbu1_ops_audit'] });
        },
        onError: (e: any) => toast.error(e.message)
    });

    // --- EXPORTS ---
    const exportCSV = () => {
        const headers = ["Time", "Type", "Agent", "Customer", "Phone", "Account", "Description", "Inflow", "Outflow"];
        const rows = records?.map(r => [
            format(new Date(r.timestamp), 'HH:mm'), r.activity_type, r.sales_agent, 
            r.customer_name, r.customer_telephone, r.ledger_account, r.operational_details, r.cash_inflow, r.cash_outflow
        ]);
        const csvContent = [headers, ...rows!].map(e => e.join(",")).join("\n");
        const link = document.createElement("a");
        link.href = URL.createObjectURL(new Blob([csvContent], { type: 'text/csv' }));
        link.setAttribute("download", `BBU1_Audit_${date}.csv`);
        link.click();
    };

    const exportPDF = () => {
        const doc = new jsPDF('l', 'mm', 'a4');
        doc.setFontSize(22); doc.text(`BBU1 FORENSIC AUDIT: ${date}`, 14, 20);
        autoTable(doc, {
            startY: 30,
            head: [['Time', 'Activity', 'Agent', 'Customer', 'Phone', 'Description', 'Inflow', 'Outflow']],
            body: records?.map(r => [
                format(new Date(r.timestamp), 'HH:mm'), r.activity_type, r.sales_agent, r.customer_name, 
                r.customer_telephone, r.operational_details, r.cash_inflow.toLocaleString(), r.cash_outflow.toLocaleString()
            ]),
            styles: { fontSize: 7, fontStyle: 'bold' },
            headStyles: { fillColor: [15, 23, 42] }
        });
        doc.save(`BBU1_Forensic_${date}.pdf`);
    };

    return (
        <div className="p-8 space-y-8 bg-slate-50 min-h-screen animate-in fade-in duration-700">
            {/* TOP COMMAND BAR */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-6 border-b pb-8">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Forensic Control Tower</h1>
                    <div className="flex items-center gap-3 mt-1">
                        <Badge className="bg-blue-600 text-white font-black px-3 py-1">LIVE AUDIT MODE</Badge>
                        <p className="text-slate-500 font-bold text-sm tracking-tight uppercase">Sovereign Financial Monitoring Engine</p>
                    </div>
                </div>
                <div className="flex flex-wrap gap-3">
                    <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-12 w-48 font-black border-slate-200 bg-white" />
                    <Button variant="outline" onClick={exportCSV} className="h-12 px-6 font-black border-slate-200 gap-2 bg-white"><FileSpreadsheet size={18}/> CSV</Button>
                    <Button variant="outline" onClick={exportPDF} className="h-12 px-6 font-black border-slate-200 gap-2 bg-white"><Download size={18}/> PDF</Button>
                    <Button onClick={() => setIsEntryModalOpen(true)} className="h-12 px-10 font-black bg-blue-600 hover:bg-slate-900 shadow-2xl gap-3 rounded-xl transform hover:scale-105 transition-all">
                        <PlusCircle size={22}/> RECORD TRANSACTION
                    </Button>
                </div>
            </div>

            {/* AUDIT STREAM */}
            <Card className="border-none shadow-[0_35px_60px_-15px_rgba(0,0,0,0.1)] rounded-[3rem] overflow-hidden bg-white">
                <CardHeader className="bg-slate-900 text-white p-10 border-b border-white/5">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="flex items-center gap-5">
                            <div className="bg-blue-500/20 p-4 rounded-3xl backdrop-blur-md border border-white/10"><ShieldCheck className="h-8 w-8 text-blue-400" /></div>
                            <div>
                                <CardTitle className="text-2xl font-black tracking-tight uppercase">Daily Transactional Flow</CardTitle>
                                <div className="flex items-center gap-2 text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">
                                    <Clock size={12}/> Verified Sync Session: {date}
                                </div>
                            </div>
                        </div>
                        <div className="relative w-full md:w-[450px]">
                            <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-500" />
                            <Input placeholder="Filter Agent, Customer, Phone or Inv#..." value={search} onChange={e => setSearch(e.target.value)} className="pl-12 h-12 bg-white/5 border-white/10 text-white font-bold placeholder:text-slate-600 rounded-2xl focus:ring-blue-500 transition-all" />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <ScrollArea className="h-[650px]">
                        <Table>
                            <TableHeader className="bg-slate-50 sticky top-0 z-10">
                                <TableRow>
                                    <TableHead className="px-10 font-black text-[10px] uppercase py-6 tracking-widest">Time / Ref</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase py-6 tracking-widest">Agent & Operation</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase py-6 tracking-widest">Customer Intelligence</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase py-6 tracking-widest">Ledger Source</TableHead>
                                    <TableHead className="text-right font-black text-[10px] uppercase py-6 tracking-widest">Cash In</TableHead>
                                    <TableHead className="text-right px-10 font-black text-[10px] uppercase py-6 tracking-widest">Cash Out</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow><TableCell colSpan={6} className="h-64 text-center"><Loader2 className="animate-spin inline mr-2"/>Synchronizing with Master Ledger...</TableCell></TableRow>
                                ) : records?.filter(r => r.customer_name.toLowerCase().includes(search.toLowerCase()) || r.sales_agent.toLowerCase().includes(search.toLowerCase())).map((r: any) => (
                                    <TableRow key={r.unique_id} className="hover:bg-blue-50/40 transition-all border-b border-slate-50 group">
                                        <TableCell className="px-10 py-7">
                                            <div className="font-mono text-xs font-black text-blue-600 tracking-tighter">{format(new Date(r.timestamp), 'HH:mm:ss')}</div>
                                            <div className="text-[10px] font-black text-slate-400 mt-1 uppercase">Ref: {r.reference_no}</div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2 font-black text-slate-800 text-base">
                                                <User size={14} className="text-blue-500" /> {r.sales_agent}
                                            </div>
                                            <Badge className="text-[9px] mt-2 bg-slate-900 text-white font-black px-2.5 py-1 rounded-md">{r.activity_type}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-black text-slate-900 text-base">{r.customer_name}</div>
                                            <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 mt-1.5 uppercase tracking-tighter">
                                                <Phone size={10} className="text-emerald-500"/> {r.customer_telephone}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-xs font-black text-slate-500 uppercase italic truncate max-w-[180px]">{r.operational_details}</div>
                                            <div className="text-[10px] font-black text-blue-400 mt-1.5 uppercase">{r.ledger_account}</div>
                                        </TableCell>
                                        <TableCell className="text-right font-black text-emerald-600 text-xl tabular-nums">
                                            {r.cash_inflow > 0 ? `+${r.cash_inflow.toLocaleString()}` : '—'}
                                        </TableCell>
                                        <TableCell className="text-right px-10 font-black text-orange-600 text-xl tabular-nums">
                                            {r.cash_outflow > 0 ? `-${r.cash_outflow.toLocaleString()}` : '—'}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </CardContent>
            </Card>

            {/* MODAL: ADVANCED OPERATIONAL ENTRY */}
            <Dialog open={isEntryModalOpen} onOpenChange={setIsEntryModalOpen}>
                <DialogContent className="max-w-2xl rounded-[3rem] border-none shadow-2xl p-0 overflow-hidden">
                    <div className="bg-slate-900 p-10 text-white">
                        <div className="flex justify-between items-start">
                            <div>
                                <DialogTitle className="text-3xl font-black uppercase tracking-tight">Record Operational Activity</DialogTitle>
                                <DialogDescription className="text-blue-400 font-black text-[10px] uppercase tracking-[0.3em] mt-1">Sovereign Financial Protocol Active</DialogDescription>
                            </div>
                            <Badge className="bg-white/10 text-white border-white/20 px-4 py-2 rounded-2xl backdrop-blur-lg">ID: {Math.random().toString(36).substr(2, 6).toUpperCase()}</Badge>
                        </div>
                    </div>
                    
                    <div className="p-10 space-y-8">
                        <div className="grid grid-cols-2 gap-8">
                            <div className="space-y-3">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">1. Activity Category</Label>
                                <Select onValueChange={(val) => setEntry({...entry, type: val})}>
                                    <SelectTrigger className="h-14 font-black border-slate-200 text-base rounded-2xl shadow-sm"><SelectValue placeholder="Transaction Type" /></SelectTrigger>
                                    <SelectContent className="font-black">
                                        <SelectItem value="EXPENSE"><div className="flex gap-3"><ArrowDownRight className="text-orange-500"/> DAILY OPERATIONAL EXPENSE</div></SelectItem>
                                        <SelectItem value="MM_RECEIVED"><div className="flex gap-3"><Smartphone className="text-blue-500"/> MOBILE MONEY RECEIVED</div></SelectItem>
                                        <SelectItem value="CASH_PAYMENT"><div className="flex gap-3"><Wallet className="text-emerald-500"/> DIRECT CASH PAYMENT</div></SelectItem>
                                        <SelectItem value="BANK_DEPOSIT"><div className="flex gap-3"><Landmark className="text-indigo-500"/> BANK DEPOSIT (CASH OUT)</div></SelectItem>
                                        <SelectItem value="BANK_WITHDRAWAL"><div className="flex gap-3"><Building2 className="text-purple-500"/> BANK WITHDRAWAL (CASH IN)</div></SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-3">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">2. Precise Amount</Label>
                                <div className="relative">
                                    <Input type="number" value={entry.amount} onChange={e => setEntry({...entry, amount: Number(e.target.value)})} className="h-14 font-black border-slate-200 text-3xl text-center rounded-2xl shadow-inner focus:border-blue-600 transition-all" />
                                    <span className="absolute right-5 top-5 text-[10px] font-black text-slate-300">UGX</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-8">
                            <div className="space-y-3">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">3. Customer / Client Name</Label>
                                <Input placeholder="Enter payer or payee name..." value={entry.client_name} onChange={e => setEntry({...entry, client_name: e.target.value})} className="h-14 font-black border-slate-200 rounded-2xl" />
                            </div>
                            <div className="space-y-3">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">4. Telephone Context</Label>
                                <div className="relative">
                                    <Phone className="absolute left-4 top-4.5 h-5 w-5 text-slate-300" />
                                    <Input placeholder="e.g. 07xx xxx xxx" value={entry.phone} onChange={e => setEntry({...entry, phone: e.target.value})} className="h-14 font-black border-slate-200 pl-12 rounded-2xl" />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">5. Account Destination / Source</Label>
                            <Select onValueChange={(val) => setEntry({...entry, account_id: val})}>
                                <SelectTrigger className="h-14 font-black border-slate-200 rounded-2xl shadow-sm"><SelectValue placeholder="Choose Bank or Expense Account" /></SelectTrigger>
                                <SelectContent className="font-bold">
                                    {accounts?.map(acc => <SelectItem key={acc.id} value={acc.id} className="font-bold py-3">{acc.name} <span className="opacity-40 ml-2 font-mono">[{acc.subtype}]</span></SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">6. Audit Memo (Detailed Description)</Label>
                            <Input placeholder="e.g. Cleared Stanbic Invoice #202 or MTN Float Ref: 9823..." value={entry.description} onChange={e => setEntry({...entry, description: e.target.value})} className="h-14 font-bold border-slate-200 rounded-2xl focus:border-blue-600 shadow-sm" />
                        </div>
                    </div>

                    <DialogFooter className="p-10 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-10">
                        <div className="flex items-center gap-4 text-slate-500 text-[9px] font-black uppercase tracking-widest leading-relaxed">
                            <div className="h-10 w-10 rounded-2xl bg-orange-100 flex items-center justify-center border border-orange-200"><AlertTriangle className="text-orange-600 h-5 w-5" /></div>
                            COMMIT PROTOCOL: This entry will be <br/>immediately locked in the General Ledger.
                        </div>
                        <div className="flex gap-5 w-full sm:w-auto">
                            <Button variant="ghost" onClick={() => setIsEntryModalOpen(false)} className="font-black text-slate-400 h-14 px-10 uppercase text-xs hover:text-red-500 transition-colors">Discard</Button>
                            <Button onClick={() => saveOperation.mutate()} disabled={saveOperation.isPending} className="bg-slate-900 hover:bg-blue-600 text-white h-14 px-14 font-black text-sm shadow-2xl rounded-2xl transition-all transform hover:scale-105 active:scale-95 flex-1 sm:flex-none uppercase tracking-widest">
                                {saveOperation.isPending ? <Loader2 className="animate-spin h-5 w-5 mr-3"/> : <Send size={18} className="mr-3"/>}
                                {saveOperation.isPending ? "COMMITING..." : "COMMIT TO AUDIT"}
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}