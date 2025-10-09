'use client';

import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ActiveAgent {
  user_id: string;
  full_name: string;
}

interface ReconciliationResult {
    agent_name: string;
    starting_float: number;
    total_sales_value: number;
    total_agent_expenses: number;
    total_commissions_earned: number;
    expected_cash_on_hand: number;
    actual_cash_counted: number;
    variance: number;
    status: 'Balanced' | 'Surplus' | 'Shortage';
}

const reconciliationSchema = z.object({
  agentId: z.string().min(1, "Please select an agent."),
  cashCounted: z.string().refine(val => !isNaN(parseFloat(val)), "Please enter a valid number."),
});

type ReconciliationFormValues = z.infer<typeof reconciliationSchema>;

export function ShiftReconciliationComponent() {
  const supabase = createClient();
  const [result, setResult] = useState<ReconciliationResult | null>(null);

  const { data: activeAgents, isLoading: isLoadingAgents } = useQuery<ActiveAgent[]>({
    queryKey: ['activeAgentsForReconciliation'],
    queryFn: async () => {
      // Assuming a view or RPC function to get only active agents
      const { data, error } = await supabase.from('telecom_agent_floats').select('profiles(id, full_name)').eq('is_shift_active', true);
      if (error) throw error;
      return data.map((d: any) => ({ user_id: d.profiles.id, full_name: d.profiles.full_name }));
    },
  });

  const { mutate: reconcileShift, isPending } = useMutation({
    mutationFn: async (values: ReconciliationFormValues) => {
      const { data, error } = await supabase.rpc('reconcile_telecom_agent_shift', {
        p_user_id: values.agentId,
        p_cash_counted_by_manager: Number(values.cashCounted),
      });
      if (error) throw error;
      return data as ReconciliationResult;
    },
    onSuccess: (data) => {
      toast.success(`Shift for ${data.agent_name} reconciled.`);
      setResult(data);
      form.reset();
    },
    onError: (error: Error) => {
      toast.error(`Reconciliation failed: ${error.message}`);
      setResult(null);
    },
  });

  const form = useForm<ReconciliationFormValues>({
    resolver: zodResolver(reconciliationSchema),
    defaultValues: { agentId: '', cashCounted: '' },
  });

  return (
    <div className="space-y-4">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(data => reconcileShift(data))} className="space-y-4">
          <FormField
            control={form.control}
            name="agentId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Agent with Active Shift</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoadingAgents}>
                  <FormControl>
                    <SelectTrigger>{isLoadingAgents ? 'Loading agents...' : <SelectValue placeholder="Select an agent" />}</SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {activeAgents?.map(agent => (
                      <SelectItem key={agent.user_id} value={agent.user_id}>
                        {agent.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="cashCounted"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cash Counted by Manager</FormLabel>
                <FormControl><Input type="number" placeholder="e.g., 850000" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" disabled={isPending} className="w-full">
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Reconcile Shift
          </Button>
        </form>
      </Form>

      {result && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
                <span>Reconciliation Summary</span>
                <span className={`text-lg font-bold ${result.status === 'Balanced' ? 'text-green-500' : 'text-red-500'}`}>{result.status}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span>Agent:</span><span className="font-semibold">{result.agent_name}</span></div>
            <div className="flex justify-between"><span>Starting Float:</span><span>{result.starting_float.toLocaleString()}</span></div>
            <div className="flex justify-between"><span>Total Sales:</span><span>{result.total_sales_value.toLocaleString()}</span></div>
            <div className="flex justify-between"><span>Expected Cash:</span><span className="font-semibold">{result.expected_cash_on_hand.toLocaleString()}</span></div>
            <div className="flex justify-between"><span>Actual Cash Counted:</span><span className="font-semibold">{result.actual_cash_counted.toLocaleString()}</span></div>
            <div className={`flex justify-between font-bold text-lg ${result.variance !== 0 ? 'text-destructive' : ''}`}>
                <span>Variance:</span><span>{result.variance.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}