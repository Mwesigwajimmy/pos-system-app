'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
    ShieldCheck, ArrowUpRight, ArrowDownRight, User, Phone,
    Download, Search, Loader2, PlusCircle, Landmark, 
    FileSpreadsheet, Send, Smartphone, Clock, AlertTriangle, Filter, Wallet, Building2,
    Lock, Unlock, Scale, Receipt, Fingerprint
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

// --- DEEP IDENTITY IMPORTS ---
import { useUserProfile } from '@/hooks/useUserProfile';
import { useTenant } from '@/hooks/useTenant';
import { cn } from '@/lib/utils';

const supabase = createClient();

export default function DailyForensicAudit() {
    const queryClient = useQueryClient();
    const { data: profile } = useUserProfile();
    const { data: tenant } = useTenant();
    
    const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [search, setSearch] = useState('');
    const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
    
    // --- SESSION MODAL STATES ---
    const [isOpeningModalOpen, setIsOpeningModalOpen] = useState(false);
    const [isClosingModalOpen, setIsClosingModalOpen] = useState(false);

    // --- FORM STATE ---
    const [entry, setEntry] = useState({ 
        type: 'EXPENSE', 
        amount: 0, 
        description: '', 
        account_id: '',
        client_name: '',
        phone: ''
    });

    // --- SESSION FORM STATE ---
    const [sessionForm, setSessionForm] = useState({
        opening_cash: 0,
        petty_cash_fund: 0, // Replaced float_allocation
        actual_closing: 0,
        notes: ''
    });

    // 1. DATA: Master Activity Stream
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

    // 2. DATA: Chart of Accounts
    const { data: accounts } = useQuery({
        queryKey: ['operational_accounts'],
        queryFn: async () => {
            const { data } = await supabase.from('accounting_accounts').select('id, name, subtype').order('name');
            return data || [];
        }
    });

    // 3. DATA: Active Ledger Session
    const { data: activeSession, isLoading: isSessionLoading } = useQuery({
        queryKey: ['active_ledger_session', date, tenant?.id],
        queryFn: async () => {
            if (!tenant?.id) return null;
            const { data, error } = await supabase
                .from('accounting_daily_ledger_sessions')
                .select('*')
                .filter('opened_at', 'gte', `${date}T00:00:00Z`)
                .filter('opened_at', 'lte', `${date}T23:59:59Z`)
                .maybeSingle();
            if (error) return null;
            return data;
        },
        enabled: !!tenant?.id
    });

    // 4. MUTATION: Record New Transaction
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

    // --- SESSION MUTATIONS ---
    const openDailyLedger = useMutation({
        mutationFn: async () => {
            const { error } = await supabase.from('accounting_daily_ledger_sessions').insert({
                business_id: tenant?.id,
                operator_id: profile?.id,
                opening_cash_balance: sessionForm.opening_cash,
                operational_float_allocation: sessionForm.petty_cash_fund, // Mapped to DB column
                status: 'OPEN',
                notes: sessionForm.notes
            });
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success("Daily Register opened successfully");
            setIsOpeningModalOpen(false);
            queryClient.invalidateQueries({ queryKey: ['active_ledger_session'] });
        },
        onError: (e: any) => toast.error(e.message)
    });

    const sealDailyLedger = useMutation({
        mutationFn: async () => {
            const { error } = await supabase.rpc('proc_finalize_daily_ledger', {
                p_session_id: activeSession.id,
                p_actual_closing: sessionForm.actual_closing
            });
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success("Daily Register closed and reconciled");
            setIsClosingModalOpen(false);
            queryClient.invalidateQueries({ queryKey: ['active_ledger_session'] });
        },
        onError: (e: any) => toast.error(e.message)
    });

    // --- EXPORTS ---
    const exportCSV = () => {
        const headers = ["Time", "Type", "Staff", "Customer", "Phone", "Account", "Notes", "Inflow", "Outflow"];
        const rows = records?.map(r => [
            format(new Date(r.timestamp), 'HH:mm'), r.activity_type, r.sales_agent, 
            r.customer_name, r.customer_telephone, r.ledger_account, r.operational_details, r.cash_inflow, r.cash_outflow
        ]);
        const csvContent = [headers, ...rows!].map(e => e.join(",")).join("\n");
        const link = document.createElement("a");
        link.href = URL.createObjectURL(new Blob([csvContent], { type: 'text/csv' }));
        link.setAttribute("download", `Daily_Transaction_Report_${date}.csv`);
        link.click();
    };

    const exportPDF = () => {
        const doc = new jsPDF('l', 'mm', 'a4');
        doc.setFontSize(18); doc.text(`Daily Activity Report: ${date}`, 14, 20);
        autoTable(doc, {
            startY: 30,
            head: [['Time', 'Activity', 'Staff', 'Customer', 'Phone', 'Notes', 'Cash In', 'Cash Out']],
            body: records?.map(r => [
                format(new Date(r.timestamp), 'HH:mm'), r.activity_type, r.sales_agent, r.customer_name, 
                r.customer_telephone, r.operational_details, r.cash_inflow.toLocaleString(), r.cash_outflow.toLocaleString()
            ]),
            styles: { fontSize: 8 },
            headStyles: { fillColor: [37, 87, 214] }
        });
        doc.save(`Daily_Activity_Report_${date}.pdf`);
    };

    return (
        <div className="max-w-[1600px] mx-auto py-8 px-6 space-y-6 animate-in fade-in duration-500">
            {/* TOP HEADER COMMAND BAR */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 border-b border-slate-200 pb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">CASH BOOK & ACTIVITY LOG</h1>
                    <div className="flex items-center gap-2 mt-1.5">
                        <Badge variant="secondary" className={cn(
                            "font-bold px-3 py-1 border uppercase text-[10px] tracking-wider",
                            activeSession?.status === 'OPEN' ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-red-50 text-red-700 border-red-100"
                        )}>
                            {activeSession?.status === 'OPEN' ? 'REGISTER OPEN' : 'REGISTER CLOSED'}
                        </Badge>
                        <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest ml-2 flex items-center gap-2">
                           <Building2 size={12}/> {tenant?.business_display_name}
                        </p>
                    </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                    {/* Register Controls */}
                    {!activeSession ? (
                        <Button onClick={() => setIsOpeningModalOpen(true)} className="h-11 px-6 font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md gap-2 rounded-xl text-xs uppercase">
                            <Unlock size={16}/> Open Daily Register
                        </Button>
                    ) : activeSession.status === 'OPEN' ? (
                        <Button onClick={() => setIsClosingModalOpen(true)} className="h-11 px-6 font-bold bg-slate-900 hover:bg-black text-white shadow-md gap-2 rounded-xl text-xs uppercase">
                            <Lock size={16}/> Close Daily Register
                        </Button>
                    ) : null}

                    <div className="h-8 w-[1px] bg-slate-200 mx-2 hidden md:block" />

                    <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-11 w-44 font-bold border-slate-200 bg-white text-xs" />
                    <Button variant="outline" size="sm" onClick={exportCSV} className="h-11 px-4 font-bold border-slate-200 gap-2 bg-white text-slate-600 rounded-xl hover:bg-slate-50"><FileSpreadsheet size={16}/> EXCEL</Button>
                    <Button variant="outline" size="sm" onClick={exportPDF} className="h-11 px-4 font-bold border-slate-200 gap-2 bg-white text-slate-600 rounded-xl hover:bg-slate-50"><Download size={16}/> PDF</Button>
                    
                    <Button 
                        disabled={!activeSession || activeSession.status !== 'OPEN'}
                        onClick={() => setIsEntryModalOpen(true)} 
                        className="h-11 px-6 font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-lg gap-2 rounded-xl transition-all uppercase text-[10px] tracking-widest"
                    >
                        <PlusCircle size={18}/> New Transaction
                    </Button>
                </div>
            </div>

            {/* MAIN ACTIVITY CARD */}
            <Card className="border-none shadow-xl shadow-slate-200/40 rounded-[2rem] overflow-hidden bg-white">
                <CardHeader className="bg-white border-b border-slate-50 p-8">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-8">
                        <div className="flex items-center gap-5">
                            <div className="h-14 w-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 shadow-sm border border-blue-100">
                                <ShieldCheck size={28} />
                            </div>
                            <div>
                                <CardTitle className="text-xl font-bold tracking-tight text-slate-900 uppercase">Daily Business Activity</CardTitle>
                                <div className="flex items-center gap-3 mt-1.5">
                                    <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                                        <Clock size={12}/> Reported: {date}
                                    </div>
                                    <div className="h-1 w-1 rounded-full bg-slate-200" />
                                    <div className="text-[10px] font-bold uppercase tracking-widest text-blue-600">
                                        Reviewing: {profile?.full_name}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="relative w-full md:w-96 group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 transition-colors group-focus-within:text-blue-500" />
                            <Input placeholder="Search daily transactions..." value={search} onChange={e => setSearch(e.target.value)} className="pl-12 h-12 border-slate-100 bg-slate-50/50 rounded-2xl text-sm font-semibold focus:bg-white transition-all shadow-inner" />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <ScrollArea className="h-[600px]">
                        <Table>
                            <TableHeader className="bg-slate-50/80 backdrop-blur-md sticky top-0 z-10 border-b">
                                <TableRow className="hover:bg-transparent border-none">
                                    <TableHead className="px-8 font-bold text-[10px] uppercase h-14 tracking-wider text-slate-500">Timestamp</TableHead>
                                    <TableHead className="font-bold text-[10px] uppercase h-14 tracking-wider text-slate-500">Activity Type</TableHead>
                                    <TableHead className="font-bold text-[10px] uppercase h-14 tracking-wider text-slate-500">Customer / Vendor</TableHead>
                                    <TableHead className="font-bold text-[10px] uppercase h-14 tracking-wider text-slate-500">Accounting Note</TableHead>
                                    <TableHead className="text-right font-bold text-[10px] uppercase h-14 tracking-wider text-slate-500">Cash In</TableHead>
                                    <TableHead className="text-right px-8 font-bold text-[10px] uppercase h-14 tracking-wider text-slate-500">Cash Out</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow><TableCell colSpan={6} className="h-64 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <Loader2 className="animate-spin h-10 w-10 text-blue-600"/>
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Loading daily data...</span>
                                        </div>
                                    </TableCell></TableRow>
                                ) : records?.length === 0 ? (
                                    <TableRow><TableCell colSpan={6} className="h-64 text-center">
                                        <div className="flex flex-col items-center gap-2 opacity-30">
                                            <FileSpreadsheet size={48}/>
                                            <span className="text-xs font-bold uppercase">No transactions recorded today</span>
                                        </div>
                                    </TableCell></TableRow>
                                ) : records?.filter(r => r.customer_name.toLowerCase().includes(search.toLowerCase()) || r.sales_agent.toLowerCase().includes(search.toLowerCase())).map((r: any) => (
                                    <TableRow key={r.unique_id} className="hover:bg-slate-50/50 transition-colors border-b border-slate-50">
                                        <TableCell className="px-8 py-6">
                                            <div className="font-mono text-sm font-bold text-slate-900">{format(new Date(r.timestamp), 'HH:mm')}</div>
                                            <div className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-widest">ID: {r.reference_no}</div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2 font-bold text-slate-800 text-[13px]">
                                                Staff: {r.sales_agent}
                                            </div>
                                            <Badge variant="secondary" className="text-[9px] mt-2 font-bold uppercase tracking-widest rounded-md bg-white border">{r.activity_type}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-bold text-slate-900 text-sm">{r.customer_name}</div>
                                            <div className="flex items-center gap-2 text-[10px] font-medium text-slate-400 mt-1 uppercase">
                                                <Phone size={10} className="text-slate-300"/> {r.customer_telephone}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-[11px] font-semibold text-slate-500 truncate max-w-[200px]">{r.operational_details}</div>
                                            <div className="flex items-center gap-1.5 text-[9px] font-bold text-blue-600 mt-1.5 uppercase">
                                                <Landmark size={10} /> {r.ledger_account}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right font-bold text-emerald-600 text-base tabular-nums">
                                            {r.cash_inflow > 0 ? `+${r.cash_inflow.toLocaleString()}` : '-'}
                                        </TableCell>
                                        <TableCell className="text-right px-8 font-bold text-red-500 text-base tabular-nums">
                                            {r.cash_outflow > 0 ? `-${r.cash_outflow.toLocaleString()}` : '-'}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </CardContent>
                <CardFooter className="bg-slate-50/50 p-8 border-t flex justify-between items-center">
                    <div className="flex items-center gap-3 text-slate-400">
                        <ShieldCheck size={16} />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Daily Integrity Reconciled</span>
                    </div>
                    {activeSession && (
                        <div className="flex gap-10">
                             <div className="text-right">
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Opening Balance</p>
                                <p className="text-sm font-bold text-slate-900 tabular-nums">{activeSession.opening_cash_balance.toLocaleString()} {tenant?.currency_code || 'UGX'}</p>
                             </div>
                             <div className="text-right">
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Petty Cash Fund</p>
                                <p className="text-sm font-bold text-blue-600 tabular-nums">{activeSession.operational_float_allocation.toLocaleString()} {tenant?.currency_code || 'UGX'}</p>
                             </div>
                        </div>
                    )}
                </CardFooter>
            </Card>

            {/* --- MODAL: OPEN DAILY REGISTER --- */}
            <Dialog open={isOpeningModalOpen} onOpenChange={setIsOpeningModalOpen}>
                <DialogContent className="max-w-md rounded-[2rem] border-none shadow-2xl p-0 overflow-hidden bg-white">
                    <div className="p-10 space-y-8">
                        <div className="text-center space-y-3">
                            <div className="h-16 w-16 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 mx-auto border border-emerald-100">
                                <Unlock size={32} />
                            </div>
                            <DialogTitle className="text-2xl font-bold text-slate-900 uppercase">Open Daily Register</DialogTitle>
                            <DialogDescription className="text-xs font-bold text-slate-400 uppercase">Prepare cash and funds for: {date}</DialogDescription>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Starting Cash in Till</Label>
                                <Input type="number" value={sessionForm.opening_cash} onChange={e => setSessionForm({...sessionForm, opening_cash: Number(e.target.value)})} className="h-14 rounded-2xl border-none bg-slate-50 font-bold text-xl px-6 focus-visible:ring-2 focus-visible:ring-emerald-500" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Daily Petty Cash Fund</Label>
                                <Input type="number" value={sessionForm.petty_cash_fund} onChange={e => setSessionForm({...sessionForm, petty_cash_fund: Number(e.target.value)})} className="h-14 rounded-2xl border-none bg-slate-50 font-bold text-xl px-6 focus-visible:ring-2 focus-visible:ring-blue-500" />
                            </div>
                        </div>

                        <Button onClick={() => openDailyLedger.mutate()} disabled={openDailyLedger.isPending} className="w-full h-16 bg-emerald-600 hover:bg-emerald-700 text-white font-bold uppercase tracking-widest rounded-2xl shadow-lg transition-all active:scale-95">
                            {openDailyLedger.isPending ? "Opening..." : "Authorize & Open Day"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* --- MODAL: CLOSE DAILY REGISTER --- */}
            <Dialog open={isClosingModalOpen} onOpenChange={setIsClosingModalOpen}>
                <DialogContent className="max-w-md rounded-[2rem] border-none shadow-2xl p-0 overflow-hidden bg-white">
                    <div className="p-10 space-y-8">
                        <div className="text-center space-y-3">
                            <div className="h-16 w-16 bg-red-50 rounded-2xl flex items-center justify-center text-red-600 mx-auto border border-red-100">
                                <Lock size={32} />
                            </div>
                            <DialogTitle className="text-2xl font-bold text-slate-900 uppercase">Close Daily Register</DialogTitle>
                            <DialogDescription className="text-xs font-bold text-slate-400 uppercase tracking-widest">Verify and finalize accounts for: {date}</DialogDescription>
                        </div>

                        <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                            <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                <span>Expected System Balance</span>
                                <span>Physical Cash Count</span>
                            </div>
                            <div className="flex justify-between items-baseline mt-1">
                                <span className="text-sm font-bold text-slate-500 italic">Calculating...</span>
                                <Scale className="h-4 w-4 text-slate-300" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Actual Physical Cash at Close</Label>
                            <Input type="number" value={sessionForm.actual_closing} onChange={e => setSessionForm({...sessionForm, actual_closing: Number(e.target.value)})} className="h-16 rounded-2xl border-none bg-slate-50 font-bold text-2xl px-6 focus-visible:ring-2 focus-visible:ring-red-500" />
                        </div>

                        <div className="flex flex-col gap-4">
                            <Button onClick={() => sealDailyLedger.mutate()} disabled={sealDailyLedger.isPending} className="w-full h-16 bg-slate-900 hover:bg-black text-white font-bold uppercase tracking-widest rounded-2xl shadow-xl transition-all active:scale-95">
                                {sealDailyLedger.isPending ? "Finalizing..." : "Finalize & Reconcile Day"}
                            </Button>
                            <div className="flex items-center justify-center gap-2 opacity-60">
                                <AlertTriangle size={12} className="text-amber-500" />
                                <span className="text-[9px] font-bold uppercase text-slate-500">This will lock all transactions for today</span>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* MODAL: NEW TRANSACTION ENTRY */}
            <Dialog open={isEntryModalOpen} onOpenChange={setIsEntryModalOpen}>
                <DialogContent className="max-w-xl rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden bg-white">
                    <div className="bg-slate-50/50 border-b border-slate-100 p-8">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center text-blue-600">
                                <Send size={24} />
                            </div>
                            <div>
                                <DialogTitle className="text-xl font-bold text-slate-900 uppercase">Record Daily Transaction</DialogTitle>
                                <DialogDescription className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Direct manual ledger entry</DialogDescription>
                            </div>
                        </div>
                    </div>
                    
                    <div className="p-10 space-y-8">
                        <div className="grid grid-cols-2 gap-8">
                            <div className="space-y-2.5">
                                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Transaction Category</Label>
                                <Select onValueChange={(val) => setEntry({...entry, type: val})}>
                                    <SelectTrigger className="h-12 font-bold border-slate-100 bg-slate-50/50 text-[11px] uppercase rounded-xl"><SelectValue placeholder="SELECT TYPE" /></SelectTrigger>
                                    <SelectContent className="border-none shadow-2xl rounded-2xl">
                                        <SelectItem value="EXPENSE" className="text-xs font-bold uppercase py-3">BUSINESS EXPENSE</SelectItem>
                                        <SelectItem value="MM_RECEIVED" className="text-xs font-bold uppercase py-3">MOBILE MONEY RECEIVED</SelectItem>
                                        <SelectItem value="CASH_PAYMENT" className="text-xs font-bold uppercase py-3">CASH PAYMENT</SelectItem>
                                        <SelectItem value="BANK_DEPOSIT" className="text-xs font-bold uppercase py-3">BANK DEPOSIT</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2.5">
                                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Amount</Label>
                                <div className="relative">
                                    <Input type="number" value={entry.amount} onChange={e => setEntry({...entry, amount: Number(e.target.value)})} className="h-12 font-bold border-none bg-slate-50/50 text-lg rounded-xl px-5 tabular-nums focus-visible:ring-2 focus-visible:ring-blue-600" />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 uppercase">{tenant?.currency_code || 'UGX'}</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-8">
                            <div className="space-y-2.5">
                                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Customer / Vendor Name</Label>
                                <Input placeholder="Name..." value={entry.client_name} onChange={e => setEntry({...entry, client_name: e.target.value})} className="h-12 border-none bg-slate-50/50 rounded-xl text-[13px] font-semibold px-5" />
                            </div>
                            <div className="space-y-2.5">
                                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Phone Number</Label>
                                <Input placeholder="Phone..." value={entry.phone} onChange={e => setEntry({...entry, phone: e.target.value})} className="h-12 border-none bg-slate-50/50 rounded-xl text-[13px] font-semibold px-5" />
                            </div>
                        </div>

                        <div className="space-y-2.5">
                            <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Accounting Account</Label>
                            <Select onValueChange={(val) => setEntry({...entry, account_id: val})}>
                                <SelectTrigger className="h-12 font-bold border-slate-100 bg-slate-50/50 text-[11px] uppercase rounded-xl"><SelectValue placeholder="SELECT ACCOUNT" /></SelectTrigger>
                                <SelectContent className="border-none shadow-2xl rounded-2xl max-h-[300px]">
                                    {accounts?.map(acc => <SelectItem key={acc.id} value={acc.id} className="font-bold text-xs uppercase py-3">{acc.name} <span className="text-[9px] text-blue-500 ml-2">{acc.subtype}</span></SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2.5">
                            <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Transaction Notes</Label>
                            <Input placeholder="Enter details..." value={entry.description} onChange={e => setEntry({...entry, description: e.target.value})} className="h-12 border-none bg-slate-50/50 rounded-xl text-[13px] font-semibold px-5" />
                        </div>
                    </div>

                    <DialogFooter className="p-8 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-3 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                            <ShieldCheck className="text-emerald-500 h-4 w-4" />
                            Secure Transaction Entry
                        </div>
                        <div className="flex gap-4 w-full sm:w-auto">
                            <Button variant="ghost" size="sm" onClick={() => setIsEntryModalOpen(false)} className="font-bold text-slate-400 h-12 px-8 rounded-xl text-[10px] uppercase hover:text-slate-900">Cancel</Button>
                            <Button onClick={() => saveOperation.mutate()} disabled={saveOperation.isPending} className="bg-blue-600 hover:bg-blue-700 text-white h-12 px-10 font-bold text-[10px] shadow-lg rounded-xl transition-all flex-1 uppercase tracking-widest">
                                {saveOperation.isPending ? <Loader2 className="animate-spin h-4 w-4 mr-3"/> : <ShieldCheck size={18} className="mr-3"/>}
                                {saveOperation.isPending ? "Saving..." : "Save Record"}
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* INSTITUTIONAL COPYRIGHT */}
            <div className="flex justify-center items-center gap-6 py-12 opacity-30">
                <div className="h-[1px] w-24 bg-slate-200" />
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.5em]">
                    &copy; {new Date().getFullYear()} LITONU BUSINESS BASE UNIVERSE LTD
                </p>
                <div className="h-[1px] w-24 bg-slate-200" />
            </div>
        </div>
    );
}