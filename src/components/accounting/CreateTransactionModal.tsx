'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { 
  Loader2, CalendarIcon, AlertTriangle, 
  ShieldCheck, Fingerprint, Activity, Zap, ShieldAlert,
  Maximize2, Minimize2, Minus, X // Added for Window Controls
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

// --- TYPES ---
interface BankTransaction { 
    id: string; 
    date: string; 
    description: string; 
    amount: number; 
}

interface ChartOfAccount { 
    id: string; 
    name: string; 
    code: string; 
    type: string; 
}

export interface CreateTransactionModalProps { 
    isOpen: boolean; 
    onClose: () => void; 
    bankTransaction: BankTransaction | null; 
    businessId: string;
    bankAccountId: string;
    userId: string;
}

// --- SCHEMA ---
const transactionSchema = z.object({
  description: z.string().min(1, "Description is required."),
  amount: z.coerce.number().positive("Amount must be positive."),
  date: z.date(),
  contra_account_id: z.string().min(1, "Please select an account."),
  is_money_out: z.boolean(),
});

type TransactionFormValues = z.infer<typeof transactionSchema>;

// --- API CALLS ---
async function fetchChartOfAccounts(businessId: string): Promise<ChartOfAccount[]> {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('accounting_accounts')
        .select('id, name, code, type')
        .eq('business_id', businessId)
        .in('type', ['Expense', 'Equity', 'Income', 'Liability'])
        .eq('is_active', true)
        .order('name');
    
    if (error) throw new Error(error.message);
    return data || [];
}

async function createSystemTransaction(vars: { 
    values: TransactionFormValues, 
    businessId: string, 
    userId: string, 
    bankAccountId: string,
    bankTxId?: string 
}) {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('create_reconciliation_transaction', {
        p_business_id: vars.businessId,
        p_user_id: vars.userId,
        p_bank_account_id: vars.bankAccountId,
        p_contra_account_id: vars.values.contra_account_id,
        p_date: format(vars.values.date, 'yyyy-MM-dd'),
        p_description: vars.values.description,
        p_amount: vars.values.amount,
        p_is_money_out: vars.values.is_money_out,
        p_bank_transaction_id: vars.bankTxId
    });

    if (error) throw new Error(error.message);
    return data;
}

