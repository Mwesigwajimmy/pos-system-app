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
  Loader2, Search, Plus, Trash2, BookOpen, ShieldCheck, Fingerprint, Activity,
  Maximize2, Minimize2, Minus, X, Zap 
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

// --- Sub-Component: Create Entry Dialog (WIDE & CLEAN) ---
export const CreateEntryDialog = ({ businessId, isOpen, onClose }: { businessId: string, isOpen: boolean, onClose: () => void }) => {
    const queryClient = useQueryClient();
    const [isMaximized, setIsMaximized] = useState(false);
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
        setLines([{ account_id: '', description: '', debit: 0, credit: 0 }, { account_id: '', description: '', debit: 0, credit: 0 }]);
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className={cn(
                "border-slate-200 shadow-2xl overflow-hidden flex flex-col p-0 transition-all duration-300",
                isMaximized ? "fixed inset-0 m-0 w-screen h-screen max-w-none rounded-none z-[9999]" : "max-w-6xl w-[95vw] rounded-3xl"
            )}>
                {/* Windows style header matching "New Product" */}
                <div className="p-8 bg-white border-b relative">
                    <div className="flex items-start gap-6">
                        <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center shrink-0 border border-blue-100 shadow-sm">
                            <BookOpen className="w-8 h-8 text-blue-600" />
                        </div>
                        <div className="flex-1">
                            <DialogTitle className="text-3xl font-bold text-slate-900 mb-1">
                                Record Enterprise Journal Entry
                            </DialogTitle>
                            <DialogDescription className="text-base text-slate-500 font-medium">
                                Setup double-entry ledger information and mapping.
                            </DialogDescription>
                        </div>
                    </div>

                    {/* Window Controls */}
                    <div className="absolute top-6 right-6 flex items-center gap-2">
                        <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400"><Minus size={18} /></button>
                        <button onClick={() => setIsMaximized(!isMaximized)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400">
                            {isMaximized ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                        </button>
                        <button onClick={onClose} className="p-2 hover:bg-red-50 hover:text-red-500 rounded-lg text-slate-400 transition-colors"><X size={18} /></button>
                    </div>
                </div>
                
                {/* Main Form Body */}
                <div className="flex-1 overflow-y-auto p-10 custom-scrollbar bg-slate-50/20">
                    {/* Header Inputs Row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10">
                        <div className="space-y-3">
                            <Label className="text-xs font-black uppercase text-slate-400 tracking-widest">Posting Date</Label>
                            <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-14 font-bold border-slate-200 rounded-xl px-6 bg-white shadow-sm text-lg" />
                        </div>
                        <div className="space-y-3">
                            <Label className="text-xs font-black uppercase text-slate-400 tracking-widest">Reference #</Label>
                            <Input placeholder="JE-2024-001" value={reference} onChange={e => setReference(e.target.value)} className="h-14 font-bold border-slate-200 rounded-xl px-6 bg-white shadow-sm text-lg" />
                        </div>
                        <div className="space-y-3">
                            <Label className="text-xs font-black uppercase text-slate-400 tracking-widest">Master Narrative</Label>
                            <Input placeholder="Reason for entry..." value={description} onChange={e => setDescription(e.target.value)} className="h-14 font-bold border-slate-200 rounded-xl px-6 bg-white shadow-sm text-lg" />
                        </div>
                    </div>

                    {/* Ledger Table Section */}
                    <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xl mb-10">
                        <Table>
                            <TableHeader className="bg-slate-50/50 border-b border-slate-100">
                                <TableRow className="h-16">
                                    <TableHead className="w-[350px] pl-8 text-[11px] font-black uppercase text-slate-400 tracking-widest">Account Ledger</TableHead>
                                    <TableHead className="text-[11px] font-black uppercase text-slate-400 tracking-widest">Line Label</TableHead>
                                    <TableHead className="text-right w-[200px] text-[11px] font-black uppercase text-slate-400 tracking-widest">Debit (DR)</TableHead>
                                    <TableHead className="text-right w-[200px] text-[11px] font-black uppercase text-slate-400 tracking-widest pr-8">Credit (CR)</TableHead>
                                    <TableHead className="w-[80px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {lines.map((line, i) => (
                                    <TableRow key={i} className="group border-b border-slate-50 last:border-0">
                                        <TableCell className="pl-8 py-5">
                                            <Select value={line.account_id} onValueChange={(v) => { const n = [...lines]; n[i].account_id = v; setLines(n); }}>
                                                <SelectTrigger className="h-12 border-slate-200 rounded-xl font-semibold shadow-sm">
                                                    <SelectValue placeholder="Select account..." />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-xl shadow-2xl">
                                                    {accounts?.map(a => <SelectItem key={a.id} value={a.id} className="py-2 px-4 font-medium"><span className="text-blue-600 font-mono mr-2">[{a.code}]</span> {a.name}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                        <TableCell>
                                            <Input 
                                                value={line.description} 
                                                onChange={e => { const n = [...lines]; n[i].description = e.target.value; setLines(n); }} 
                                                placeholder={description || "Enter line narrative..."} 
                                                className="h-12 border-slate-200 rounded-xl font-medium shadow-sm"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Input 
                                                type="number" 
                                                className="h-12 text-right font-mono font-black text-blue-700 border-slate-200 rounded-xl text-lg shadow-sm bg-slate-50/30" 
                                                value={line.debit || ''} 
                                                onChange={e => { const n = [...lines]; n[i].debit = parseFloat(e.target.value) || 0; n[i].credit = 0; setLines(n); }} 
                                            />
                                        </TableCell>
                                        <TableCell className="pr-8">
                                            <Input 
                                                type="number" 
                                                className="h-12 text-right font-mono font-black text-red-700 border-slate-200 rounded-xl text-lg shadow-sm bg-slate-50/30" 
                                                value={line.credit || ''} 
                                                onChange={e => { const n = [...lines]; n[i].credit = parseFloat(e.target.value) || 0; n[i].debit = 0; setLines(n); }} 
                                            />
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Button variant="ghost" size="icon" onClick={() => setLines(lines.filter((_, idx) => idx !== i))} disabled={lines.length <= 2} className="hover:bg-red-50 text-slate-300 hover:text-red-500 rounded-lg">
                                                <Trash2 size={18} />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        <div className="p-6 bg-slate-50/30 border-t border-slate-100">
                            <Button variant="outline" onClick={() => setLines([...lines, { account_id: '', description: '', debit: 0, credit: 0 }])} className="h-11 px-6 rounded-xl border-slate-200 font-bold hover:bg-white shadow-sm">
                                <Plus className="w-4 h-4 mr-2 text-blue-600" /> Add Journal Line
                            </Button>
                        </div>
                    </div>

                    {/* Enhanced Balance Bar */}
                    <div className="flex items-center justify-between p-8 bg-slate-900 rounded-3xl shadow-2xl border border-slate-800">
                        <div className="flex gap-16 font-mono">
                            <div className="flex flex-col">
                                <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Total Debits</span>
                                <span className="text-3xl text-blue-400 font-black">{totalDebit.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                            </div>
                            <div className="flex flex-col border-l border-slate-800 pl-16">
                                <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Total Credits</span>
                                <span className="text-3xl text-red-400 font-black">{totalCredit.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                            </div>
                        </div>
                        <div className={cn(
                            "flex items-center gap-4 px-8 py-4 rounded-2xl border-2 transition-all shadow-inner",
                            isBalanced ? "bg-emerald-500/10 border-emerald-500 text-emerald-400" : "bg-red-500/10 border-red-500 text-red-400 animate-pulse"
                        )}>
                            <div className="flex-shrink-0">
                                {isBalanced ? <ShieldCheck size={32} /> : <Zap size={32} className="animate-pulse" />}
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm font-black uppercase tracking-widest">{isBalanced ? "MATH PARITY VERIFIED" : "UNBALANCED LEDGER"}</span>
                                {!isBalanced && <span className="text-xs font-mono font-bold">Diff: {difference.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Wide Footer matching "New Product" */}
                <div className="p-8 bg-slate-50/50 border-t flex items-center justify-between">
                    <Button type="button" variant="ghost" onClick={onClose} disabled={mutation.isPending} className="h-12 px-8 font-black uppercase text-xs tracking-widest text-slate-400 hover:text-slate-900">
                        Cancel Entry
                    </Button>
                    <Button 
                        onClick={() => mutation.mutate({ businessId, date, description, reference, lines })} 
                        disabled={!isBalanced || mutation.isPending}
                        className="h-14 px-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xl transition-all active:scale-95 flex items-center"
                    >
                        {mutation.isPending ? (
                            <>
                                <Activity className="mr-3 h-5 w-5 animate-spin" />
                                <span className="font-black uppercase text-xs tracking-[0.2em]">Posting to Ledger...</span>
                            </>
                        ) : (
                            <>
                                <ShieldCheck className="mr-3 h-5 w-5" />
                                <span className="font-black uppercase text-xs tracking-[0.2em]">Authorize & Post Journal</span>
                            </>
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

// --- Main Page Component ---
export default function GeneralJournalTable({ initialEntries, businessId, userId }: { initialEntries: JournalTransaction[], businessId: string, userId: string }) {
    const [filter, setFilter] = useState('');
    const [isOpen, setIsOpen] = useState(false);

    const { data: entries, isLoading } = useQuery({ 
        queryKey: ['journal_entries', businessId], 
        queryFn: () => fetchJournalEntries(businessId), 
        initialData: initialEntries 
    });

    return (
        <div className="space-y-6 relative">
            <div className="flex justify-between items-center px-2">
                <div className="relative max-w-sm w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input placeholder="Search narratives or references..." value={filter} onChange={e => setFilter(e.target.value)} className="h-12 pl-12 bg-white shadow-sm rounded-2xl border-slate-200" />
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" className="h-12 w-12 rounded-2xl border-slate-200"><Fingerprint className="w-5 h-5 text-slate-400" /></Button>
                    <Button onClick={() => setIsOpen(true)} className="h-12 px-8 shadow-lg rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all active:scale-95">
                        <Plus className="w-5 h-5 mr-2" /> New Journal Entry
                    </Button>
                </div>
            </div>

            <Card className="border-slate-200 shadow-2xl overflow-hidden rounded-[2rem]">
                <Table>
                    <TableHeader className="bg-slate-50/50 border-b border-slate-100">
                        <TableRow className="h-16">
                            <TableHead className="w-[180px] pl-8 text-[11px] font-black uppercase text-slate-400 tracking-widest">Posting Date</TableHead>
                            <TableHead className="text-[11px] font-black uppercase text-slate-400 tracking-widest">Reference / Memo</TableHead>
                            <TableHead className="text-[11px] font-black uppercase text-slate-400 tracking-widest">Ledger Impact</TableHead>
                            <TableHead className="text-right text-[11px] font-black uppercase text-slate-400 tracking-widest">Transaction Total</TableHead>
                            <TableHead className="text-center w-[150px] text-[11px] font-black uppercase text-slate-400 tracking-widest pr-8">Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow><TableCell colSpan={5} className="h-64 text-center"><Loader2 className="animate-spin h-10 w-10 mx-auto text-blue-600" /></TableCell></TableRow>
                        ) : entries?.filter((e: JournalTransaction) => e.description?.toLowerCase().includes(filter.toLowerCase())).map((e: JournalTransaction) => (
                            <TableRow key={e.id} className="hover:bg-blue-50/20 transition-colors group">
                                <TableCell className="font-bold text-slate-700 pl-8 py-6">{format(new Date(e.date), 'MMM dd, yyyy')}</TableCell>
                                <TableCell>
                                    <div className="flex flex-col">
                                        <span className="font-bold text-slate-900 text-base">{e.description}</span>
                                        <span className="text-[10px] text-slate-400 font-mono uppercase bg-slate-100 px-2 py-0.5 rounded-lg w-fit mt-1.5 border border-slate-200">{e.reference || 'No Ref'}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="space-y-1.5 py-2">
                                        {e.lines?.map((l: JournalLine, idx: number) => (
                                            <div key={idx} className="flex justify-between text-[11px] text-slate-600 font-bold border-l-2 border-blue-200 pl-3">
                                                <span className="flex items-center gap-2">
                                                    <Badge variant="outline" className="text-[9px] h-4 px-1.5 bg-white border-slate-200">{l.account?.code}</Badge>
                                                    {l.account?.name}
                                                </span>
                                                <span className={cn("font-mono", l.debit > 0 ? "text-blue-600" : "text-red-600")}>
                                                    {l.debit > 0 ? `${l.debit.toFixed(2)} Dr` : `${l.credit.toFixed(2)} Cr`}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </TableCell>
                                <TableCell className="text-right font-black text-slate-900 font-mono text-lg">
                                    {e.lines?.reduce((s: number, l: JournalLine) => s + l.debit, 0).toLocaleString(undefined, {minimumFractionDigits: 2})}
                                </TableCell>
                                <TableCell className="text-center pr-8">
                                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-black uppercase tracking-widest py-1 px-3 rounded-xl shadow-sm">
                                        <ShieldCheck className="w-3 h-3 mr-1.5" /> Posted
                                    </Badge>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                <div className="p-5 bg-slate-50/50 border-t flex items-center justify-between text-[10px] text-slate-400 font-black uppercase tracking-widest">
                    <div className="flex items-center gap-2 pl-3"><Activity className="w-3.5 h-3.5 text-emerald-500" /> Live Ledger Sync Active</div>
                    <div className="pr-3">Immutable Records | Auth: {userId.substring(0,8)}...</div>
                </div>
            </Card>

            <CreateEntryDialog businessId={businessId} isOpen={isOpen} onClose={() => setIsOpen(false)} />
        </div>
    );
}