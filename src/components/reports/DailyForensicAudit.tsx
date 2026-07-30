'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, Search, Loader2, Plus, Lock, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from 'date-fns';
import toast from 'react-hot-toast';

import { useUserProfile } from '@/hooks/useUserProfile';
import { useTenant } from '@/hooks/useTenant';
import { cn } from '@/lib/utils';

const supabase = createClient();

const fmt = (value: number) => (Number(value) || 0).toLocaleString();

function Metric({ label, value, currency }: { label: string; value: string; currency?: string }) {
    return (
        <div className="px-6 py-5">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">{label}</p>
            <p className="mt-2 text-xl font-semibold tabular-nums tracking-tight text-slate-900">
                {value}
                {currency ? <span className="ml-1.5 text-xs font-normal text-slate-400">{currency}</span> : null}
            </p>
        </div>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="space-y-2">
            <Label className="text-xs font-medium text-slate-500">{label}</Label>
            {children}
        </div>
    );
}

export default function DailyForensicAudit() {
    const queryClient = useQueryClient();
    const { data: profile } = useUserProfile();
    const { data: tenant } = useTenant();

    const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [search, setSearch] = useState('');
    const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
    const [isOpeningModalOpen, setIsOpeningModalOpen] = useState(false);
    const [isClosingModalOpen, setIsClosingModalOpen] = useState(false);

    const [entry, setEntry] = useState({
        type: 'EXPENSE',
        amount: 0,
        description: '',
        account_id: '',
        client_name: '',
        phone: ''
    });

    const [sessionForm, setSessionForm] = useState({
        opening_cash: 0,
        petty_cash_fund: 0,
        actual_closing: 0,
        notes: ''
    });

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

    const { data: accounts } = useQuery({
        queryKey: ['operational_accounts'],
        queryFn: async () => {
            const { data } = await supabase.from('accounting_accounts').select('id, name, subtype').order('name');
            return data || [];
        }
    });

    const { data: activeSession } = useQuery({
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
            toast.success("Entry saved");
            setIsEntryModalOpen(false);
            setEntry({ type: 'EXPENSE', amount: 0, description: '', account_id: '', client_name: '', phone: '' });
            queryClient.invalidateQueries({ queryKey: ['bbu1_ops_audit'] });
        },
        onError: (e: any) => toast.error(e.message)
    });

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
            toast.success("Register opened");
            setIsOpeningModalOpen(false);
            queryClient.invalidateQueries({ queryKey: ['active_ledger_session'] });
        },
        onError: (e: any) => toast.error(e.message)
    });

    const sealDailyLedger = useMutation({
        mutationFn: async () => {
            const { error } = await supabase.rpc('proc_finalize_daily_ledger', {
                p_session_id: activeSession?.id,
                p_actual_closing: sessionForm.actual_closing
            });
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success("Register closed");
            setIsClosingModalOpen(false);
            queryClient.invalidateQueries({ queryKey: ['active_ledger_session'] });
        },
        onError: (e: any) => toast.error(e.message)
    });

    const totals = useMemo(() => {
        const list = records || [];
        const moneyIn = list.reduce((sum: number, r: any) => sum + (Number(r.cash_inflow) || 0), 0);
        const moneyOut = list.reduce((sum: number, r: any) => sum + (Number(r.cash_outflow) || 0), 0);
        const opening = Number(activeSession?.opening_cash_balance) || 0;
        const petty = Number(activeSession?.operational_float_allocation) || 0;
        return { moneyIn, moneyOut, opening, petty, expected: opening + petty + moneyIn - moneyOut };
    }, [records, activeSession]);

    const variance = (Number(sessionForm.actual_closing) || 0) - totals.expected;

    const filtered = useMemo(() => {
        const term = search.trim().toLowerCase();
        const list = records || [];
        if (!term) return list;
        return list.filter((r: any) =>
            (r.customer_name || '').toLowerCase().includes(term) ||
            (r.sales_agent || '').toLowerCase().includes(term) ||
            (r.operational_details || '').toLowerCase().includes(term) ||
            (r.reference_no || '').toLowerCase().includes(term)
        );
    }, [records, search]);

    const exportCSV = () => {
        if (!records?.length) {
            toast.error("Nothing to export");
            return;
        }
        const headers = ["Time", "Type", "Recorded by", "Party", "Phone", "Account", "Description", "Money in", "Money out"];
        const rows = records.map((r: any) => [
            format(new Date(r.timestamp), 'HH:mm'), r.activity_type, r.sales_agent,
            r.customer_name, r.customer_telephone, r.ledger_account, r.operational_details, r.cash_inflow, r.cash_outflow
        ]);
        const escape = (cell: any) => `"${String(cell ?? '').replace(/"/g, '""')}"`;
        const csvContent = [headers, ...rows].map(row => row.map(escape).join(",")).join("\n");
        const link = document.createElement("a");
        link.href = URL.createObjectURL(new Blob([csvContent], { type: 'text/csv' }));
        link.setAttribute("download", `Cash_Book_${date}.csv`);
        link.click();
    };

    const isOpen = activeSession?.status === 'OPEN';
    const currency = tenant?.reporting_currency;

    return (
        <div className="mx-auto w-full max-w-[1600px] space-y-6 px-4 pb-16 xl:px-8">
            <div className="flex flex-col gap-5 border-b border-slate-200 pb-6 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <h1 className="text-xl font-semibold tracking-tight text-slate-900">Cash Book</h1>
                    <div className="mt-2 flex items-center gap-3">
                        <Badge
                            variant="secondary"
                            className={cn(
                                "rounded-md px-2.5 py-1 text-xs font-medium",
                                isOpen ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                            )}
                        >
                            {isOpen ? 'Register open' : 'Register closed'}
                        </Badge>
                        <span className="text-sm text-slate-500">{tenant?.business_display_name}</span>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <Input
                        type="date"
                        value={date}
                        onChange={e => setDate(e.target.value)}
                        className="h-9 w-40 rounded-lg border-slate-200 text-sm"
                    />
                    <Button
                        variant="outline"
                        onClick={exportCSV}
                        className="h-9 rounded-lg border-slate-200 px-4 text-xs font-medium"
                    >
                        <Download size={14} className="mr-2 text-slate-400" />
                        Export CSV
                    </Button>
                    {!activeSession ? (
                        <Button
                            onClick={() => setIsOpeningModalOpen(true)}
                            className="h-9 rounded-lg bg-slate-900 px-4 text-xs font-medium text-white hover:bg-slate-800"
                        >
                            <Unlock size={14} className="mr-2" />
                            Open register
                        </Button>
                    ) : isOpen ? (
                        <Button
                            variant="outline"
                            onClick={() => setIsClosingModalOpen(true)}
                            className="h-9 rounded-lg border-slate-200 px-4 text-xs font-medium"
                        >
                            <Lock size={14} className="mr-2 text-slate-400" />
                            Close register
                        </Button>
                    ) : null}
                    <Button
                        disabled={!isOpen}
                        onClick={() => setIsEntryModalOpen(true)}
                        className="h-9 rounded-lg bg-slate-900 px-4 text-xs font-medium text-white hover:bg-slate-800"
                    >
                        <Plus size={14} className="mr-2" />
                        New entry
                    </Button>
                </div>
            </div>

            <div className="grid divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white sm:grid-cols-2 sm:divide-y-0 sm:divide-x xl:grid-cols-5">
                <Metric label="Opening cash" value={fmt(totals.opening)} currency={currency} />
                <Metric label="Petty cash" value={fmt(totals.petty)} currency={currency} />
                <Metric label="Money in" value={fmt(totals.moneyIn)} currency={currency} />
                <Metric label="Money out" value={fmt(totals.moneyOut)} currency={currency} />
                <Metric label="Expected cash" value={fmt(totals.expected)} currency={currency} />
            </div>

            <Card className="overflow-hidden rounded-xl border-slate-200 shadow-sm">
                <CardHeader className="flex flex-col gap-4 border-b border-slate-200 px-6 py-5 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h2 className="text-sm font-semibold text-slate-900">Entries</h2>
                        <p className="mt-1 text-sm text-slate-500">{date} · {profile?.full_name}</p>
                    </div>
                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                            placeholder="Search name, note or reference"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="h-9 rounded-lg border-slate-200 pl-9 text-sm"
                        />
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <ScrollArea className="h-[560px]">
                        <Table>
                            <TableHeader className="sticky top-0 z-10 bg-white">
                                <TableRow className="border-b border-slate-200 hover:bg-transparent">
                                    <TableHead className="h-11 w-28 px-6 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Time</TableHead>
                                    <TableHead className="h-11 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Type</TableHead>
                                    <TableHead className="h-11 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Recorded by</TableHead>
                                    <TableHead className="h-11 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Party</TableHead>
                                    <TableHead className="h-11 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Account</TableHead>
                                    <TableHead className="h-11 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Description</TableHead>
                                    <TableHead className="h-11 text-right text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Money in</TableHead>
                                    <TableHead className="h-11 px-6 text-right text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Money out</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="h-48 text-center text-sm text-slate-400">Loading</TableCell>
                                    </TableRow>
                                ) : filtered.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="h-48 text-center text-sm text-slate-400">No entries for this date</TableCell>
                                    </TableRow>
                                ) : (
                                    filtered.map((r: any) => (
                                        <TableRow key={r.unique_id} className="border-b border-slate-100 hover:bg-slate-50">
                                            <TableCell className="px-6 py-3.5">
                                                <div className="text-sm tabular-nums text-slate-900">{format(new Date(r.timestamp), 'HH:mm')}</div>
                                                <div className="mt-0.5 text-xs text-slate-400">{r.reference_no}</div>
                                            </TableCell>
                                            <TableCell className="py-3.5 text-sm text-slate-600">{r.activity_type}</TableCell>
                                            <TableCell className="py-3.5 text-sm text-slate-600">{r.sales_agent}</TableCell>
                                            <TableCell className="py-3.5">
                                                <div className="text-sm text-slate-900">{r.customer_name}</div>
                                                {r.customer_telephone ? (
                                                    <div className="mt-0.5 text-xs text-slate-400">{r.customer_telephone}</div>
                                                ) : null}
                                            </TableCell>
                                            <TableCell className="py-3.5 text-sm text-slate-600">{r.ledger_account}</TableCell>
                                            <TableCell className="max-w-[280px] py-3.5">
                                                <div className="truncate text-sm text-slate-500">{r.operational_details}</div>
                                            </TableCell>
                                            <TableCell className="py-3.5 text-right text-sm tabular-nums text-slate-900">
                                                {r.cash_inflow > 0 ? fmt(r.cash_inflow) : '—'}
                                            </TableCell>
                                            <TableCell className="px-6 py-3.5 text-right text-sm tabular-nums text-slate-900">
                                                {r.cash_outflow > 0 ? fmt(r.cash_outflow) : '—'}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </CardContent>
            </Card>

            <Dialog open={isOpeningModalOpen} onOpenChange={setIsOpeningModalOpen}>
                <DialogContent className="max-w-md rounded-xl p-0">
                    <DialogHeader className="border-b border-slate-200 px-6 py-5">
                        <DialogTitle className="text-base font-semibold text-slate-900">Open register</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-5 px-6 py-6">
                        <Field label="Opening cash">
                            <Input
                                type="number"
                                value={sessionForm.opening_cash}
                                onChange={e => setSessionForm({ ...sessionForm, opening_cash: Number(e.target.value) })}
                                className="h-10 rounded-lg border-slate-200 text-sm tabular-nums"
                            />
                        </Field>
                        <Field label="Petty cash">
                            <Input
                                type="number"
                                value={sessionForm.petty_cash_fund}
                                onChange={e => setSessionForm({ ...sessionForm, petty_cash_fund: Number(e.target.value) })}
                                className="h-10 rounded-lg border-slate-200 text-sm tabular-nums"
                            />
                        </Field>
                        <Field label="Notes">
                            <Input
                                value={sessionForm.notes}
                                onChange={e => setSessionForm({ ...sessionForm, notes: e.target.value })}
                                className="h-10 rounded-lg border-slate-200 text-sm"
                            />
                        </Field>
                    </div>
                    <DialogFooter className="gap-2 border-t border-slate-200 px-6 py-4">
                        <Button
                            variant="ghost"
                            onClick={() => setIsOpeningModalOpen(false)}
                            className="h-9 rounded-lg px-4 text-xs font-medium text-slate-500"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={() => openDailyLedger.mutate()}
                            disabled={openDailyLedger.isPending}
                            className="h-9 rounded-lg bg-slate-900 px-5 text-xs font-medium text-white hover:bg-slate-800"
                        >
                            {openDailyLedger.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Open register
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isEntryModalOpen} onOpenChange={setIsEntryModalOpen}>
                <DialogContent className="max-w-2xl rounded-xl p-0">
                    <DialogHeader className="border-b border-slate-200 px-6 py-5">
                        <DialogTitle className="text-base font-semibold text-slate-900">New entry</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-5 px-6 py-6">
                        <div className="grid gap-5 sm:grid-cols-2">
                            <Field label="Type">
                                <Select value={entry.type} onValueChange={(val) => setEntry({ ...entry, type: val })}>
                                    <SelectTrigger className="h-10 rounded-lg border-slate-200 text-sm">
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-lg">
                                        <SelectItem value="EXPENSE">Expense</SelectItem>
                                        <SelectItem value="ADDITION">Cash added</SelectItem>
                                        <SelectItem value="MM_RECEIVED">Mobile money received</SelectItem>
                                        <SelectItem value="CASH_PAYMENT">Cash sale</SelectItem>
                                    </SelectContent>
                                </Select>
                            </Field>
                            <Field label={currency ? `Amount (${currency})` : 'Amount'}>
                                <Input
                                    type="number"
                                    value={entry.amount}
                                    onChange={e => setEntry({ ...entry, amount: Number(e.target.value) })}
                                    className="h-10 rounded-lg border-slate-200 text-sm tabular-nums"
                                />
                            </Field>
                        </div>

                        <div className="grid gap-5 sm:grid-cols-2">
                            <Field label="Paid to or received from">
                                <Input
                                    placeholder="Name"
                                    value={entry.client_name}
                                    onChange={e => setEntry({ ...entry, client_name: e.target.value })}
                                    className="h-10 rounded-lg border-slate-200 text-sm"
                                />
                            </Field>
                            <Field label="Phone number">
                                <Input
                                    placeholder="Phone"
                                    value={entry.phone}
                                    onChange={e => setEntry({ ...entry, phone: e.target.value })}
                                    className="h-10 rounded-lg border-slate-200 text-sm"
                                />
                            </Field>
                        </div>

                        <Field label="Account">
                            <Select value={entry.account_id} onValueChange={(val) => setEntry({ ...entry, account_id: val })}>
                                <SelectTrigger className="h-10 rounded-lg border-slate-200 text-sm">
                                    <SelectValue placeholder="Select account" />
                                </SelectTrigger>
                                <SelectContent className="max-h-72 rounded-lg">
                                    {accounts?.map((acc: any) => (
                                        <SelectItem key={acc.id} value={acc.id}>
                                            {acc.name}
                                            <span className="ml-2 text-xs text-slate-400">{acc.subtype}</span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </Field>

                        <Field label="Description">
                            <Input
                                placeholder="Reason for this entry"
                                value={entry.description}
                                onChange={e => setEntry({ ...entry, description: e.target.value })}
                                className="h-10 rounded-lg border-slate-200 text-sm"
                            />
                        </Field>
                    </div>
                    <DialogFooter className="gap-2 border-t border-slate-200 px-6 py-4">
                        <Button
                            variant="ghost"
                            onClick={() => setIsEntryModalOpen(false)}
                            className="h-9 rounded-lg px-4 text-xs font-medium text-slate-500"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={() => saveOperation.mutate()}
                            disabled={saveOperation.isPending}
                            className="h-9 rounded-lg bg-slate-900 px-5 text-xs font-medium text-white hover:bg-slate-800"
                        >
                            {saveOperation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Save entry
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isClosingModalOpen} onOpenChange={setIsClosingModalOpen}>
                <DialogContent className="max-w-md rounded-xl p-0">
                    <DialogHeader className="border-b border-slate-200 px-6 py-5">
                        <DialogTitle className="text-base font-semibold text-slate-900">Close register</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-5 px-6 py-6">
                        <div className="rounded-lg border border-slate-200 bg-slate-50 px-5 py-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-slate-500">Expected cash</span>
                                <span className="text-sm font-semibold tabular-nums text-slate-900">
                                    {fmt(totals.expected)} {currency}
                                </span>
                            </div>
                            <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3">
                                <span className="text-sm text-slate-500">Difference</span>
                                <span
                                    className={cn(
                                        "text-sm font-semibold tabular-nums",
                                        variance === 0 ? "text-slate-900" : "text-red-600"
                                    )}
                                >
                                    {fmt(variance)} {currency}
                                </span>
                            </div>
                        </div>

                        <Field label="Cash counted">
                            <Input
                                type="number"
                                value={sessionForm.actual_closing}
                                onChange={e => setSessionForm({ ...sessionForm, actual_closing: Number(e.target.value) })}
                                className="h-10 rounded-lg border-slate-200 text-sm tabular-nums"
                            />
                        </Field>
                    </div>
                    <DialogFooter className="gap-2 border-t border-slate-200 px-6 py-4">
                        <Button
                            variant="ghost"
                            onClick={() => setIsClosingModalOpen(false)}
                            className="h-9 rounded-lg px-4 text-xs font-medium text-slate-500"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={() => sealDailyLedger.mutate()}
                            disabled={sealDailyLedger.isPending}
                            className="h-9 rounded-lg bg-slate-900 px-5 text-xs font-medium text-white hover:bg-slate-800"
                        >
                            {sealDailyLedger.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Close register
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <p className="pt-4 text-center text-xs text-slate-400">
                &copy; {new Date().getFullYear()} Litonu Business Base Universe Ltd
            </p>
        </div>
    );
}