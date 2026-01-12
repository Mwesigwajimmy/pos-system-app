"use client";

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { format } from "date-fns";
import { toast } from 'sonner';
import { 
  Card, CardContent, CardHeader, CardTitle, CardDescription 
} from '@/components/ui/card';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Loader2, Search, Plus, Trash2, BookOpen, ShieldCheck, Fingerprint, Activity 
} from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from '@/components/ui/badge';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { submitJournalEntry } from '@/lib/actions/journal'; 
import { cn } from '@/lib/utils';

// --- Enterprise Types ---

interface JournalLine {
  account_id: string;
  description: string;
  debit: number;
  credit: number;
  account?: { name: string; code: string };
}

interface JournalTransaction {
  id: string;
  date: string;
  reference: string;
  description: string;
  state: string;
  lines: JournalLine[];
}

// --- API Functions ---

const fetchJournalEntries = async (businessId: string) => {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('accounting_transactions')
        .select(`
            *,
            lines: accounting_journal_entries(
                id, 
                description, 
                debit, 
                credit, 
                account:accounting_accounts(name, code)
            )
        `)
        .eq('business_id', businessId)
        .order('date', { ascending: false });

    if (error) throw new Error(error.message);
    return data as JournalTransaction[];
};

const fetchAccounts = async (businessId: string) => {
    const supabase = createClient();
    const { data } = await supabase
        .from('accounting_accounts')
        .select('id, name, code')
        .eq('business_id', businessId)
        .eq('is_active', true)
        .order('code', { ascending: true });
    return data || [];
};

// --- Sub-Component: Create Entry Dialog (EXPORTED) ---

