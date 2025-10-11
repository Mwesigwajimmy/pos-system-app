// src/components/dsr/CashDepositForm.tsx
'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, Wallet } from 'lucide-react';

const cashDepositSchema = z.object({
    amount: z.coerce.number().positive({ message: "Amount must be a positive number." }),
    notes: z.string().optional(),
});

type CashDepositInput = z.input<typeof cashDepositSchema>;
type CashDepositOutput = z.infer<typeof cashDepositSchema>;

export function CashDepositForm() {
    const supabase = createClient();
    const queryClient = useQueryClient();

    const form = useForm<CashDepositInput>({
        resolver: zodResolver(cashDepositSchema),
        defaultValues: { amount: '', notes: "" }
    });

    const { mutate: recordCashDeposit, isPending } = useMutation({
        mutationFn: async (values: CashDepositOutput) => {
            const { error } = await supabase.rpc('record_dsr_activity', {
                p_activity_type: 'Cash Deposit', p_service_id: null, p_amount: values.amount,
                p_customer_phone: null, p_notes: values.notes || 'Cash taken for bank deposit',
            });
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success("Cash deposit recorded. Remember to upload the bank slip.");
            queryClient.invalidateQueries({ queryKey: ['activeShiftTransactions'] });
            form.reset();
        },
        onError: (err: Error) => toast.error(`Error: ${err.message}`),
    });

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center"><Wallet className="mr-2 h-5 w-5 text-indigo-500"/> Record Cash for Deposit</CardTitle>
                <CardDescription>Use this when you take cash out of the till for a bank deposit. Upload the slip later.</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit((data) => {
                        recordCashDeposit(data as CashDepositOutput);
                    })} className="space-y-4">
                        <FormField name="amount" control={form.control} render={({ field }) => (
                            <FormItem>
                                <FormLabel>Amount to Deposit (UGX)</FormLabel>
                                <FormControl>
                                    <Input type="number" placeholder="e.g., 200000" {...field} value={String(field.value ?? '')} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField name="notes" control={form.control} render={({ field }) => (
                            <FormItem>
                                <FormLabel>Notes (Optional)</FormLabel>
                                <FormControl>
                                    <Textarea placeholder="e.g., Going to Centenary Bank" {...field} value={String(field.value ?? '')} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <Button type="submit" className="w-full" disabled={isPending}>
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Record Cash Out
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}