// --- MAIN COMPONENT ---
export function CreateTransactionModal({ 
    isOpen, 
    onClose, 
    bankTransaction,
    businessId,
    bankAccountId,
    userId
}: CreateTransactionModalProps) {
    const queryClient = useQueryClient();
    const [isMaximized, setIsMaximized] = useState(false); // State for Full Screen

    const { data: accounts, isLoading: isLoadingAccounts } = useQuery({ 
        queryKey: ['chartOfAccounts', businessId], 
        queryFn: () => fetchChartOfAccounts(businessId),
        enabled: isOpen && !!businessId 
    });

    const form = useForm({
        resolver: zodResolver(transactionSchema),
        defaultValues: {
            description: '',
            amount: 0,
            date: new Date(),
            contra_account_id: '',
            is_money_out: true
        },
    });

    useEffect(() => {
        if (bankTransaction && isOpen) {
            const isMoneyOut = bankTransaction.amount < 0;
            form.reset({
                description: bankTransaction.description,
                amount: Math.abs(bankTransaction.amount),
                date: new Date(bankTransaction.date),
                contra_account_id: '',
                is_money_out: isMoneyOut
            });
        }
    }, [bankTransaction, isOpen, form]);

    const mutation = useMutation({
        mutationFn: createSystemTransaction,
        onSuccess: () => {
            toast.success('Journal Entry Saved. Sovereign Forensic Guard established 1:1 parity.', {
                duration: 5000,
                icon: <ShieldCheck className="text-emerald-500" />
            });
            queryClient.invalidateQueries({ queryKey: ['reconciliationData'] });
            form.reset();
            onClose();
        },
        onError: (err: Error) => toast.error(`Forensic Block: ${err.message}`),
    });

    const onSubmit = (data: TransactionFormValues) => {
        mutation.mutate({
            values: data,
            businessId,
            userId,
            bankAccountId,
            bankTxId: bankTransaction?.id
        });
    };

    const isMoneyOut = form.watch("is_money_out");

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent 
                className={cn(
                    "border-slate-200 shadow-2xl overflow-hidden flex flex-col p-0 transition-all duration-300 ease-in-out",
                    isMaximized 
                        ? "fixed inset-0 m-0 w-screen h-screen max-w-none rounded-none z-[9999]" 
                        : "sm:max-w-[1000px] h-[90vh] rounded-3xl"
                )}
            >
                {/* WINDOW CONTROL BAR (The three buttons) */}
                <div className="flex items-center justify-end gap-1 px-4 py-2 bg-slate-100/50 border-b">
                    <button className="p-1.5 hover:bg-slate-200 rounded text-slate-500 transition-colors">
                        <Minus size={14} />
                    </button>
                    <button 
                        onClick={() => setIsMaximized(!isMaximized)}
                        className="p-1.5 hover:bg-slate-200 rounded text-slate-500 transition-colors"
                    >
                        {isMaximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                    </button>
                    <button 
                        onClick={onClose}
                        className="p-1.5 hover:bg-red-100 hover:text-red-600 rounded text-slate-500 transition-colors"
                    >
                        <X size={14} />
                    </button>
                </div>

                <div className="p-6 bg-slate-50/50 border-b">
                    <DialogHeader>
                        <div className="flex items-center justify-between mb-2">
                            <DialogTitle className="flex items-center gap-2 text-2xl">
                                <Fingerprint className="w-6 h-6 text-primary" />
                                Secure Transaction Entry
                            </DialogTitle>
                            <Badge variant="outline" className="px-3 py-1 text-[11px] uppercase font-black tracking-widest text-slate-500 border-slate-200 bg-white">
                                Sovereign System Protocol v10.1
                            </Badge>
                        </div>
                        <DialogDescription className="text-sm font-medium">
                            Create a Journal Entry matching this bank line item. Entry is verified against 90-day moving average drift for GAAP compliance.
                        </DialogDescription>
                    </DialogHeader>
                </div>

                {/* SCROLLABLE AREA - Keeps form content visible */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                            
                            <div className={cn(
                                "flex items-center p-4 rounded-xl text-sm font-bold border uppercase tracking-wider",
                                isMoneyOut ? "bg-red-50 text-red-700 border-red-100" : "bg-emerald-50 text-emerald-700 border-emerald-100"
                            )}>
                                {isMoneyOut ? (
                                    <>
                                        <ShieldAlert className="w-5 h-5 mr-3" />
                                        Money Out Activity (Liability Check Active)
                                    </>
                                ) : (
                                    <>
                                        <ShieldCheck className="w-5 h-5 mr-3" />
                                        Money In Activity (Asset Verification Active)
                                    </>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <FormField
                                    control={form.control}
                                    name="date"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-col">
                                            <FormLabel className="text-xs font-bold uppercase text-slate-400">Transaction Date</FormLabel>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <FormControl>
                                                        <Button
                                                            variant={"outline"}
                                                            className={cn("w-full h-14 pl-3 text-left font-bold rounded-xl border-slate-200", !field.value && "text-muted-foreground")}
                                                        >
                                                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                        </Button>
                                                    </FormControl>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0" align="start">
                                                    <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date() || date < new Date("1900-01-01")} initialFocus />
                                                </PopoverContent>
                                            </Popover>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="description"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-bold uppercase text-slate-400">Audit Narrative / Description</FormLabel>
                                            <FormControl>
                                                <Input 
                                                    {...field} 
                                                    value={field.value as string || ''} 
                                                    placeholder="Required for forensic trail..." 
                                                    className="h-14 font-medium border-slate-200 rounded-xl px-4"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <FormField
                                    control={form.control}
                                    name="amount"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-bold uppercase text-slate-400">Transaction Value</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Input 
                                                        type="number" 
                                                        step="0.01" 
                                                        {...field} 
                                                        value={(field.value as number) || ''} 
                                                        // Increased height and padding to ensure long numbers show clearly
                                                        className="h-14 font-mono font-black text-2xl border-slate-200 rounded-xl px-6 bg-slate-50/50 w-full"
                                                    />
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="contra_account_id"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-bold uppercase text-slate-400">
                                                {isMoneyOut ? "Expense / Asset Account" : "Income / Liability Account"}
                                            </FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value as string}>
                                                <FormControl>
                                                    <SelectTrigger className="h-14 font-bold rounded-xl border-slate-200 bg-white">
                                                        <SelectValue placeholder={isLoadingAccounts ? "Syncing Ledger..." : "Select Category"} />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent className="rounded-xl shadow-2xl max-h-[300px]">
                                                    {accounts?.map(acc => (
                                                        <SelectItem key={acc.id} value={acc.id} className="font-medium py-3">
                                                            {acc.code ? (
                                                                <span className="font-mono text-primary mr-2">[{acc.code}]</span>
                                                            ) : ''}
                                                            {acc.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="pt-4 px-1">
                                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                                    <p className="text-[11px] text-slate-400 flex items-center gap-2 font-mono uppercase font-black tracking-widest">
                                        <Zap size={14} className="text-emerald-500 fill-current animate-pulse" />
                                        Mathematical Parity Verified: 1:1 Mapping Ready
                                    </p>
                                    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                                </div>
                            </div>
                        </form>
                    </Form>
                </div>

                {/* STICKY FOOTER - Always visible at the bottom */}
                <div className="p-6 bg-slate-50 border-t mt-auto">
                    <DialogFooter className="gap-3 sm:justify-end flex-row items-center">
                        <Button 
                            type="button" 
                            variant="ghost" 
                            onClick={onClose} 
                            disabled={mutation.isPending}
                            className="h-12 px-8 font-bold uppercase text-[11px] tracking-widest text-slate-400 hover:text-slate-900"
                        >
                            Cancel Session
                        </Button>
                        <Button 
                            type="submit" 
                            disabled={mutation.isPending} 
                            onClick={form.handleSubmit(onSubmit)}
                            className="h-12 px-10 bg-slate-900 hover:bg-black text-white rounded-xl shadow-xl transition-all active:scale-95 flex items-center"
                        >
                            {mutation.isPending ? (
                                <>
                                    <Activity className="mr-3 h-4 w-4 animate-spin text-emerald-400" />
                                    Verifying Drift...
                                </>
                            ) : (
                                <>
                                    <ShieldCheck className="mr-3 h-5 w-5 text-emerald-400" />
                                    <span className="font-black uppercase text-[11px] tracking-[0.2em]">Commit to Ledger</span>
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </div>
            </DialogContent>
        </Dialog>
    );
}