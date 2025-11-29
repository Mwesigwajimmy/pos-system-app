'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { createClient } from '@/lib/supabase/client';
import toast from "react-hot-toast";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, CheckCircle2 } from "lucide-react";

interface TenantContext { tenantId: string; currency: string;}

interface ReconRow { 
  id: number; 
  account_id: number; 
  date: string; 
  amount: number; 
  ref: string; 
  remark: string; 
  matched: boolean; 
}

async function fetchUnreconciled(accountId: number, tenantId: string) {
  const db = createClient();
  const { data, error } = await db
    .from('account_transactions')
    .select('*')
    .eq('account_id', accountId)
    .eq('tenant_id', tenantId)
    .eq('matched', false)
    .order('date', { ascending: false });
  
  if (error) throw error; 
  return data as ReconRow[];
}

async function markMatched({ ids, tenantId }: { ids: number[], tenantId: string }) {
  const db = createClient();
  const { error } = await db
    .from('account_transactions')
    .update({ matched: true })
    .in('id', ids)
    .eq('tenant_id', tenantId);
  
  if (error) throw error;
}

export default function AccountReconciliation({ tenant, accountId }: { tenant: TenantContext; accountId: number; }) {
  const queryClient = useQueryClient();
  const { data: rows, isLoading } = useQuery({ 
    queryKey: ['recon', accountId, tenant.tenantId], 
    queryFn: () => fetchUnreconciled(accountId, tenant.tenantId) 
  });
  
  const [selected, setSelected] = useState<number[]>([]);

  const mutation = useMutation({ 
    mutationFn: () => markMatched({ ids: selected, tenantId: tenant.tenantId }), 
    onSuccess: () => { 
      toast.success('Transactions reconciled successfully'); 
      setSelected([]); 
      // Correct v5 invalidation syntax
      queryClient.invalidateQueries({ queryKey: ['recon', accountId, tenant.tenantId] }); 
    }, 
    onError: (e: Error) => toast.error(e.message || 'Reconciliation failed') 
  });

  const handleSelect = (id: number, checked: boolean) => {
    setSelected(prev => checked ? [...prev, id] : prev.filter(item => item !== id));
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked && rows) {
      setSelected(rows.map(r => r.id));
    } else {
      setSelected([]);
    }
  };

  return (
    <Card className="h-full border-t-4 border-t-blue-600">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle>Account Reconciliation</CardTitle>
          <CardDescription>Match bank statement lines with system ledger entries.</CardDescription>
        </div>
        <Button 
          onClick={() => mutation.mutate()} 
          disabled={selected.length === 0 || mutation.isPending}
          className="bg-green-600 hover:bg-green-700"
        >
          {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <CheckCircle2 className="w-4 h-4 mr-2"/>}
          Reconcile ({selected.length})
        </Button>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="w-[50px]">
                  <Checkbox 
                    checked={rows && rows.length > 0 && selected.length === rows.length}
                    onCheckedChange={(checked) => handleSelectAll(!!checked)}
                  />
                </TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Remark</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="h-24 text-center"><Loader2 className="mx-auto animate-spin"/></TableCell></TableRow>
              ) : rows?.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">No unreconciled items found.</TableCell></TableRow>
              ) : (
                rows?.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <Checkbox 
                        checked={selected.includes(r.id)} 
                        onCheckedChange={(checked) => handleSelect(r.id, !!checked)}
                      />
                    </TableCell>
                    <TableCell>{new Date(r.date).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right font-mono font-medium">
                      {tenant.currency} {r.amount.toLocaleString()}
                    </TableCell>
                    <TableCell><Badge variant="outline">{r.ref}</Badge></TableCell>
                    <TableCell className="text-sm text-slate-600">{r.remark}</TableCell>
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