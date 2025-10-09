'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from '@/components/ui/scroll-area';

interface PettyCashTransaction {
  id: number;
  created_at: string;
  transaction_type: 'IN' | 'OUT';
  amount: number;
  current_balance: number;
  description: string;
}

const transactionSchema = z.object({
  type: z.enum(['IN', 'OUT']),
  amount: z.string().refine(val => Number(val) > 0, "Amount must be positive."),
  description: z.string().min(5, "Description is too short."),
  recipientOrSource: z.string().optional(),
});

type TransactionFormValues = z.infer<typeof transactionSchema>;

export function PettyCashManagementComponent() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'IN' | 'OUT'>('OUT');

  const { data: transactions, isLoading } = useQuery<PettyCashTransaction[]>({
    queryKey: ['pettyCashTransactions'],
    queryFn: async () => {
      const { data, error } = await supabase.from('petty_cash_transactions').select('*').order('created_at', { ascending: false }).limit(20);
      if (error) throw error;
      return data;
    },
  });

  const currentBalance = transactions?.[0]?.current_balance ?? 0;

  const { mutate: recordTransaction, isPending } = useMutation({
    mutationFn: async (values: TransactionFormValues) => {
      const { error } = await supabase.rpc('record_petty_cash_transaction', {
        p_transaction_type: values.type,
        p_amount: Number(values.amount),
        p_description: values.description,
        p_recipient_or_source: values.recipientOrSource || '',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Petty cash recorded.');
      queryClient.invalidateQueries({ queryKey: ['pettyCashTransactions'] });
      form.reset();
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: { type: activeTab, amount: '', description: '' },
  });

  React.useEffect(() => {
    form.setValue('type', activeTab);
  }, [activeTab, form]);

  return (
    <div className="space-y-4">
      <div className="text-center">
        <p className="text-sm text-muted-foreground">Current Balance</p>
        <p className="text-2xl font-bold">UGX {currentBalance.toLocaleString()}</p>
      </div>

      <Tabs defaultValue="OUT" onValueChange={(value) => setActiveTab(value as 'IN' | 'OUT')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="OUT">Record Expense</TabsTrigger>
          <TabsTrigger value="IN">Record Top-up</TabsTrigger>
        </TabsList>
        <TabsContent value={activeTab}>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(data => recordTransaction(data))} className="space-y-3 pt-2">
              <FormField name="amount" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>Amount</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField name="description" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>Description</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <Button type="submit" disabled={isPending} className="w-full">
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Record {activeTab === 'IN' ? 'Top-up' : 'Expense'}
              </Button>
            </form>
          </Form>
        </TabsContent>
      </Tabs>
      
      <div>
        <h4 className="font-semibold mb-2">Recent Transactions</h4>
        <ScrollArea className="h-48 w-full rounded-md border p-2">
          {isLoading ? <p>Loading...</p> : (
            transactions?.map(tx => (
              <div key={tx.id} className={`flex justify-between items-center p-1 text-sm ${tx.transaction_type === 'OUT' ? 'text-red-600' : 'text-green-600'}`}>
                <span>{tx.description}</span>
                <span className="font-mono">{tx.transaction_type === 'OUT' ? '-' : '+'} {tx.amount.toLocaleString()}</span>
              </div>
            ))
          )}
        </ScrollArea>
      </div>
    </div>
  );
}