export const CreateEntryDialog = ({ businessId, isOpen, onClose }: { businessId: string, isOpen: boolean, onClose: () => void }) => {
    const queryClient = useQueryClient();
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [reference, setReference] = useState('');
    const [description, setDescription] = useState('');
    const [lines, setLines] = useState<JournalLine[]>([
        { account_id: '', description: '', debit: 0, credit: 0 },
        { account_id: '', description: '', debit: 0, credit: 0 }
    ]);

    const { data: accounts } = useQuery({ 
        queryKey: ['coa', businessId], 
        queryFn: () => fetchAccounts(businessId), 
        enabled: isOpen 
    });

    const totalDebit = lines.reduce((sum, line) => sum + (Number(line.debit) || 0), 0);
    const totalCredit = lines.reduce((sum, line) => sum + (Number(line.credit) || 0), 0);
    const difference = totalDebit - totalCredit;
    const isBalanced = Math.abs(difference) < 0.01 && totalDebit > 0;

    const mutation = useMutation({
        mutationFn: submitJournalEntry,
        onSuccess: (res) => {
            if (res.success) {
                toast.success("General Ledger Updated Successfully");
                queryClient.invalidateQueries({ queryKey: ['journal_entries', businessId] });
                onClose();
                resetForm();
            } else {
                toast.error(`Ledger Posting Error: ${res.message}`);
            }
        }
    });

    const resetForm = () => {
        setDescription('');
        setReference('');
        setLines([
            { account_id: '', description: '', debit: 0, credit: 0 },
            { account_id: '', description: '', debit: 0, credit: 0 }
        ]);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-5xl border-t-8 border-t-blue-600 shadow-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-2xl font-bold">
                        <BookOpen className="w-6 h-6 text-blue-600" /> 
                        Record Enterprise Journal Entry
                    </DialogTitle>
                    <DialogDescription>
                        Input double-entry lines for the General Ledger. Balanced entries are required for GAAP compliance.
                    </DialogDescription>
                </DialogHeader>
                
                <div className="grid grid-cols-3 gap-6 py-6 bg-muted/30 p-4 rounded-xl border">
                    <div className="space-y-2">
                        <Label className="text-xs uppercase font-black text-slate-500">Posting Date</Label>
                        <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-white" />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs uppercase font-black text-slate-500">Reference #</Label>
                        <Input placeholder="JE-2024-001" value={reference} onChange={e => setReference(e.target.value)} className="bg-white" />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs uppercase font-black text-slate-500">Master Narrative</Label>
                        <Input placeholder="Reason for entry..." value={description} onChange={e => setDescription(e.target.value)} className="bg-white" />
                    </div>
                </div>

                <div className="border rounded-xl mt-4 overflow-hidden shadow-inner bg-white">
                    <Table>
                        <TableHeader className="bg-slate-50">
                            <TableRow>
                                <TableHead className="w-[300px]">Account Ledger</TableHead>
                                <TableHead>Line Label</TableHead>
                                <TableHead className="text-right w-[150px]">Debit (DR)</TableHead>
                                <TableHead className="text-right w-[150px]">Credit (CR)</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {lines.map((line, i) => (
                                <TableRow key={i} className="hover:bg-slate-50/50">
                                    <TableCell>
                                        <Select value={line.account_id} onValueChange={(v) => { const n = [...lines]; n[i].account_id = v; setLines(n); }}>
                                            <SelectTrigger className="h-9">
                                                <SelectValue placeholder="Select account..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {accounts?.map(a => <SelectItem key={a.id} value={a.id}>[{a.code}] {a.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                    <TableCell>
                                        <Input 
                                            value={line.description} 
                                            onChange={e => { const n = [...lines]; n[i].description = e.target.value; setLines(n); }} 
                                            placeholder={description || "Line description..."} 
                                            className="h-9"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Input 
                                            type="number" 
                                            className="text-right font-mono font-bold text-blue-700 h-9" 
                                            value={line.debit || ''} 
                                            onChange={e => {
                                                const n = [...lines];
                                                n[i].debit = parseFloat(e.target.value) || 0;
                                                n[i].credit = 0;
                                                setLines(n);
                                            }} 
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Input 
                                            type="number" 
                                            className="text-right font-mono font-bold text-red-700 h-9" 
                                            value={line.credit || ''} 
                                            onChange={e => {
                                                const n = [...lines];
                                                n[i].credit = parseFloat(e.target.value) || 0;
                                                n[i].debit = 0;
                                                setLines(n);
                                            }} 
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Button variant="ghost" size="icon" onClick={() => setLines(lines.filter((_, idx) => idx !== i))} disabled={lines.length <= 2}>
                                            <Trash2 className="w-4 h-4 text-destructive" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    <div className="p-4 bg-slate-50 border-t">
                        <Button variant="outline" size="sm" onClick={() => setLines([...lines, { account_id: '', description: '', debit: 0, credit: 0 }])}>
                            <Plus className="w-4 h-4 mr-2" /> Add Journal Line
                        </Button>
                    </div>
                </div>

                <div className="flex justify-between items-center bg-slate-900 text-white p-6 rounded-2xl mt-6 shadow-xl border border-slate-700">
                    <div className="flex gap-12 font-mono text-lg">
                        <div className="flex flex-col">
                            <span className="text-[10px] text-slate-500 font-black">Total Debits</span>
                            <span className="text-blue-400 font-black">{totalDebit.toFixed(2)}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] text-slate-500 font-black">Total Credits</span>
                            <span className="text-red-400 font-black">{totalCredit.toFixed(2)}</span>
                        </div>
                    </div>
                    <div className={cn(
                        "flex items-center gap-3 px-6 py-2 rounded-xl border-2 transition-all",
                        isBalanced ? "bg-green-500/10 border-green-500 text-green-400" : "bg-red-500/10 border-red-500 text-red-400 animate-pulse"
                    )}>
                        {isBalanced ? <ShieldCheck className="w-6 h-6" /> : <Loader2 className="w-6 h-6 animate-spin" />}
                        <div className="flex flex-col">
                            <span className="text-xs font-black uppercase tracking-tighter">{isBalanced ? "BALANCED" : "OUT OF BALANCE"}</span>
                            {!isBalanced && <span className="text-[10px] font-mono">Diff: {difference.toFixed(2)}</span>}
                        </div>
                    </div>
                </div>

                <DialogFooter className="mt-8">
                    <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>Cancel</Button>
                    <Button 
                        onClick={() => mutation.mutate({ businessId, date, description, reference, lines })} 
                        disabled={!isBalanced || mutation.isPending}
                        className="px-8 shadow-lg bg-blue-700 hover:bg-blue-800"
                    >
                        {mutation.isPending ? "Posting to Ledger..." : "Authorize & Post Journal"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

// --- Main Component ---

export default function GeneralJournalTable({ initialEntries, businessId, userId }: { initialEntries: JournalTransaction[], businessId: string, userId: string }) {
    const [filter, setFilter] = useState('');
    const [isOpen, setIsOpen] = useState(false);

    const { data: entries, isLoading } = useQuery({ 
        queryKey: ['journal_entries', businessId], 
        queryFn: () => fetchJournalEntries(businessId), 
        initialData: initialEntries 
    });

    return (
        <div className="space-y-4 relative">
            <div className="flex justify-between items-center">
                <div className="relative max-w-sm w-full">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search narratives or references..." value={filter} onChange={e => setFilter(e.target.value)} className="pl-9 bg-white shadow-sm rounded-xl" />
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="icon" className="rounded-xl"><Fingerprint className="w-4 h-4 text-slate-400" /></Button>
                    <Button onClick={() => setIsOpen(true)} className="shadow-lg rounded-xl bg-primary hover:bg-primary/90">
                        <Plus className="w-4 h-4 mr-2" /> New Journal Entry
                    </Button>
                </div>
            </div>

            <Card className="border-none shadow-2xl overflow-hidden rounded-2xl">
                <Table>
                    <TableHeader className="bg-slate-50 border-b">
                        <TableRow>
                            <TableHead className="w-[150px] py-4">Posting Date</TableHead>
                            <TableHead>Reference / Memo</TableHead>
                            <TableHead>Impacted Ledger Accounts</TableHead>
                            <TableHead className="text-right">Transaction Total</TableHead>
                            <TableHead className="text-center w-[120px]">Workflow</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow><TableCell colSpan={5} className="h-48 text-center"><Loader2 className="animate-spin h-8 w-8 mx-auto text-primary" /></TableCell></TableRow>
                        ) : entries?.filter((e: JournalTransaction) => e.description?.toLowerCase().includes(filter.toLowerCase())).map((e: JournalTransaction) => (
                            <TableRow key={e.id} className="hover:bg-blue-50/30 transition-colors">
                                <TableCell className="font-bold text-slate-700">{format(new Date(e.date), 'MMM dd, yyyy')}</TableCell>
                                <TableCell>
                                    <div className="flex flex-col">
                                        <span className="font-semibold text-slate-900">{e.description}</span>
                                        <span className="text-[10px] text-muted-foreground font-mono uppercase bg-slate-100 px-1 rounded w-fit mt-1">{e.reference || 'No Ref'}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="space-y-1 py-2">
                                        {/* FIXED: Added types to l and idx to resolve implicit any error */}
                                        {e.lines?.map((l: JournalLine, idx: number) => (
                                            <div key={idx} className="flex justify-between text-[11px] text-slate-600 font-medium border-l-2 border-blue-200 pl-2">
                                                <span className="flex items-center gap-1">
                                                    <Badge variant="outline" className="text-[8px] h-3 px-1">{l.account?.code}</Badge>
                                                    {l.account?.name}
                                                </span>
                                                <span className={cn("font-mono font-bold", l.debit > 0 ? "text-blue-600" : "text-red-600")}>
                                                    {l.debit > 0 ? `${l.debit.toFixed(2)} Dr` : `${l.credit.toFixed(2)} Cr`}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </TableCell>
                                <TableCell className="text-right font-black text-slate-900 font-mono">
                                    {e.lines?.reduce((s: number, l: JournalLine) => s + l.debit, 0).toLocaleString(undefined, {minimumFractionDigits: 2})}
                                </TableCell>
                                <TableCell className="text-center">
                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-[9px] font-black uppercase tracking-tighter">
                                        <ShieldCheck className="w-3 h-3 mr-1" />
                                        Posted
                                    </Badge>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                <div className="p-4 bg-slate-50 border-t flex items-center justify-between text-[10px] text-slate-400 font-black uppercase tracking-widest">
                    <div className="flex items-center gap-2"><Activity className="w-3 h-3" /> Live Ledger Sync Active</div>
                    <div>Immutable Records Only | Auth User ID: {userId.substring(0,8)}...</div>
                </div>
            </Card>

            <CreateEntryDialog businessId={businessId} isOpen={isOpen} onClose={() => setIsOpen(false)} />
        </div>
    );
}