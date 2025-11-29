'use client';

import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableCell, TableHeader, TableHead, TableRow, TableBody } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import { CheckCircle, XCircle, Loader2, DollarSign } from 'lucide-react';

interface TenantContext { 
  tenantId: string; 
  currency?: string; 
}

interface BudgetRequest {
  id: number;
  project_name: string;
  amount: number;
  requester: string;
  created_at: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

async function fetchPendingBudgets(tenantId: string) {
  const db = createClient();
  const { data, error } = await db
    .from('project_budgets')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('status', 'PENDING') // Changed from boolean 'approved' to enum status
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data as BudgetRequest[];
}

async function updateBudgetStatus({ id, status, tenantId }: { id: number, status: 'APPROVED' | 'REJECTED', tenantId: string }) {
  const db = createClient();
  const { error } = await db
    .from('project_budgets')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('tenant_id', tenantId);
  
  if (error) throw error;
}

export default function BudgetApprovalWorkflow({ tenant }: { tenant: TenantContext }) {
  const queryClient = useQueryClient();
  
  const { data: budgets, isLoading } = useQuery({
    queryKey: ['pending-budgets', tenant.tenantId],
    queryFn: () => fetchPendingBudgets(tenant.tenantId)
  });

  const mutation = useMutation({
    mutationFn: updateBudgetStatus,
    onSuccess: () => { 
      toast.success('Budget status updated successfully'); 
      // FIX: Correct v5 syntax
      queryClient.invalidateQueries({ queryKey: ['pending-budgets', tenant.tenantId] }); 
    },
    onError: (e: Error) => toast.error(e.message || 'Action failed')
  });

  return (
    <Card className="h-full border-t-4 border-t-blue-600 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><DollarSign className="w-5 h-5 text-blue-600"/> Budget Approvals</CardTitle>
        <CardDescription>Review and authorize project budget requests.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Requested By</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="h-24 text-center"><Loader2 className="mx-auto animate-spin text-slate-400"/></TableCell></TableRow>
              ) : budgets?.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">No pending approvals.</TableCell></TableRow>
              ) : (
                budgets?.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">{b.project_name}</TableCell>
                    <TableCell className="text-sm text-slate-500">{b.requester || 'System'}</TableCell>
                    <TableCell className="text-right font-mono font-bold">
                      {tenant.currency || '$'} {b.amount.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Pending</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                          onClick={() => mutation.mutate({ id: b.id, status: 'APPROVED', tenantId: tenant.tenantId })}
                          disabled={mutation.isPending}
                        >
                          <CheckCircle className="w-5 h-5"/>
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => mutation.mutate({ id: b.id, status: 'REJECTED', tenantId: tenant.tenantId })}
                          disabled={mutation.isPending}
                        >
                          <XCircle className="w-5 h-5"/>
                        </Button>
                      </div>
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