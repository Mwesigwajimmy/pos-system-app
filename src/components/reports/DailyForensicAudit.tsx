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
    FileSpreadsheet, Send, Smartphone, Clock, AlertTriangle, Filter, Wallet, Building2
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

    // --- FORM STATE (Logic Intact) ---
    const [entry, setEntry] = useState({ 
        type: 'EXPENSE', 
        amount: 0, 
        description: '', 
        account_id: '',
        client_name: '',
        phone: ''
    });

    // 1. DATA: Operational Master Stream (Logic Intact)
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

    // 2. DATA: Accounts (Logic Intact)
    const { data: accounts } = useQuery({
        queryKey: ['operational_accounts'],
        queryFn: async () => {
            const { data } = await supabase.from('accounting_accounts').select('id, name, subtype').order('name');
            return data || [];
        }
    });

    // 3. MUTATION: Ledger Recording (Logic Intact)
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
            toast.success("Transaction recorded successfully");
            setIsEntryModalOpen(false);
            setEntry({ type: 'EXPENSE', amount: 0, description: '', account_id: '', client_name: '', phone: '' });
            queryClient.invalidateQueries({ queryKey: ['bbu1_ops_audit'] });
        },
        onError: (e: any) => toast.error(e.message)
    });

    // --- EXPORTS (Logic Intact) ---
    const exportCSV = () => {
        const headers = ["Time", "Type", "Agent", "Customer", "Phone", "Account", "Description", "Inflow", "Outflow"];
        const rows = records?.map(r => [
            format(new Date(r.timestamp), 'HH:mm'), r.activity_type, r.sales_agent, 
            r.customer_name, r.customer_telephone, r.ledger_account, r.operational_details, r.cash_inflow, r.cash_outflow
        ]);
        const csvContent = [headers, ...rows!].map(e => e.join(",")).join("\n");
        const link = document.createElement("a");
        link.href = URL.createObjectURL(new Blob([csvContent], { type: 'text/csv' }));
        link.setAttribute("download", `Transaction_Audit_${date}.csv`);
        link.click();
    };

    const exportPDF = () => {
        const doc = new jsPDF('l', 'mm', 'a4');
        doc.setFontSize(18); doc.text(`Daily Operations Audit: ${date}`, 14, 20);
        autoTable(doc, {
            startY: 30,
            head: [['Time', 'Activity', 'Agent', 'Customer', 'Phone', 'Description', 'Inflow', 'Outflow']],
            body: records?.map(r => [
                format(new Date(r.timestamp), 'HH:mm'), r.activity_type, r.sales_agent, r.customer_name, 
                r.customer_telephone, r.operational_details, r.cash_inflow.toLocaleString(), r.cash_outflow.toLocaleString()
            ]),
            styles: { fontSize: 8 },
            headStyles: { fillColor: [37, 87, 214] }
        });
        doc.save(`Operations_Audit_${date}.pdf`);
    };

    return (
        <div className="max-w-[1600px] mx-auto py-8 px-6 space-y-6 animate-in fade-in duration-500">
            {/* TOP COMMAND BAR */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 border-b border-slate-200 pb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Audit & Operations Log</h1>
                    <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="bg-blue-50 text-blue-700 font-semibold px-2 py-0.5 border border-blue-100 uppercase text-[10px]">Active Session</Badge>
                        <p className="text-slate-500 font-medium text-xs uppercase tracking-wider">Financial activity monitoring engine</p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-10 w-44 font-semibold border-slate-200 bg-white text-sm" />
                    <Button variant="outline" size="sm" onClick={exportCSV} className="h-10 px-4 font-bold border-slate-200 gap-2 bg-white text-slate-600"><FileSpreadsheet size={16}/> CSV</Button>
                    <Button variant="outline" size="sm" onClick={exportPDF} className="h-10 px-4 font-bold border-slate-200 gap-2 bg-white text-slate-600"><Download size={16}/> PDF</Button>
                    <Button onClick={() => setIsEntryModalOpen(true)} className="h-10 px-6 font-bold bg-[#2557D6] hover:bg-[#1e44a8] text-white shadow-sm gap-2 rounded-lg transition-all">
                        <PlusCircle size={18}/> New Transaction
                    </Button>
                </div>
            </div>

            {/* AUDIT STREAM */}
            <Card className="border border-slate-200 shadow-sm rounded-xl overflow-hidden bg-white">
                <CardHeader className="bg-white border-b border-slate-100 p-8">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 text-blue-600"><ShieldCheck size={24} /></div>
                            <div>
                                <CardTitle className="text-lg font-bold tracking-tight text-slate-900">Activity History</CardTitle>
                                <div className="flex items-center gap-2 text-slate-400 text-[10px] font-semibold uppercase tracking-wider mt-0.5">
                                    <Clock size={12}/> Verified synchronization: {date}
                                </div>
                            </div>
                        </div>
                        <div className="relative w-full md:w-96">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input placeholder="Search records..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 h-10 border-slate-200 text-sm font-medium focus:ring-blue-500/10 focus:border-blue-500 transition-all" />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <ScrollArea className="h-[600px]">
                        <Table>
                            <TableHeader className="bg-slate-50 sticky top-0 z-10 border-b">
                                <TableRow>
                                    <TableHead className="px-8 font-bold text-[10px] uppercase h-12 tracking-wider text-slate-500">Timestamp / Ref</TableHead>
                                    <TableHead className="font-bold text-[10px] uppercase h-12 tracking-wider text-slate-500">Operator & Activity</TableHead>
                                    <TableHead className="font-bold text-[10px] uppercase h-12 tracking-wider text-slate-500">Contact Details</TableHead>
                                    <TableHead className="font-bold text-[10px] uppercase h-12 tracking-wider text-slate-500">Account Details</TableHead>
                                    <TableHead className="text-right font-bold text-[10px] uppercase h-12 tracking-wider text-slate-500">Cash In</TableHead>
                                    <TableHead className="text-right px-8 font-bold text-[10px] uppercase h-12 tracking-wider text-slate-500">Cash Out</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow><TableCell colSpan={6} className="h-40 text-center"><Loader2 className="animate-spin inline mr-2 h-5 w-5"/>Syncing data...</TableCell></TableRow>
                                ) : records?.filter(r => r.customer_name.toLowerCase().includes(search.toLowerCase()) || r.sales_agent.toLowerCase().includes(search.toLowerCase())).map((r: any) => (
                                    <TableRow key={r.unique_id} className="hover:bg-slate-50 transition-colors border-b border-slate-100">
                                        <TableCell className="px-8 py-5">
                                            <div className="font-mono text-[11px] font-bold text-blue-600">{format(new Date(r.timestamp), 'HH:mm:ss')}</div>
                                            <div className="text-[10px] font-semibold text-slate-400 mt-0.5 uppercase">ID: {r.reference_no}</div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
                                                {r.sales_agent}
                                            </div>
                                            <Badge variant="secondary" className="text-[9px] mt-1.5 font-bold uppercase tracking-tight">{r.activity_type}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-bold text-slate-900 text-sm">{r.customer_name}</div>
                                            <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-400 mt-1 uppercase tracking-tight">
                                                <Phone size={10} className="text-slate-400"/> {r.customer_telephone}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-[11px] font-medium text-slate-500 truncate max-w-[200px]">{r.operational_details}</div>
                                            <div className="text-[10px] font-bold text-blue-500 mt-1 uppercase tracking-tight">{r.ledger_account}</div>
                                        </TableCell>
                                        <TableCell className="text-right font-bold text-emerald-600 text-base tabular-nums">
                                            {r.cash_inflow > 0 ? `+${r.cash_inflow.toLocaleString()}` : '-'}
                                        </TableCell>
                                        <TableCell className="text-right px-8 font-bold text-orange-600 text-base tabular-nums">
                                            {r.cash_outflow > 0 ? `-${r.cash_outflow.toLocaleString()}` : '-'}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </CardContent>
            </Card>

            {/* MODAL: NEW ENTRY (Logic Intact) */}
            <Dialog open={isEntryModalOpen} onOpenChange={setIsEntryModalOpen}>
                <DialogContent className="max-w-xl rounded-xl border border-slate-200 shadow-xl p-0 overflow-hidden">
                    <div className="bg-white border-b border-slate-100 p-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <DialogTitle className="text-xl font-bold text-slate-900">Add New Entry</DialogTitle>
                                <DialogDescription className="text-xs font-medium text-slate-500 mt-1">Record a business activity or transaction</DialogDescription>
                            </div>
                        </div>
                    </div>
                    
                    <div className="p-8 space-y-6">
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-slate-600 ml-1">Activity Type</Label>
                                <Select onValueChange={(val) => setEntry({...entry, type: val})}>
                                    <SelectTrigger className="h-10 font-bold border-slate-200 text-sm rounded-lg bg-white"><SelectValue placeholder="Select type" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="EXPENSE">Operational Expense</SelectItem>
                                        <SelectItem value="MM_RECEIVED">Mobile Money Payment</SelectItem>
                                        <SelectItem value="CASH_PAYMENT">Cash Payment</SelectItem>
                                        <SelectItem value="BANK_DEPOSIT">Bank Deposit</SelectItem>
                                        <SelectItem value="BANK_WITHDRAWAL">Bank Withdrawal</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-slate-600 ml-1">Amount</Label>
                                <div className="relative">
                                    <Input type="number" value={entry.amount} onChange={e => setEntry({...entry, amount: Number(e.target.value)})} className="h-10 font-bold border-slate-200 text-base rounded-lg px-4" />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">CUR</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-slate-600 ml-1">Customer / Name</Label>
                                <Input placeholder="Full name..." value={entry.client_name} onChange={e => setEntry({...entry, client_name: e.target.value})} className="h-10 border-slate-200 rounded-lg text-sm font-medium" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-slate-600 ml-1">Phone Number</Label>
                                <Input placeholder="Contact number..." value={entry.phone} onChange={e => setEntry({...entry, phone: e.target.value})} className="h-10 border-slate-200 rounded-lg text-sm font-medium" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-slate-600 ml-1">Account Specification</Label>
                            <Select onValueChange={(val) => setEntry({...entry, account_id: val})}>
                                <SelectTrigger className="h-10 font-bold border-slate-200 rounded-lg text-sm bg-white"><SelectValue placeholder="Choose target account" /></SelectTrigger>
                                <SelectContent>
                                    {accounts?.map(acc => <SelectItem key={acc.id} value={acc.id} className="font-semibold text-sm">{acc.name} <span className="text-[10px] text-slate-400 ml-2">{acc.subtype}</span></SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-slate-600 ml-1">Description / Memo</Label>
                            <Input placeholder="Enter brief details..." value={entry.description} onChange={e => setEntry({...entry, description: e.target.value})} className="h-10 border-slate-200 rounded-lg text-sm font-medium focus:ring-blue-500/10" />
                        </div>
                    </div>

                    <DialogFooter className="p-6 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-3 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                            <AlertTriangle className="text-amber-500 h-4 w-4" />
                            Record will be locked on save
                        </div>
                        <div className="flex gap-3 w-full sm:w-auto">
                            <Button variant="outline" size="sm" onClick={() => setIsEntryModalOpen(false)} className="font-bold text-slate-500 h-10 px-6 rounded-lg text-xs">Cancel</Button>
                            <Button onClick={() => saveOperation.mutate()} disabled={saveOperation.isPending} className="bg-[#2557D6] hover:bg-[#1e44a8] text-white h-10 px-8 font-bold text-xs shadow-sm rounded-lg transition-all flex-1">
                                {saveOperation.isPending ? <Loader2 className="animate-spin h-4 w-4 mr-2"/> : <Send size={16} className="mr-2"/>}
                                {saveOperation.isPending ? "Saving..." : "Record Transaction"}
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}