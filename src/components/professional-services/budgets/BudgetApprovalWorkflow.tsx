'use client';

import React, { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableCell, TableHeader, TableHead, TableRow, TableBody } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner'; // Unified enterprise notification suite
import { createClient } from '@/lib/supabase/client';
import { 
    CheckCircle2, 
    XCircle, 
    Loader2, 
    DollarSign, 
    ShieldAlert, 
    UserCheck,
    History
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';

interface BudgetRequest {
  id: string; // Standardized to UUID for enterprise DBs
  project_name: string;
  amount: number;
  requester: string;
  created_at: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  business_id: string;
}

/**
 * Enterprise Data Access Layer
 * Fetched with strict businessId isolation
 */
async function fetchPendingBudgets(businessId: string): Promise<BudgetRequest[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('project_budgets')
    .select('*')
    .eq('business_id', businessId)
    .eq('status', 'PENDING')
    .order('created_at', { ascending: false });
  
  if (error) throw new Error(error.message);
  return data || [];
}

/**
 * Atomic Status Update
 * Secured by businessId to prevent unauthorized cross-tenant operations
 */
async function updateBudgetStatus({ 
    id, 
    status, 
    businessId 
}: { 
    id: string, 
    status: 'APPROVED' | 'REJECTED', 
    businessId: string 
}) {
  const supabase = createClient();
  const { error } = await supabase
    .from('project_budgets')
    .update({ 
        status, 
        updated_at: new Date().toISOString() 
    })
    .eq('id', id)
    .eq('business_id', businessId);
  
  if (error) throw error;
}

export default function BudgetApprovalWorkflow({ 
    businessId, 
    currency = 'USD' 
}: { 
    businessId: string, 
    currency?: string 
}) {
  const queryClient = useQueryClient();
  const supabase = createClient();

  // 1. Authorization Queue Synchronization
  const { data: budgets, isLoading } = useQuery({
    queryKey: ['pending-budgets', businessId],
    queryFn: () => fetchPendingBudgets(businessId),
    enabled: !!businessId
  });

  // 2. Queue Metrics Logic
  const pendingTotal = useMemo(() => {
    return budgets?.reduce((sum, b) => sum + b.amount, 0) || 0;
  }, [budgets]);

  // 3. Strategic Action Engine
  const mutation = useMutation({
    mutationFn: updateBudgetStatus,
    onSuccess: (_, variables) => { 
      const action = variables.status === 'APPROVED' ? 'authorized' : 'rejected';
      toast.success(`Capital request successfully ${action}.`); 
      queryClient.invalidateQueries({ queryKey: ['pending-budgets', businessId] }); 
      // Also invalidate reports to reflect the new active budget
      queryClient.invalidateQueries({ queryKey: ['project-budgets', businessId] });
    },
    onError: (e: Error) => toast.error(`Authorization Failed: ${e.message}`)
  });

  return (
    <Card className="shadow-2xl border-none overflow-hidden rounded-2xl bg-white">
      <CardHeader className="bg-slate-50/50 border-b pb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-1">
                <div className="flex items-center gap-2">
                    <CardTitle className="text-xl font-black tracking-tight flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-blue-600"/> Strategic Authorization Queue
                    </CardTitle>
                    <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">v3.5 Interconnect</Badge>
                </div>
                <CardDescription className="font-medium text-slate-500">
                    Review and authorize project capital requests based on internal GAAP policy.
                </CardDescription>
            </div>
            
            {/* AGGREGATE PENDING LIQUIDITY BAR */}
            <div className="flex items-center gap-4 bg-white border px-4 py-2 rounded-xl shadow-sm">
                <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase text-slate-400 leading-none">Pending Capital Commit</span>
                    <span className="text-lg font-black font-mono text-blue-600">
                        {formatCurrency(pendingTotal, currency)}
                    </span>
                </div>
                <ShieldAlert className="w-5 h-5 text-slate-300" />
            </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow className="border-none">
                <TableHead className="py-4 text-[10px] font-black uppercase text-slate-500 pl-6">Project Nomenclature</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-slate-500">Initiator</TableHead>
                <TableHead className="text-right text-[10px] font-black uppercase text-slate-500">Strategic Value</TableHead>
                <TableHead className="text-center text-[10px] font-black uppercase text-slate-500">Status</TableHead>
                <TableHead className="text-right text-[10px] font-black uppercase text-slate-500 pr-6">Decision Hub</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                    <TableCell colSpan={5} className="py-24 text-center">
                        <div className="flex flex-col items-center gap-2">
                            <Loader2 className="h-10 w-10 animate-spin text-blue-600"/>
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Accessing Secure Vault...</span>
                        </div>
                    </TableCell>
                </TableRow>
              ) : budgets?.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={5} className="py-24 text-center">
                        <div className="flex flex-col items-center gap-2 text-slate-300">
                            <History className="w-8 h-8 opacity-20" />
                            <p className="text-sm font-medium italic">Authorization queue is currently clear.</p>
                        </div>
                    </TableCell>
                </TableRow>
              ) : (
                budgets?.map((b) => (
                  <TableRow key={b.id} className="hover:bg-slate-50/50 transition-colors border-slate-100">
                    <TableCell className="pl-6">
                        <div className="flex flex-col">
                            <span className="font-extrabold text-slate-900">{b.project_name}</span>
                            <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-tighter">ID: {b.id.slice(0,8)}</span>
                        </div>
                    </TableCell>
                    <TableCell>
                        <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-black">
                                {b.requester?.charAt(0) || 'S'}
                            </div>
                            <span className="text-sm font-semibold text-slate-600">{b.requester || 'ERP System'}</span>
                        </div>
                    </TableCell>
                    <TableCell className="text-right">
                        <span className="font-mono font-black text-slate-900 text-base">
                             {formatCurrency(b.amount, currency)}
                        </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-black uppercase tracking-widest">
                        Awaiting Review
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex justify-end gap-3">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-9 px-4 border-green-200 text-green-700 hover:bg-green-50 hover:text-green-800 font-bold text-xs"
                          onClick={() => mutation.mutate({ id: b.id, status: 'APPROVED', businessId })}
                          disabled={mutation.isPending}
                        >
                          {mutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserCheck className="w-3.5 h-3.5 mr-1.5"/>}
                          Authorize
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-9 w-9 text-slate-300 hover:text-red-600 hover:bg-red-50 p-0"
                          onClick={() => mutation.mutate({ id: b.id, status: 'REJECTED', businessId })}
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