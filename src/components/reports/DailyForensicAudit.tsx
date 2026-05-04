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
    Lock, Unlock, Scale, Receipt, Fingerprint, UserCheck
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

// --- IDENTITY & CONTEXT IMPORTS ---
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
    
    // --- REGISTER SESSION MODAL STATES ---
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

    // --- REGISTER FORM STATE ---
    const [sessionForm, setSessionForm] = useState({
        opening_cash: 0,
        petty_cash_fund: 0, 
        actual_closing: 0,
        notes: ''
    });

    // 1. DATA: Daily Cash Records
    const { data: records, isLoading } = useQuery({
        queryKey: ['bbu1_ops_audit', date, tenant?.id],
        queryFn: async () => {
            if (!tenant?.id) return [];
            const { data, error } = await supabase
                .from('view_bbu1_operational_audit_master')
                .select('*')
                .eq('business_id', tenant.id)
                .eq('operational_date', date);
            if (error) throw error;
            return data || [];
        },
        enabled: !!tenant?.id
    });

    // 2. DATA: Accounts
    const { data: accounts } = useQuery({
        queryKey: ['operational_accounts'],
        queryFn: async () => {
            const { data } = await supabase.from('accounting_accounts').select('id, name, subtype').order('name');
            return data || [];
        }
    });

    // 3. DATA: Active Register Session
    const { data: activeSession, isLoading: isSessionLoading } = useQuery({
        queryKey: ['active_ledger_session', date, tenant?.id],
        queryFn: async () => {
            if (!tenant?.id) return null;
            const { data, error } = await supabase
                .from('accounting_daily_ledger_sessions')
                .select('*')
                .eq('business_id', tenant.id)
                .filter('opened_at', 'gte', `${date}T00:00:00Z`)
                .filter('opened_at', 'lte', `${date}T23:59:59Z`)
                .maybeSingle();
            if (error) return null;
            return data;
        },
        enabled: !!tenant?.id
    });

    // 4. MUTATION: Add New Entry
    const saveOperation = useMutation({
        mutationFn: async () => {
            const { error } = await supabase.rpc('proc_record_enterprise_operation', {
                p_business_id: tenant?.id, 
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
            toast.success("Entry saved successfully");
            setIsEntryModalOpen(false);
            setEntry({ type: 'EXPENSE', amount: 0, description: '', account_id: '', client_name: '', phone: '' });
            queryClient.invalidateQueries({ queryKey: ['bbu1_ops_audit'] });
        },
        onError: (e: any) => toast.error(e.message)
    });

    // --- REGISTER CONTROLS ---
    const openDailyLedger = useMutation({
        mutationFn: async () => {
            const { error } = await supabase.from('accounting_daily_ledger_sessions').insert({
                business_id: tenant?.id,
                operator_id: profile?.id,
                opening_cash_balance: sessionForm.opening_cash,
                operational_float_allocation: sessionForm.petty_cash_fund,
                status: 'OPEN',
                notes: sessionForm.notes
            });
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success("Register opened for the day");
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
            toast.success("Register closed and cash balanced");
            setIsClosingModalOpen(false);
            queryClient.invalidateQueries({ queryKey: ['active_ledger_session'] });
        },
        onError: (e: any) => toast.error(e.message)
    });

    const exportCSV = () => {
        const headers = ["Time", "Type", "Recorded By", "Party", "Phone", "Account", "Description", "Income", "Expense"];
        const rows = records?.map(r => [
            format(new Date(r.timestamp), 'HH:mm'), r.activity_type, r.sales_agent, 
            r.customer_name, r.customer_telephone, r.ledger_account, r.operational_details, r.cash_inflow, r.cash_outflow
        ]);
        const csvContent = [headers, ...rows!].map(e => e.join(",")).join("\n");
        const link = document.createElement("a");
        link.href = URL.createObjectURL(new Blob([csvContent], { type: 'text/csv' }));
        link.setAttribute("download", `Daily_Cash_Book_${date}.csv`);
        link.click();
    };

    return (
        <div className="max-w-[1600px] mx-auto py-8 px-6 space-y-8 animate-in fade-in duration-500">
            
            {/* --- HEADER --- */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 border-b border-slate-200 pb-8">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">DAILY CASH BOOK & LOG</h1>
                    <div className="flex items-center gap-3 mt-2">
                        <Badge variant="secondary" className={cn(
                            "font-bold px-4 py-1.5 border uppercase text-[10px] tracking-widest rounded-lg",
                            activeSession?.status === 'OPEN' ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-red-50 text-red-700 border-red-100"
                        )}>
                            {activeSession?.status === 'OPEN' ? 'REGISTER OPEN' : 'REGISTER CLOSED'}
                        </Badge>
                        <span className="text-slate-400 font-bold text-[11px] uppercase tracking-widest flex items-center gap-2">
                           <Building2 size={14} className="text-slate-300"/> {tenant?.business_display_name}
                        </span>
                    </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                    {!activeSession ? (
                        <Button onClick={() => setIsOpeningModalOpen(true)} className="h-12 px-6 font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg gap-2 rounded-xl text-xs uppercase">
                            <Unlock size={16}/> Start New Day
                        </Button>
                    ) : activeSession.status === 'OPEN' ? (
                        <Button onClick={() => setIsClosingModalOpen(true)} className="h-12 px-6 font-bold bg-slate-900 hover:bg-black text-white shadow-lg gap-2 rounded-xl text-xs uppercase">
                            <Lock size={16}/> End Day / Close Register
                        </Button>
                    ) : null}

                    <div className="h-8 w-[1px] bg-slate-200 mx-2 hidden md:block" />

                    <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-12 w-48 font-bold border-slate-200 bg-white text-sm shadow-sm rounded-xl focus:ring-blue-600" />
                    <Button variant="outline" size="sm" onClick={exportCSV} className="h-12 px-5 font-bold border-slate-200 gap-2 bg-white text-slate-600 rounded-xl hover:bg-slate-50 transition-all"><FileSpreadsheet size={18}/> EXCEL</Button>
                    
                    <Button 
                        disabled={!activeSession || activeSession.status !== 'OPEN'}
                        onClick={() => setIsEntryModalOpen(true)} 
                        className="h-12 px-6 font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xl gap-2 rounded-xl transition-all uppercase text-[11px] tracking-widest"
                    >
                        <PlusCircle size={20}/> New Record
                    </Button>
                </div>
            </div>

            {/* --- MAIN DATA CARD --- */}
            <Card className="border-none shadow-xl shadow-slate-200/40 rounded-[2.5rem] overflow-hidden bg-white">
                <CardHeader className="bg-white border-b border-slate-50 p-8">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-8">
                        <div className="flex items-center gap-6">
                            <div className="h-16 w-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 shadow-sm border border-blue-100">
                                <Receipt size={32} />
                            </div>
                            <div>
                                <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">Daily Activity Ledger</CardTitle>
                                <div className="flex items-center gap-4 mt-2">
                                    <div className="flex items-center gap-2 text-slate-400 text-[11px] font-bold uppercase tracking-widest">
                                        <Clock size={14}/> Date: {date}
                                    </div>
                                    <div className="h-1.5 w-1.5 rounded-full bg-slate-200" />
                                    <div className="text-[11px] font-bold uppercase tracking-widest text-blue-600">
                                        Reviewer: {profile?.full_name}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="relative w-full md:w-[450px] group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                            <Input placeholder="Search staff, customer, or notes..." value={search} onChange={e => setSearch(e.target.value)} className="pl-12 h-14 border-slate-100 bg-slate-50/50 rounded-2xl text-sm font-semibold focus:bg-white transition-all shadow-inner" />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <ScrollArea className="h-[600px]">
                        <Table>
                            <TableHeader className="bg-slate-50/80 backdrop-blur-md sticky top-0 z-10 border-b">
                                <TableRow className="hover:bg-transparent border-none">
                                    <TableHead className="px-10 font-bold text-[11px] uppercase h-16 tracking-widest text-slate-500">Record Time</TableHead>
                                    <TableHead className="font-bold text-[11px] uppercase h-16 tracking-widest text-slate-500">Activity / Staff</TableHead>
                                    <TableHead className="font-bold text-[11px] uppercase h-16 tracking-widest text-slate-500">Paid To / Received From</TableHead>
                                    <TableHead className="font-bold text-[11px] uppercase h-16 tracking-widest text-slate-500">Account Category</TableHead>
                                    <TableHead className="text-right font-bold text-[11px] uppercase h-16 tracking-widest text-slate-500">Money In</TableHead>
                                    <TableHead className="text-right px-10 font-bold text-[11px] uppercase h-16 tracking-widest text-slate-500">Money Out</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow><TableCell colSpan={6} className="h-64 text-center text-slate-300 font-bold uppercase text-xs animate-pulse">Loading daily data...</TableCell></TableRow>
                                ) : (
                                    records?.filter(r => r.customer_name.toLowerCase().includes(search.toLowerCase()) || r.sales_agent.toLowerCase().includes(search.toLowerCase())).map((r: any) => (
                                        <TableRow key={r.unique_id} className="hover:bg-slate-50/50 transition-colors border-b border-slate-50">
                                            <TableCell className="px-10 py-6">
                                                <div className="font-mono text-sm font-bold text-slate-900">{format(new Date(r.timestamp), 'HH:mm')}</div>
                                                <div className="text-[10px] font-bold text-slate-400 mt-1 uppercase">REF: {r.reference_no}</div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-bold text-slate-800 text-[14px]">{r.sales_agent}</div>
                                                <Badge variant="outline" className="text-[9px] mt-2 font-bold uppercase bg-white border-slate-200">{r.activity_type}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-bold text-slate-900 text-[14px]">{r.customer_name}</div>
                                                <div className="flex items-center gap-2 text-[10px] font-semibold text-slate-400 mt-1 uppercase">
                                                    <Smartphone size={12} className="text-slate-300"/> {r.customer_telephone}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="text-[12px] font-semibold text-slate-500 truncate max-w-[200px] leading-relaxed italic">"{r.operational_details}"</div>
                                                <div className="flex items-center gap-2 text-[10px] font-bold text-blue-600 mt-2 uppercase">
                                                    <Landmark size={12} /> {r.ledger_account}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right font-bold text-emerald-600 text-[15px] tabular-nums">
                                                {r.cash_inflow > 0 ? `+${r.cash_inflow.toLocaleString()}` : '-'}
                                            </TableCell>
                                            <TableCell className="text-right px-10 font-bold text-red-500 text-[15px] tabular-nums">
                                                {r.cash_outflow > 0 ? `-${r.cash_outflow.toLocaleString()}` : '-'}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </CardContent>
                <CardFooter className="bg-slate-50/50 p-8 border-t flex justify-between items-center">
                    <div className="flex items-center gap-3 text-slate-400">
                        <ShieldCheck size={18} className="text-emerald-500" />
                        <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Reconciled Daily Cash Record</span>
                    </div>
                    {activeSession && (
                        <div className="flex gap-16">
                             <div className="text-right">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Opening Balance</p>
                                <p className="text-lg font-bold text-slate-900 tabular-nums">{activeSession.opening_cash_balance.toLocaleString()} {tenant?.reporting_currency}</p>
                             </div>
                             <div className="text-right">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Petty Cash fund</p>
                                <p className="text-lg font-bold text-blue-600 tabular-nums">{activeSession.operational_float_allocation.toLocaleString()} {tenant?.reporting_currency}</p>
                             </div>
                        </div>
                    )}
                </CardFooter>
            </Card>

            {/* --- MODAL: START DAY --- */}
            <Dialog open={isOpeningModalOpen} onOpenChange={setIsOpeningModalOpen}>
                <DialogContent className="max-w-md rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden bg-white">
                    <div className="p-12 space-y-10">
                        <div className="text-center space-y-4">
                            <div className="h-20 w-20 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 mx-auto shadow-inner border border-emerald-100">
                                <Unlock size={40} />
                            </div>
                            <DialogTitle className="text-2xl font-bold text-slate-900 uppercase">Open Daily Register</DialogTitle>
                            <DialogDescription className="text-sm font-medium text-slate-400">Recording opening cash balances for: {date}</DialogDescription>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1">Starting Cash in Drawer</Label>
                                <Input type="number" value={sessionForm.opening_cash} onChange={e => setSessionForm({...sessionForm, opening_cash: Number(e.target.value)})} className="h-16 rounded-2xl border-none bg-slate-50 font-bold text-2xl px-6 focus-visible:ring-2 focus-visible:ring-emerald-500" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1">Petty Cash / Change Fund</Label>
                                <Input type="number" value={sessionForm.petty_cash_fund} onChange={e => setSessionForm({...sessionForm, petty_cash_fund: Number(e.target.value)})} className="h-16 rounded-2xl border-none bg-slate-50 font-bold text-2xl px-6 focus-visible:ring-2 focus-visible:ring-blue-500" />
                            </div>
                        </div>

                        <Button onClick={() => openDailyLedger.mutate()} disabled={openDailyLedger.isPending} className="w-full h-20 bg-emerald-600 hover:bg-emerald-700 text-white font-bold uppercase tracking-widest rounded-2xl shadow-xl shadow-emerald-600/20 transition-all active:scale-95 text-sm">
                            {openDailyLedger.isPending ? "Opening..." : "Confirm & Start Day"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* --- MODAL: NEW TRANSACTION --- */}
            <Dialog open={isEntryModalOpen} onOpenChange={setIsEntryModalOpen}>
                <DialogContent className="max-w-xl rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden bg-white">
                    <div className="bg-slate-50/50 border-b border-slate-100 p-8">
                        <div className="flex items-center gap-6">
                            <div className="h-14 w-14 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center text-blue-600">
                                <Send size={28} />
                            </div>
                            <div>
                                <DialogTitle className="text-2xl font-bold text-slate-900 uppercase">New Cash Entry</DialogTitle>
                                <DialogDescription className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Manual entry into the daily cash book</DialogDescription>
                            </div>
                        </div>
                    </div>
                    
                    <div className="p-10 space-y-10">
                        <div className="grid grid-cols-2 gap-8">
                            <div className="space-y-3">
                                <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1">Type</Label>
                                <Select onValueChange={(val) => setEntry({...entry, type: val})}>
                                    <SelectTrigger className="h-14 font-bold border-slate-100 bg-slate-50/50 text-[12px] uppercase rounded-xl shadow-inner"><SelectValue placeholder="SELECT TYPE" /></SelectTrigger>
                                    <SelectContent className="rounded-2xl border-none shadow-2xl">
                                        <SelectItem value="EXPENSE" className="text-xs font-bold uppercase py-4">BUSINESS EXPENSE</SelectItem>
                                        <SelectItem value="ADDITION" className="text-xs font-bold uppercase py-4">CASH INJECTION</SelectItem>
                                        <SelectItem value="MM_RECEIVED" className="text-xs font-bold uppercase py-4">MOBILE MONEY PAYMENT</SelectItem>
                                        <SelectItem value="CASH_PAYMENT" className="text-xs font-bold uppercase py-4">CASH SALE INCOME</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-3">
                                <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1">Total Amount</Label>
                                <div className="relative">
                                    <Input type="number" value={entry.amount} onChange={e => setEntry({...entry, amount: Number(e.target.value)})} className="h-14 font-bold border-none bg-slate-50/50 text-xl rounded-xl px-5 tabular-nums focus-visible:ring-2 focus-visible:ring-blue-600 shadow-inner" />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400 uppercase">{tenant?.reporting_currency}</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-8">
                            <div className="space-y-3">
                                <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                                    <UserCheck size={14} className="text-blue-500"/> Paid To / From
                                </Label>
                                <Input placeholder="Name of person or shop..." value={entry.client_name} onChange={e => setEntry({...entry, client_name: e.target.value})} className="h-14 border-none bg-slate-50/50 rounded-xl text-[14px] font-semibold px-5 shadow-inner" />
                            </div>
                            <div className="space-y-3">
                                <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                                    <Smartphone size={14} className="text-blue-500"/> Phone Number
                                </Label>
                                <Input placeholder="Contact phone..." value={entry.phone} onChange={e => setEntry({...entry, phone: e.target.value})} className="h-14 border-none bg-slate-50/50 rounded-xl text-[14px] font-semibold px-5 shadow-inner" />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                                <Landmark size={14} className="text-blue-500"/> Accounting Category
                            </Label>
                            <Select onValueChange={(val) => setEntry({...entry, account_id: val})}>
                                <SelectTrigger className="h-14 font-bold border-slate-100 bg-slate-50/50 text-[12px] uppercase rounded-xl shadow-inner"><SelectValue placeholder="SELECT CATEGORY" /></SelectTrigger>
                                <SelectContent className="rounded-2xl border-none shadow-2xl max-h-[300px]">
                                    {accounts?.map(acc => <SelectItem key={acc.id} value={acc.id} className="font-bold text-xs uppercase py-4">{acc.name} <span className="text-[10px] text-blue-500 ml-2 opacity-60">[{acc.subtype}]</span></SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-3">
                            <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1">Details / Reason</Label>
                            <Input placeholder="Enter a brief note about this record..." value={entry.description} onChange={e => setEntry({...entry, description: e.target.value})} className="h-14 border-none bg-slate-50/50 rounded-xl text-[14px] font-semibold px-5 focus-visible:ring-2 focus-visible:ring-blue-600 shadow-inner" />
                        </div>
                    </div>

                    <DialogFooter className="p-8 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-3 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                            <ShieldCheck size={16} className="text-emerald-500" />
                            Authorized Cash Entry
                        </div>
                        <div className="flex gap-4 w-full sm:w-auto">
                            <Button variant="ghost" size="sm" onClick={() => setIsEntryModalOpen(false)} className="font-bold text-slate-400 h-12 px-8 rounded-xl text-[11px] uppercase">Cancel</Button>
                            <Button onClick={() => saveOperation.mutate()} disabled={saveOperation.isPending} className="bg-blue-600 hover:bg-blue-700 text-white h-12 px-10 font-bold text-[11px] shadow-xl shadow-blue-600/30 rounded-xl transition-all flex-1 uppercase tracking-widest">
                                {saveOperation.isPending ? <Loader2 className="animate-spin h-5 w-5 mr-3"/> : "Save Record"}
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* --- MODAL: END DAY --- */}
            <Dialog open={isClosingModalOpen} onOpenChange={setIsClosingModalOpen}>
                <DialogContent className="max-w-md rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden bg-white">
                    <div className="p-12 space-y-10">
                        <div className="text-center space-y-4">
                            <div className="h-20 w-20 bg-red-50 rounded-2xl flex items-center justify-center text-red-600 mx-auto border border-red-100 shadow-inner">
                                <Lock size={40} />
                            </div>
                            <DialogTitle className="text-2xl font-bold text-slate-900 uppercase">Close Cash Register</DialogTitle>
                            <DialogDescription className="text-sm font-medium text-slate-400 uppercase tracking-widest">Reconcile cash for: {date}</DialogDescription>
                        </div>

                        <div className="p-8 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                            <div className="flex justify-between items-center text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                                <span>Expected Cash In Hand</span>
                                <Scale className="h-4 w-4 opacity-40" />
                            </div>
                            <p className="text-2xl font-black text-slate-900 tabular-nums tracking-tighter">CASH BOOK RECONCILIATION</p>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1">Actual Physical Cash in Drawer</Label>
                            <Input type="number" value={sessionForm.actual_closing} onChange={e => setSessionForm({...sessionForm, actual_closing: Number(e.target.value)})} className="h-16 rounded-2xl border-none bg-slate-50 font-bold text-2xl px-6 focus-visible:ring-2 focus-visible:ring-red-500 shadow-inner" />
                        </div>

                        <Button onClick={() => sealDailyLedger.mutate()} disabled={sealDailyLedger.isPending} className="w-full h-20 bg-slate-900 hover:bg-black text-white font-bold uppercase tracking-widest rounded-2xl shadow-xl transition-all active:scale-95 text-sm">
                            {sealDailyLedger.isPending ? "Sealing..." : "Finalize & Reconcile Day"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* --- FOOTER --- */}
            <div className="flex justify-center items-center gap-6 py-12 opacity-30">
                <div className="h-[1px] w-24 bg-slate-200" />
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.5em]">
                    &copy; {new Date().getFullYear()} LITONU BUSINESS BASE UNIVERSE LTD
                </p>
                <div className="h-[1px] w-24 bg-slate-200" />
            </div>
        </div>
    );
}