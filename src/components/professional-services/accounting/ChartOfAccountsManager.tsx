'use client';

import React from 'react';
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
import { Badge } from '@/components/ui/badge';

interface TenantContext { tenantId: string; country: string; currency: string; }

// Updated Interface to match 'accounting_accounts'
interface Account { 
  id: string; 
  business_id: string; 
  code: string; 
  name: string; 
  type: string; 
  subtype: string;
  is_active: boolean; 
  currency: string; 
  current_balance: number;
}

const accountSchema = z.object({
  code: z.string().min(3, "Code min 3 chars"),
  name: z.string().min(3, "Name required"),
  type: z.enum(['Asset', 'Liability', 'Equity', 'Revenue', 'Expense']),
});

// FIX: Pointing to 'accounting_accounts' instead of 'accounts'
async function fetchAccounts(tenantId: string) {
  const db = createClient();
  const { data, error } = await db
    .from('accounting_accounts')
    .select('*')
    .eq('business_id', tenantId)
    .order('code', { ascending: true });
    
  if (error) throw error;
  return data as Account[];
}

async function addAccount({ account, tenant }: { account: z.infer<typeof accountSchema>, tenant: TenantContext }) {
  const db = createClient();
  const { error } = await db.from('accounting_accounts').insert([{ 
    code: account.code,
    name: account.name,
    type: account.type,
    // Auto-assign subtype based on type to prevent errors
    subtype: account.type === 'Asset' ? 'current_asset' : 'other', 
    is_active: true, 
    currency: tenant.currency, 
    business_id: tenant.tenantId 
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
    defaultValues: { code: '', name: '', type: 'Asset' as const }
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
    <Card className="h-full border-none shadow-none">
      <CardHeader className="px-0">
        <CardTitle className="flex items-center gap-2"><FolderTree className="w-5 h-5"/> Chart of Accounts</CardTitle>
        <CardDescription>Configure your general ledger structure (Unified Finance System).</CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        {/* Creation Form */}
        <div className="bg-muted/30 p-4 rounded-lg mb-6 border">
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
                      <SelectItem value="Asset">Asset</SelectItem>
                      <SelectItem value="Liability">Liability</SelectItem>
                      <SelectItem value="Equity">Equity</SelectItem>
                      <SelectItem value="Revenue">Income</SelectItem>
                      <SelectItem value="Expense">Expense</SelectItem>
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
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="h-24 text-center"><Loader2 className="mx-auto animate-spin"/></TableCell></TableRow>
              ) : accounts?.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-mono font-medium">{a.code}</TableCell>
                  <TableCell>{a.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">{a.type}</Badge>
                  </TableCell>
                  <TableCell>
                     <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${a.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {a.is_active ? 'Active' : 'Inactive'}
                     </span>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                     {new Intl.NumberFormat('en-US', { style: 'currency', currency: a.currency || 'USD' }).format(a.current_balance || 0)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}