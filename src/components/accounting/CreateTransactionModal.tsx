'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from 'lucide-react';

// --- TYPES & SCHEMA ---
interface BankTransaction { id: string; date: string; description: string; amount: number; }
interface ChartOfAccount { id: string; account_name: string; account_number: string; }
interface CreateTransactionModalProps { isOpen: boolean; onClose: () => void; bankTransaction: BankTransaction | null; }

const transactionSchema = z.object({
  description: z.string().min(1, "Description is required."),
  amount: z.any()
    .refine(val => val !== '' && val !== null && val !== undefined, {
        message: "Amount is required.",
    })
    .transform(val => Number(val))
    .refine(val => !isNaN(val), {
        message: "Amount must be a valid number.",
    })
    .refine(val => val !== 0, {
        message: "Amount cannot be zero.",
    }),
  transaction_date: z.string().nonempty("Date is required."),
  account_id: z.string().uuid("An account must be selected."),
});

type TransactionFormValues = z.infer<typeof transactionSchema>;

// --- API ---
async function createSystemTransaction(values: TransactionFormValues) {
    const { error } = await createClient().rpc('create_journal_entry', {
        p_description: values.description,
        p_amount: values.amount,
        p_date: values.transaction_date,
        p_account_id: values.account_id,
    });
    if (error) throw new Error(error.message);
}

async function fetchAccounts(): Promise<ChartOfAccount[]> {
    const { data, error } = await createClient().rpc('get_chart_of_accounts');
    if (error) throw new Error(error.message);
    return data || [];
}

// --- MAIN COMPONENT ---
export function CreateTransactionModal({ isOpen, onClose, bankTransaction }: CreateTransactionModalProps) {
    const queryClient = useQueryClient();
    const { data: accounts, isLoading: isLoadingAccounts } = useQuery({ queryKey: ['accounts'], queryFn: fetchAccounts });

    const form = useForm<TransactionFormValues>({
        resolver: zodResolver(transactionSchema),
        defaultValues: {
            description: '',
            // THE FIX: The default value must match the final type, which is a number.
            // We use `undefined` to represent an empty field.
            amount: undefined,
            transaction_date: '',
            account_id: '',
        },
    });

    useEffect(() => {
        if (bankTransaction) {
            form.reset({
                description: bankTransaction.description,
                amount: bankTransaction.amount * -1,
                transaction_date: new Date(bankTransaction.date).toISOString().split('T')[0],
                account_id: '',
            });
        } else {
            // When opening for a new transaction, ensure fields are reset
            form.reset({
                description: '',
                amount: undefined,
                transaction_date: '',
                account_id: '',
            });
        }
    }, [bankTransaction, isOpen, form]);

    const mutation = useMutation({
        mutationFn: createSystemTransaction,
        onSuccess: () => {
            toast.success('New transaction created successfully!');
            queryClient.invalidateQueries({ queryKey: ['reconciliationData'] });
            onClose();
        },
        onError: (err: Error) => toast.error(`Failed to create transaction: ${err.message}`),
    });

    const onSubmit = (data: TransactionFormValues) => mutation.mutate(data);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Create New System Transaction</DialogTitle>
                    <DialogDescription>Create a journal entry for an item on the bank statement not yet in your books.</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                        <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>Description</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
                        <FormField control={form.control} name="amount" render={({ field }) => (<FormItem><FormLabel>Amount</FormLabel><FormControl><Input type="number" step="0.01" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.valueAsNumber)} /></FormControl><FormMessage /></FormItem>)}/>
                        <FormField control={form.control} name="transaction_date" render={({ field }) => (<FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                        <FormField control={form.control} name="account_id" render={({ field }) => (
                            <FormItem><FormLabel>Account</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger>{isLoadingAccounts ? 'Loading accounts...' : <SelectValue placeholder="Select an expense/income account" />}</SelectTrigger></FormControl>
                                    <SelectContent>
                                        {accounts?.map(acc => ( <SelectItem key={acc.id} value={acc.id}>{acc.account_number} - {acc.account_name}</SelectItem> ))}
                                    </SelectContent>
                                </Select><FormMessage />
                            </FormItem>
                        )}/>
                        <DialogFooter><Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>Cancel</Button><Button type="submit" disabled={mutation.isPending}>{mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create Transaction</Button></DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}