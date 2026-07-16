'use client';

/**
 * --- BBU1 SOVEREIGN RECONCILIATION NODE ---
 * VERSION: v11.0 OMEGA (ULTIMATE ARCHITECTURE)
 * Use: Advanced multi-line splitting, forensic suggestions, and tax recognition.
 */

import { useEffect, useState, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { 
  Loader2, CalendarIcon, AlertTriangle, 
  ShieldCheck, Fingerprint, Activity, Zap, ShieldAlert,
  Maximize2, Minimize2, Minus, X, Plus, Trash2, Scale, 
  BrainCircuit, Coins, Landmark
} from 'lucide-react';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Badge } from '../ui/badge'; 
import { ScrollArea } from '../ui/scroll-area';
import { Label } from "@/components/ui/label";

// --- SCHEMA: WORLD CLASS SPLIT LOGIC ---
const transactionSchema = z.object({
  description: z.string().min(1, "Master narrative required."),
  date: z.date(),
  is_money_out: z.boolean(),
  total_amount: z.number(),
  lines: z.array(z.object({
    account_id: z.string().min(1, "Select account"),
    amount: z.coerce.number().positive("Must be positive"),
    narrative: z.string().min(1, "Line narrative required")
  })).min(1)
});

type TransactionFormValues = z.infer<typeof transactionSchema>;

