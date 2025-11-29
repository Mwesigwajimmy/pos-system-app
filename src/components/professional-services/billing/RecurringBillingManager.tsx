'use client';

import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Badge } from "@/components/ui/badge";
import { createClient } from '@/lib/supabase/client';
import { Loader2, Plus, Repeat } from 'lucide-react';
import toast from 'react-hot-toast';

interface TenantContext { tenantId: string; currency: string; }

interface RecurringInvoice { 
  id: string; 
  client_name: string;
  description: string; 
  amount: number; 
  interval: 'MONTHLY' | 'QUARTERLY' | 'YEARLY'; 
  next_run: string; 
  status: 'ACTIVE' | 'PAUSED' | 'CANCELLED'; 
}

const recurringSchema = z.object({
  client_name: z.string().min(2, "Client name required"),
  description: z.string().min(3, "Description required"),
  amount: z.coerce.number().min(1, "Amount must be positive"),
  interval: z.enum(['MONTHLY', 'QUARTERLY', 'YEARLY']),
});

type RecurringFormValues = z.infer<typeof recurringSchema>;

async function fetchRecurring(tenantId: string) {
  const db = createClient();
  const { data, error } = await db
    .from('recurring_invoices')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('next_run', { ascending: true });
  
  if (error) throw error;
  return data as RecurringInvoice[];
}

export default function RecurringBillingManager({ tenant }: { tenant: TenantContext }) {
  const queryClient = useQueryClient();
  
  const { data: recurringList, isLoading } = useQuery({ 
    queryKey: ['recurring', tenant.tenantId], 
    queryFn: () => fetchRecurring(tenant.tenantId) 
  });

  const form = useForm({
    resolver: zodResolver(recurringSchema),
    defaultValues: {
      client_name: '',
      description: '',
      amount: 0,
      interval: 'MONTHLY' as const
    }
  });

  const mutation = useMutation({
    mutationFn: async (val: RecurringFormValues) => {
      const db = createClient();
      const nextRun = new Date();
      nextRun.setMonth(nextRun.getMonth() + 1); // Default to next month

      const { error } = await db.from('recurring_invoices').insert({
        tenant_id: tenant.tenantId,
        currency: tenant.currency,
        status: 'ACTIVE',
        next_run: nextRun.toISOString(),
        ...val
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Recurring billing schedule created');
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['recurring', tenant.tenantId] });
    },
    onError: (e: Error) => toast.error(e.message || 'Creation failed')
  });

  return (
    <Card className="h-full border-t-4 border-t-blue-600">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Repeat className="w-5 h-5 text-blue-600"/> Recurring Billing</CardTitle>
        <CardDescription>Automate retainers and subscription invoices.</CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Creation Form */}
        <div className="bg-slate-50 p-4 rounded-lg border">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(d => mutation.mutate(d))} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <FormField control={form.control} name="client_name" render={({field}) => (
                  <FormItem>
                    <FormLabel>Client Name</FormLabel>
                    <FormControl><Input placeholder="Client Name" {...field} value={field.value as string}/></FormControl>
                    <FormMessage/>
                  </FormItem>
                )}/>
                <FormField control={form.control} name="description" render={({field}) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Description</FormLabel>
                    <FormControl><Input placeholder="Service Retainer..." {...field} value={field.value as string}/></FormControl>
                    <FormMessage/>
                  </FormItem>
                )}/>
                <FormField control={form.control} name="amount" render={({field}) => (
                  <FormItem>
                    <FormLabel>Amount ({tenant.currency})</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        {...field} 
                        onChange={e => field.onChange(e.target.valueAsNumber || 0)} 
                        value={field.value as number}
                      />
                    </FormControl>
                    <FormMessage/>
                  </FormItem>
                )}/>
              </div>
              
              <div className="flex justify-between items-end">
                <FormField control={form.control} name="interval" render={({field}) => (
                  <FormItem className="w-48">
                    <FormLabel>Billing Interval</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="MONTHLY">Monthly</SelectItem>
                        <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                        <SelectItem value="YEARLY">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage/>
                  </FormItem>
                )}/>
                <Button type="submit" disabled={mutation.isPending}>
                  {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Plus className="w-4 h-4 mr-2"/>}
                  Add Schedule
                </Button>
              </div>
            </form>
          </Form>
        </div>

        {/* List Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Interval</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Next Run</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="h-24 text-center"><Loader2 className="mx-auto animate-spin"/></TableCell></TableRow>
              ) : recurringList?.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">No recurring schedules active.</TableCell></TableRow>
              ) : (
                recurringList?.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.client_name}</TableCell>
                    <TableCell>{item.description}</TableCell>
                    <TableCell><Badge variant="outline">{item.interval}</Badge></TableCell>
                    <TableCell className="text-right font-mono font-bold">{tenant.currency} {item.amount.toLocaleString()}</TableCell>
                    <TableCell className="text-sm text-slate-500">{new Date(item.next_run).toLocaleDateString()}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={item.status === 'ACTIVE' ? 'default' : 'secondary'}>{item.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}