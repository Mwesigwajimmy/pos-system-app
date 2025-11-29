'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableHead, TableRow, TableCell, TableBody } from '@/components/ui/table';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { createClient } from '@/lib/supabase/client';
import toast from "react-hot-toast";
import { Loader2, Plus, FolderTree } from "lucide-react";

interface TenantContext { tenantId: string; country: string; currency: string; }
interface Account { id: number; code: string; name: string; type: string; is_active: boolean; parent_id?: number; currency: string; }

const accountSchema = z.object({
  code: z.string().min(3, "Code min 3 chars"),
  name: z.string().min(3, "Name required"),
  type: z.enum(['asset', 'liability', 'equity', 'income', 'expense']),
});

async function fetchAccounts(tenantId: string) {
  const db = createClient();
  const { data, error } = await db.from('accounts').select('*').eq('tenant_id', tenantId).order('code', { ascending: true });
  if (error) throw error;
  return data as Account[];
}

async function addAccount({ account, tenant }: { account: z.infer<typeof accountSchema>, tenant: TenantContext }) {
  const db = createClient();
  const { error } = await db.from('accounts').insert([{ 
    ...account, 
    is_active: true, 
    currency: tenant.currency, 
    tenant_id: tenant.tenantId 
  }]);
  if (error) throw error;
}

export default function ChartOfAccountsManager({ tenant }: { tenant: TenantContext }) {
  const queryClient = useQueryClient();
  const { data: accounts, isLoading } = useQuery({ 
    queryKey: ['coa', tenant.tenantId], 
    queryFn: () => fetchAccounts(tenant.tenantId) 
  });

  const form = useForm({
    resolver: zodResolver(accountSchema),
    defaultValues: { code: '', name: '', type: 'asset' as const }
  });

  const mutation = useMutation({ 
    mutationFn: (values: z.infer<typeof accountSchema>) => addAccount({ account: values, tenant }),
    onSuccess: () => { 
      toast.success('Account added successfully'); 
      form.reset(); 
      queryClient.invalidateQueries({ queryKey: ['coa', tenant.tenantId] }); 
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to create account') 
  });

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><FolderTree className="w-5 h-5"/> Chart of Accounts</CardTitle>
        <CardDescription>Configure your general ledger structure.</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Creation Form */}
        <div className="bg-slate-50 p-4 rounded-lg mb-6 border">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(d => mutation.mutate(d))} className="flex flex-col md:flex-row gap-3 items-start">
              <FormField control={form.control} name="code" render={({field}) => (
                <FormItem className="w-32">
                  <FormControl><Input placeholder="Code" {...field} /></FormControl><FormMessage/>
                </FormItem>
              )}/>
              <FormField control={form.control} name="name" render={({field}) => (
                <FormItem className="flex-1">
                  <FormControl><Input placeholder="Account Name" {...field} /></FormControl><FormMessage/>
                </FormItem>
              )}/>
              <FormField control={form.control} name="type" render={({field}) => (
                <FormItem className="w-40">
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Type"/></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="asset">Asset</SelectItem>
                      <SelectItem value="liability">Liability</SelectItem>
                      <SelectItem value="equity">Equity</SelectItem>
                      <SelectItem value="income">Income</SelectItem>
                      <SelectItem value="expense">Expense</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage/>
                </FormItem>
              )}/>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin"/> : <Plus className="w-4 h-4 mr-1"/>} Add
              </Button>
            </form>
          </Form>
        </div>

        {/* List Table */}
        <div className="border rounded-md">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Currency</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="h-24 text-center"><Loader2 className="mx-auto animate-spin"/></TableCell></TableRow>
              ) : accounts?.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-mono font-medium">{a.code}</TableCell>
                  <TableCell>{a.name}</TableCell>
                  <TableCell className="capitalize badge">{a.type}</TableCell>
                  <TableCell><span className={`px-2 py-1 rounded text-xs font-medium ${a.is_active ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-800'}`}>{a.is_active ? 'Active' : 'Inactive'}</span></TableCell>
                  <TableCell className="text-slate-500">{a.currency}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}