export function CreateTransactionModal({ 
    isOpen, onClose, bankTransaction, businessId, bankAccountId, userId
}: CreateTransactionModalProps) {
    const queryClient = useQueryClient();
    const [isMaximized, setIsMaximized] = useState(false);
    const supabase = createClient();

    // 1. DATA: Fetch Chart of Accounts (Asset/Expense/Liability for contra entry)
    const { data: accounts, isLoading: isLoadingAccounts } = useQuery({ 
        queryKey: ['chartOfAccounts', businessId], 
        queryFn: async () => {
            const { data } = await supabase
                .from('accounting_accounts')
                .select('id, name, code, type')
                .eq('business_id', businessId)
                .eq('is_active', true)
                .order('name');
            return data || [];
        },
        enabled: isOpen
    });

    // 2. DATA: Forensic AI Suggestions (Pattern Recognition)
    const { data: suggestions } = useQuery({
        queryKey: ['accountingSuggestions', bankTransaction?.description],
        queryFn: async () => {
            const { data } = await supabase.rpc('get_reconciliation_suggestions', {
                p_business_id: businessId,
                p_description: bankTransaction?.description
            });
            return data || [];
        },
        enabled: !!bankTransaction?.description && isOpen
    });

    const form = useForm<TransactionFormValues>({
        resolver: zodResolver(transactionSchema),
        defaultValues: {
            description: '',
            date: new Date(),
            is_money_out: true,
            total_amount: 0,
            lines: [{ account_id: '', amount: 0, narrative: '' }]
        },
    });

    const { fields, append, remove } = useFieldArray({ control: form.control, name: "lines" });

    // Sync form with Bank Statement on Open
    useEffect(() => {
        if (bankTransaction && isOpen) {
            const isOut = bankTransaction.amount < 0;
            const amt = Math.abs(bankTransaction.amount);
            form.reset({
                description: bankTransaction.description,
                date: new Date(bankTransaction.date),
                is_money_out: isOut,
                total_amount: amt,
                lines: [{ 
                    account_id: suggestions?.[0]?.account_id || '', 
                    amount: amt, 
                    narrative: bankTransaction.description 
                }]
            });
        }
    }, [bankTransaction, isOpen, suggestions, form]);

    // MATH: Calculate Real-Time Parity
    const currentLines = form.watch("lines");
    const totalAllocated = useMemo(() => currentLines.reduce((sum, line) => sum + (Number(line.amount) || 0), 0), [currentLines]);
    const difference = Math.abs(form.getValues("total_amount") - totalAllocated);
    const isBalanced = difference < 0.01;

    const mutation = useMutation({
        mutationFn: async (values: TransactionFormValues) => {
            const payload = {
                p_business_id: businessId,
                p_date: format(values.date, 'yyyy-MM-dd'),
                p_description: values.description,
                p_reference: `RECON-${Date.now()}`,
                p_user_id: userId,
                p_lines: values.lines.map(l => ({
                    account_id: l.account_id,
                    debit: values.is_money_out ? 0 : l.amount,
                    credit: values.is_money_out ? l.amount : 0,
                    description: l.narrative
                }))
            };

            // Master Entry: The Bank Node (Contra Line)
            payload.p_lines.push({
                account_id: bankAccountId,
                debit: values.is_money_out ? values.total_amount : 0,
                credit: values.is_money_out ? 0 : values.total_amount,
                description: `Bank Clearing: ${values.description}`
            });

            const { data, error } = await supabase.rpc('create_journal_entry', payload);
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            toast.success('Forensic Parity Established. Ledger Sealed.', { icon: <ShieldCheck className="text-emerald-500" /> });
            queryClient.invalidateQueries({ queryKey: ['reconciliationData'] });
            onClose();
        },
        onError: (err: any) => toast.error(`Post Failure: ${err.message}`),
    });

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent 
                className={cn(
                    "border-none shadow-3xl flex flex-col p-0 transition-all duration-500 ease-in-out bg-white overflow-hidden",
                    isMaximized 
                        ? "fixed inset-0 m-0 w-screen h-screen max-w-none rounded-none z-[9999]" 
                        : "sm:max-w-[1250px] h-[90vh] rounded-[2.5rem]"
                )}
            >
                {/* WINDOW CONTROL BAR */}
                <div className="flex items-center justify-end gap-1 px-6 py-3 bg-slate-900 border-b border-white/5 shrink-0">
                    <button onClick={() => setIsMaximized(!isMaximized)} className="p-2 hover:bg-white/10 rounded-lg text-slate-400 transition-colors">
                        {isMaximized ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                    </button>
                    <button onClick={onClose} className="p-2 hover:bg-rose-500/20 hover:text-rose-500 rounded-lg text-slate-400 transition-colors">
                        <X size={16} />
                    </button>
                </div>

                {/* ADVANCED HEADER */}
                <div className="p-10 bg-slate-900 text-white shrink-0">
                    <DialogHeader>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-6">
                                <div className="h-20 w-20 bg-blue-500/10 rounded-3xl flex items-center justify-center border border-blue-500/20 shadow-inner">
                                    <BrainCircuit className="w-10 h-10 text-blue-400" />
                                </div>
                                <div className="space-y-1">
                                    <DialogTitle className="text-4xl font-black tracking-tighter uppercase">Forensic Ledger Reconciler</DialogTitle>
                                    <div className="flex items-center gap-3">
                                        <Badge className="bg-blue-600 text-white font-mono px-3 py-1 rounded-md text-[10px]">BANK_NODE: {bankAccountId.substring(0,8)}</Badge>
                                        <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">Autonomous Sync Engine v11.0</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="bg-white/5 border border-white/10 px-10 py-6 rounded-[2rem] text-right shadow-2xl">
                                <p className="text-[10px] text-blue-400 font-black uppercase tracking-[0.2em] mb-1">Bank Statement Value</p>
                                <p className={cn("text-5xl font-black tabular-nums tracking-tighter", form.watch("is_money_out") ? "text-rose-400" : "text-emerald-400")}>
                                    {form.watch("total_amount").toLocaleString()}
                                </p>
                            </div>
                        </div>
                    </DialogHeader>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col md:flex-row bg-white">
                    {/* LEFT AREA: AI Suggestions & Meta */}
                    <div className="w-full md:w-80 bg-slate-50 border-r border-slate-100 p-8 space-y-10 overflow-y-auto shrink-0">
                        {suggestions && suggestions.length > 0 && (
                            <div className="space-y-6">
                                <Label className="text-[11px] font-black text-blue-500 uppercase tracking-[0.2em] flex items-center gap-2">
                                    <Zap size={14} className="fill-current animate-pulse"/> AI Recognition
                                </Label>
                                <div className="space-y-3">
                                    {suggestions.map((s: any) => (
                                        <button 
                                            key={s.account_id}
                                            onClick={() => form.setValue('lines.0.account_id', s.account_id)}
                                            className="w-full text-left p-5 bg-white hover:border-blue-500 border-2 border-transparent rounded-2xl transition-all shadow-sm group"
                                        >
                                            <p className="text-[10px] font-black text-slate-900 uppercase truncate">{s.account_name}</p>
                                            <div className="flex items-center justify-between mt-2">
                                                <p className="text-[9px] font-bold text-emerald-500">{s.confidence_score.toFixed(0)}% Probability</p>
                                                <ChevronRight size={12} className="text-slate-300 group-hover:translate-x-1 transition-transform" />
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="p-6 bg-slate-900 rounded-3xl text-white/50 space-y-4 shadow-xl">
                            <ShieldCheck className="text-blue-400 w-8 h-8" />
                            <p className="text-[10px] font-medium leading-relaxed uppercase tracking-wider">
                                System is strictly monitoring for 1:1 math parity. Unbalanced ledger posts will be blocked by the forensic kernel.
                            </p>
                        </div>
                    </div>

                    {/* MAIN AREA: Split Entry Form */}
                    <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
                        <Form {...form}>
                            <form className="space-y-12">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                    <FormField control={form.control} name="date" render={({ field }) => (
                                        <FormItem className="space-y-3">
                                            <FormLabel className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Effective Date</FormLabel>
                                            <Input type="date" value={field.value ? format(field.value, 'yyyy-MM-dd') : ''} onChange={e => field.onChange(new Date(e.target.value))} className="h-14 border-slate-200 rounded-2xl font-bold bg-slate-50/50" />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="description" render={({ field }) => (
                                        <FormItem className="space-y-3">
                                            <FormLabel className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Master Narrative</FormLabel>
                                            <Input {...field} className="h-14 border-slate-200 rounded-2xl font-bold bg-slate-50/50" />
                                        </FormItem>
                                    )} />
                                </div>

                                <div className="space-y-8">
                                    <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                                        <h3 className="text-sm font-black uppercase tracking-[0.3em] text-slate-900 flex items-center gap-3">
                                            <Scale size={20} className="text-blue-600"/> Split Allocation Matrix
                                        </h3>
                                        <Button type="button" variant="outline" size="sm" onClick={() => append({ account_id: '', amount: 0, narrative: form.getValues('description') })} className="h-10 px-6 rounded-xl border-blue-200 text-blue-600 font-black text-[11px] uppercase tracking-widest hover:bg-blue-50">
                                            <Plus size={16} className="mr-2"/> Add Split Node
                                        </Button>
                                    </div>

                                    <div className="space-y-4">
                                        {fields.map((field, index) => (
                                            <div key={field.id} className="grid grid-cols-12 gap-6 items-end bg-slate-50/50 p-6 rounded-3xl border border-slate-100 animate-in slide-in-from-left-2 duration-300">
                                                <div className="col-span-4 space-y-2">
                                                    <Label className="text-[10px] font-black text-slate-400 uppercase ml-2">Target Account</Label>
                                                    <Select onValueChange={(val) => form.setValue(`lines.${index}.account_id`, val)} value={form.watch(`lines.${index}.account_id`)}>
                                                        <SelectTrigger className="h-12 bg-white border-slate-200 rounded-xl font-bold"><SelectValue placeholder="Account"/></SelectTrigger>
                                                        <SelectContent className="rounded-2xl shadow-3xl">
                                                            {accounts?.map(acc => <SelectItem key={acc.id} value={acc.id} className="font-bold py-3 text-xs">[{acc.code}] {acc.name}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="col-span-4 space-y-2">
                                                    <Label className="text-[10px] font-black text-slate-400 uppercase ml-2">Line Narrative</Label>
                                                    <Input {...form.register(`lines.${index}.narrative`)} className="h-12 bg-white border-slate-200 rounded-xl" />
                                                </div>
                                                <div className="col-span-3 space-y-2">
                                                    <Label className="text-[10px] font-black text-slate-400 uppercase ml-2">Amount</Label>
                                                    <Input type="number" step="0.01" {...form.register(`lines.${index}.amount`)} className="h-12 bg-white border-slate-200 rounded-xl font-mono font-black text-blue-600" />
                                                </div>
                                                <div className="col-span-1">
                                                    <Button variant="ghost" size="icon" onClick={() => remove(index)} className="h-12 w-12 rounded-xl text-slate-300 hover:text-rose-600 hover:bg-rose-50" disabled={fields.length === 1}><Trash2 size={20}/></Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </form>
                        </Form>
                    </div>
                </div>

                {/* BALANCING FOOTER */}
                <div className="p-10 bg-slate-50 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-10 shrink-0">
                    <div className={cn(
                        "flex items-center gap-8 px-12 py-6 rounded-[3rem] border-4 transition-all shadow-2xl",
                        isBalanced ? "bg-emerald-50 border-emerald-400/30 text-emerald-700" : "bg-rose-50 border-rose-400/30 text-rose-700"
                    )}>
                        <div className="flex flex-col">
                            <span className="text-[11px] font-black uppercase tracking-[0.3em] opacity-60">Ledger Variance</span>
                            <span className="text-5xl font-black tabular-nums tracking-tighter">
                                {difference.toLocaleString(undefined, {minimumFractionDigits: 2})}
                            </span>
                        </div>
                        {isBalanced ? (
                            <div className="flex flex-col items-center gap-1">
                                <ShieldCheck size={48} className="text-emerald-500" />
                                <span className="text-[10px] font-black uppercase">Balanced</span>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-1 animate-pulse">
                                <AlertTriangle size={48} className="text-rose-500" />
                                <span className="text-[10px] font-black uppercase">Unbalanced</span>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-6">
                        <Button variant="ghost" onClick={onClose} className="h-16 px-12 font-bold uppercase text-xs tracking-widest text-slate-400 hover:text-slate-900 transition-all">Cancel Entry</Button>
                        <Button 
                            disabled={!isBalanced || mutation.isPending}
                            onClick={form.handleSubmit((v) => mutation.mutate(v))}
                            className="h-20 px-20 bg-slate-950 hover:bg-black text-white rounded-[2.5rem] shadow-3xl shadow-slate-950/40 uppercase tracking-[0.2em] font-black text-sm transition-all active:scale-95 disabled:opacity-30 flex items-center"
                        >
                            {mutation.isPending ? (
                                <><Loader2 className="animate-spin h-6 w-6 mr-4" /> Finalizing Node...</>
                            ) : (
                                <><Fingerprint className="mr-4 h-6 w-6 text-blue-400" /> Commit Forensic Ledger Post</>
                            )}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}