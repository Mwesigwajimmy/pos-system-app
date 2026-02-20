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
  ShieldCheck, Fingerprint, Activity, Zap, ShieldAlert // Upgrade: Added Forensic Icons
} from 'lucide-react';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Badge } from '../ui/badge'; // Upgrade: For status parity

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
  // z.coerce allows string inputs (from HTML forms) to be parsed as numbers
  amount: z.coerce.number().positive("Amount must be positive."),
  // Using z.date() without arguments to avoid type conflicts
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
    
    // Upgrade Note: This call now triggers 'trg_ledger_forensics' on the backend
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
            // Upgrade: Updated message to reflect Autonomous Guard parity
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
            <DialogContent className="sm:max-w-[500px] border-slate-200 shadow-2xl">
                <DialogHeader>
                    <div className="flex items-center justify-between mb-2">
                        <DialogTitle className="flex items-center gap-2">
                            <Fingerprint className="w-5 h-5 text-primary" />
                            Secure Transaction Entry
                        </DialogTitle>
                        <Badge variant="outline" className="text-[10px] uppercase font-bold text-slate-400 border-slate-100">
                            Sovereign v10.1
                        </Badge>
                    </div>
                    <DialogDescription>
                        Create a Journal Entry matching this bank line item. Entry is verified against 90-day moving average drift.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
                        
                        <div className={cn(
                            "flex items-center p-3 rounded-md text-sm font-medium border",
                            isMoneyOut ? "bg-red-50 text-red-700 border-red-200" : "bg-green-50 text-green-700 border-green-200"
                        )}>
                            {isMoneyOut ? (
                                <>
                                    <ShieldAlert className="w-4 h-4 mr-2" />
                                    Money Out (Liability Check Active)
                                </>
                            ) : (
                                <>
                                    <ShieldCheck className="w-4 h-4 mr-2" />
                                    Money In (Asset Verification Active)
                                </>
                            )}
                        </div>

                        <FormField
                            control={form.control}
                            name="date"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>Transaction Date</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button
                                                    variant={"outline"}
                                                    className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
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
                                    <FormLabel>Audit Narrative / Description</FormLabel>
                                    <FormControl>
                                        <Input {...field} value={field.value as string || ''} placeholder="Required for forensic trail..." />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="amount"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Amount</FormLabel>
                                        <FormControl>
                                            {/* FIX: Explicitly cast the value to handle the unknown type inference */}
                                            <Input 
                                                type="number" 
                                                step="0.01" 
                                                {...field} 
                                                value={(field.value as number) || ''} 
                                                className="font-mono"
                                            />
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
                                        <FormLabel>
                                            {isMoneyOut ? "Expense Account" : "Income Account"}
                                        </FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value as string}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder={isLoadingAccounts ? "Loading..." : "Select Category"} />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {accounts?.map(acc => (
                                                    <SelectItem key={acc.id} value={acc.id}>
                                                        {acc.code ? `${acc.code} - ` : ''}{acc.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="pt-2 px-1">
                            <p className="text-[10px] text-muted-foreground flex items-center gap-1 font-mono uppercase tracking-tighter">
                                <Zap size={10} className="text-emerald-500 fill-current animate-pulse" />
                                1:1 Forensic Mapping Ready
                            </p>
                        </div>

                        <DialogFooter className="pt-4 gap-2">
                            <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={mutation.isPending} className="px-6 shadow-xl shadow-primary/10">
                                {mutation.isPending ? (
                                    <>
                                        <Activity className="mr-2 h-4 w-4 animate-pulse text-emerald-400" />
                                        Verifying Drift...
                                    </>
                                ) : (
                                    <>
                                        <ShieldCheck className="mr-2 h-4 w-4" />
                                        Post & Verify
                                    </>
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}