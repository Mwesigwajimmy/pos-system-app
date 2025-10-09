'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface ServiceBalance {
  id: number;
  service_description: string;
}

const requestSchema = z.object({
  serviceBalanceId: z.string().min(1, "Please select a float pool."),
  amount: z.string().refine(val => Number(val) > 0, "Amount must be greater than zero."),
  notes: z.string().min(10, "Please provide a brief justification (min 10 characters)."),
});

type RequestFormValues = z.infer<typeof requestSchema>;

export function FloatRequestComponent() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  const { data: serviceBalances, isLoading: isLoadingBalances } = useQuery<ServiceBalance[]>({
    queryKey: ['serviceBalances'],
    queryFn: async () => {
      const { data, error } = await supabase.from('telecom_service_balances').select('id, service_description');
      if (error) throw error;
      return data;
    },
  });

  const { mutate: submitRequest, isPending } = useMutation({
    mutationFn: async (values: RequestFormValues) => {
      const { error } = await supabase.rpc('request_telecom_float', {
        p_service_balance_id: Number(values.serviceBalanceId),
        p_amount: Number(values.amount),
        p_notes: values.notes,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Float request submitted successfully.');
      queryClient.invalidateQueries({ queryKey: ['pendingFloatRequests'] });
      form.reset();
    },
    onError: (error: Error) => {
      toast.error(`Failed to submit request: ${error.message}`);
    },
  });

  const form = useForm<RequestFormValues>({
    resolver: zodResolver(requestSchema),
    defaultValues: { serviceBalanceId: '', amount: '', notes: '' },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(data => submitRequest(data))} className="space-y-4">
        <FormField
          control={form.control}
          name="serviceBalanceId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Float Pool</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoadingBalances}>
                <FormControl>
                  <SelectTrigger>{isLoadingBalances ? 'Loading pools...' : <SelectValue placeholder="Select a float pool to request from" />}</SelectTrigger>
                </FormControl>
                <SelectContent>
                  {serviceBalances?.map(balance => (
                    <SelectItem key={balance.id} value={String(balance.id)}>
                      {balance.service_description}
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
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount Requested</FormLabel>
              <FormControl><Input type="number" placeholder="e.g., 200000" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Justification / Notes</FormLabel>
              <FormControl><Textarea placeholder="Reason for the float request..." {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isPending} className="w-full">
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Submit Request
        </Button>
      </form>
    </Form>
  );
}