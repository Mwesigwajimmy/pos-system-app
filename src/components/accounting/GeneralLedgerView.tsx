"use client";

import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from "@/components/ui/input";
import { Loader2, Search, Calendar, Landmark, FileBarChart } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";

export default function GeneralLedgerView({ businessId }: { businessId: string }) {
    const [filter, setFilter] = useState('');
    const supabase = createClient();

    const { data: entries, isLoading } = useQuery({
        queryKey: ['live_ledger', businessId],
        queryFn: async () => {
            const { data } = await supabase
                .from('accounting_journal_entries')
                .select(`*, transaction:accounting_transactions(date, reference, description), account:accounting_accounts(name, code)`)
                .eq('business_id', businessId)
                .order('created_at', { ascending: false });
            return data;
        }
    });

    const filtered = useMemo(() => {
        if (!entries) return [];
        return entries.filter((e: any) => 
            e.account?.name.toLowerCase().includes(filter.toLowerCase()) ||
            e.transaction?.description.toLowerCase().includes(filter.toLowerCase())
        );
    }, [entries, filter]);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="relative max-w-md w-full">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Filter by account or description..." value={filter} onChange={e => setFilter(e.target.value)} className="pl-8 bg-white shadow-sm" />
                </div>
                <div className="flex gap-2 text-xs font-bold text-muted-foreground uppercase tracking-widest bg-muted/50 px-4 py-2 rounded-full border">
                    <Landmark className="w-3 h-3" /> Live Ledger Sync Active
                </div>
            </div>

            <Card className="border-none shadow-xl overflow-hidden">
                <ScrollArea className="h-[600px]">
                <Table>
                    <TableHeader className="bg-slate-900 sticky top-0 z-20">
                        <TableRow>
                            <TableHead className="text-white w-[120px]">Date</TableHead>
                            <TableHead className="text-white">Account</TableHead>
                            <TableHead className="text-white">Description</TableHead>
                            <TableHead className="text-white text-right">Debit</TableHead>
                            <TableHead className="text-white text-right">Credit</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow><TableCell colSpan={5} className="h-48 text-center"><Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" /></TableCell></TableRow>
                        ) : filtered.length === 0 ? (
                            <TableRow><TableCell colSpan={5} className="h-24 text-center italic text-muted-foreground">No ledger movements found.</TableCell></TableRow>
                        ) : (
                            filtered.map((e: any) => (
                                <TableRow key={e.id} className="hover:bg-blue-50/30 transition-colors">
                                    <TableCell className="text-[11px] font-mono">{format(new Date(e.transaction?.date), 'yyyy-MM-dd')}</TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-bold text-sm text-slate-800">{e.account?.name}</span>
                                            <span className="text-[10px] text-muted-foreground font-mono">CODE: {e.account?.code}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-sm font-medium italic text-slate-600">{e.description || e.transaction?.description}</TableCell>
                                    <TableCell className="text-right font-mono text-sm text-blue-700 font-bold">{e.debit > 0 ? e.debit.toFixed(2) : '-'}</TableCell>
                                    <TableCell className="text-right font-mono text-sm text-red-700 font-bold">{e.credit > 0 ? e.credit.toFixed(2) : '-'}</TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
                </ScrollArea>
            </Card>
        </div>
    );
}