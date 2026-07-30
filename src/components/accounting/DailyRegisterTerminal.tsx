'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from 'sonner';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { useTenant } from '@/hooks/useTenant';
import { useUserProfile } from '@/hooks/useUserProfile';
import { formatCurrency } from '@/lib/utils';

const supabase = createClient();

export default function DailyRegisterTerminal({ isOpen, onOpenChange }: { isOpen: boolean, onOpenChange: (open: boolean) => void }) {
    const queryClient = useQueryClient();
    const { data: tenant } = useTenant();
    const { data: profile } = useUserProfile();

    const [counts, setCounts] = useState<Record<string, number>>({});
    const [pettyCashAmount, setPettyCashAmount] = useState(0);
    const [notes, setNotes] = useState('');

    const currency = tenant?.reporting_currency || 'UGX';

    const { data: denominations, isLoading: isDenomsLoading } = useQuery({
        queryKey: ['system_denominations', tenant?.reporting_currency],
        queryFn: async () => {
            const { data } = await supabase.rpc('get_currency_denominations', {
                p_currency_code: tenant?.reporting_currency || 'UGX'
            });
            return data || [];
        },
        enabled: !!tenant?.reporting_currency
    });

    const openingTotal = useMemo(() => {
        if (!denominations) return 0;
        return denominations.reduce((sum: number, d: any) => {
            const qty = counts[d.id] || 0;
            return sum + (qty * d.face_value);
        }, 0);
    }, [denominations, counts]);

    const piecesCounted = useMemo(
        () => Object.values(counts).reduce((sum, qty) => sum + (Number(qty) || 0), 0),
        [counts]
    );

    const money = (value: number) => formatCurrency(Number(value) || 0, currency);

    const generateVerificationPDF = (sessionId: any) => {
        const list = denominations || [];
        const reference = typeof sessionId === 'string' ? sessionId.substring(0, 8).toUpperCase() : '';

        const doc = new jsPDF();
        doc.setFontSize(16);
        doc.text("Cash opening report", 14, 20);

        doc.setFontSize(10);
        doc.text(`${tenant?.business_display_name || ''}`, 14, 29);
        doc.text(`Opened by: ${profile?.full_name || ''}`, 14, 35);
        doc.text(`Date: ${format(new Date(), 'dd MMM yyyy, HH:mm')}`, 14, 41);
        if (reference) doc.text(`Reference: ${reference}`, 14, 47);

        autoTable(doc, {
            startY: reference ? 57 : 51,
            head: [['Denomination', 'Count', 'Value']],
            body: list
                .filter((d: any) => (counts[d.id] || 0) > 0)
                .map((d: any) => [d.label, counts[d.id], money(counts[d.id] * d.face_value)]),
            theme: 'plain',
            styles: { fontSize: 9, cellPadding: 3 },
            headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
            columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } }
        });

        const finalY = ((doc as any).lastAutoTable?.finalY || 100) + 12;
        doc.setFont("helvetica", "bold");
        doc.text(`Cash counted: ${money(openingTotal)}`, 14, finalY);
        doc.text(`Petty cash: ${money(pettyCashAmount)}`, 14, finalY + 7);

        if (notes.trim()) {
            doc.setFont("helvetica", "normal");
            doc.setFontSize(9);
            doc.text(`Notes: ${notes.trim()}`, 14, finalY + 17);
        }

        doc.save(`Cash_Opening_${format(new Date(), 'yyyyMMdd')}.pdf`);
    };

    const openRegister = useMutation({
        mutationFn: async () => {
            const list = denominations || [];
            const denomPayload = list.map((d: any) => ({
                id: d.id,
                qty: counts[d.id] || 0,
                subtotal: (counts[d.id] || 0) * d.face_value
            })).filter((i: any) => i.qty > 0);

            const { data, error } = await supabase.rpc('proc_initialize_daily_node', {
                p_opening_total: openingTotal,
                p_float_allocation: pettyCashAmount,
                p_notes: notes,
                p_denominations: denomPayload
            });
            if (error) throw error;
            return data;
        },
        onSuccess: (sessionId) => {
            toast.success("Register opened");
            generateVerificationPDF(sessionId);
            queryClient.invalidateQueries({ queryKey: ['active_ledger_session'] });
            onOpenChange(false);
            setCounts({});
            setPettyCashAmount(0);
            setNotes('');
        },
        onError: (e: any) => toast.error(e.message)
    });

    const clearCounts = () => setCounts({});

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent
                className="flex h-[100dvh] max-h-[100dvh] w-screen max-w-none flex-col gap-0 overflow-hidden rounded-none p-0 sm:h-auto sm:max-h-[92vh] sm:w-[calc(100%-2rem)] sm:max-w-3xl sm:rounded-xl"
            >
                <DialogHeader className="shrink-0 border-b border-slate-200 px-5 py-4 text-left sm:px-6">
                    <DialogTitle className="text-base font-semibold text-slate-900">Open register</DialogTitle>
                    <p className="mt-0.5 text-sm text-slate-500">
                        {format(new Date(), 'dd MMM yyyy')} · {currency}
                    </p>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto">
                    <div className="grid lg:grid-cols-2">
                        <div className="border-b border-slate-200 lg:border-b-0 lg:border-r">
                            <div className="flex items-center justify-between px-5 py-4 sm:px-6">
                                <Label className="text-xs font-medium text-slate-500">Count your cash</Label>
                                {piecesCounted > 0 ? (
                                    <button
                                        onClick={clearCounts}
                                        className="text-xs font-medium text-slate-500 hover:text-slate-900"
                                    >
                                        Clear
                                    </button>
                                ) : null}
                            </div>

                            <div className="px-5 pb-5 sm:px-6">
                                {isDenomsLoading ? (
                                    <div className="py-16 text-center">
                                        <Loader2 className="mx-auto h-6 w-6 animate-spin text-slate-400" />
                                    </div>
                                ) : !denominations?.length ? (
                                    <p className="py-16 text-center text-sm text-slate-400">
                                        No denominations set up for {currency}
                                    </p>
                                ) : (
                                    <div className="divide-y divide-slate-100">
                                        {denominations.map((d: any) => {
                                            const qty = counts[d.id] || 0;
                                            return (
                                                <div key={d.id} className="flex items-center justify-between gap-3 py-2.5">
                                                    <div className="min-w-0">
                                                        <p className="truncate text-sm text-slate-900">{d.label}</p>
                                                        <p className="text-xs text-slate-400 tabular-nums">
                                                            {Number(d.face_value).toLocaleString()}
                                                        </p>
                                                    </div>
                                                    <div className="flex shrink-0 items-center gap-3">
                                                        <Input
                                                            type="number"
                                                            inputMode="numeric"
                                                            min={0}
                                                            placeholder="0"
                                                            value={counts[d.id] ?? ''}
                                                            onChange={(e) => {
                                                                const next = parseInt(e.target.value, 10);
                                                                setCounts(prev => ({
                                                                    ...prev,
                                                                    [d.id]: Number.isFinite(next) && next > 0 ? next : 0
                                                                }));
                                                            }}
                                                            className="h-10 w-20 rounded-lg border-slate-200 text-center text-sm tabular-nums"
                                                        />
                                                        <span className="w-24 text-right text-sm tabular-nums text-slate-500">
                                                            {qty > 0 ? money(qty * d.face_value) : '—'}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-5 px-5 py-5 sm:px-6">
                            <div className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-4">
                                <p className="text-xs font-medium text-slate-500">Cash counted</p>
                                <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">
                                    {money(openingTotal)}
                                </p>
                                <p className="mt-1 text-xs text-slate-400">
                                    {piecesCounted} note{piecesCounted === 1 ? '' : 's'} and coins
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-medium text-slate-500">Petty cash</Label>
                                <Input
                                    type="number"
                                    inputMode="numeric"
                                    min={0}
                                    value={pettyCashAmount || ''}
                                    placeholder="0"
                                    onChange={e => setPettyCashAmount(Math.max(0, Number(e.target.value) || 0))}
                                    className="h-11 rounded-lg border-slate-200 text-sm tabular-nums"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-medium text-slate-500">Notes</Label>
                                <Input
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                    placeholder="Optional"
                                    className="h-11 rounded-lg border-slate-200 text-sm"
                                />
                            </div>

                            <div className="space-y-2 border-t border-slate-200 pt-4">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-500">Cash counted</span>
                                    <span className="tabular-nums text-slate-700">{money(openingTotal)}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-500">Petty cash</span>
                                    <span className="tabular-nums text-slate-700">{money(pettyCashAmount)}</span>
                                </div>
                                <div className="flex items-center justify-between border-t border-slate-200 pt-2 text-base font-semibold text-slate-900">
                                    <span>Opening balance</span>
                                    <span className="tabular-nums">{money(openingTotal + pettyCashAmount)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="shrink-0 border-t border-slate-200 bg-white px-5 py-4 sm:px-6">
                    <div className="mb-3 flex items-center justify-between sm:hidden">
                        <span className="text-sm text-slate-500">Opening balance</span>
                        <span className="text-base font-semibold tabular-nums text-slate-900">
                            {money(openingTotal + pettyCashAmount)}
                        </span>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                        <Button
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                            className="h-11 rounded-lg px-4 text-sm font-medium text-slate-500"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={() => openRegister.mutate()}
                            disabled={openRegister.isPending || (openingTotal === 0 && pettyCashAmount === 0)}
                            className="h-11 rounded-lg bg-slate-900 px-6 text-sm font-medium text-white hover:bg-slate-800"
                        >
                            {openRegister.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Open register
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}