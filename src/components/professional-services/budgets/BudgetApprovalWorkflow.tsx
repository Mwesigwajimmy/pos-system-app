'use client';

import React, { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableCell, TableHeader, TableHead, TableRow, TableBody } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import toast from 'react-hot-toast'; 
import { createClient } from '@/lib/supabase/client';
import { 
    CheckCircle2, 
    XCircle, 
    Loader2, 
    DollarSign, 
    UserCheck,
    Clock,
    FileText,
    CheckSquare
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';

interface BudgetRequest {
  id: string;
  project_name: string;
  amount: number;
  requester: string;
  created_at: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  business_id: string;
}

/**
 * Data Access Layer (Preserved)
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
    currency = 'UGX' 
}: { 
    businessId: string, 
    currency?: string 
}) {
  const queryClient = useQueryClient();
  const supabase = createClient();

  const { data: budgets, isLoading } = useQuery({
    queryKey: ['pending-budgets', businessId],
    queryFn: () => fetchPendingBudgets(businessId),
    enabled: !!businessId
  });

  const pendingTotal = useMemo(() => {
    return budgets?.reduce((sum, b) => sum + b.amount, 0) || 0;
  }, [budgets]);

  const mutation = useMutation({
    mutationFn: updateBudgetStatus,
    onSuccess: (_, variables) => { 
      const action = variables.status === 'APPROVED' ? 'approved' : 'rejected';
      toast.success(`Budget request ${action}`); 
      queryClient.invalidateQueries({ queryKey: ['pending-budgets', businessId] }); 
      queryClient.invalidateQueries({ queryKey: ['project-budgets', businessId] });
    },
    onError: (e: Error) => toast.error(`Action failed: ${e.message}`)
  });

  return (
    <Card className="shadow-sm border-slate-200 overflow-hidden rounded-xl bg-white animate-in fade-in duration-500">
      <CardHeader className="bg-slate-50/50 border-b p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-1">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-600 rounded-lg shadow-sm">
                        <CheckSquare className="text-white w-5 h-5"/> 
                    </div>
                    <CardTitle className="text-xl font-bold tracking-tight text-slate-900">
                        Budget Approvals
                    </CardTitle>
                </div>
                <CardDescription className="text-sm font-medium text-slate-500 ml-1">
                    Review and authorize pending project capital requests.
                </CardDescription>
            </div>
            
            {/* PENDING TOTAL INDICATOR */}
            <div className="flex items-center gap-4 bg-white border border-slate-200 px-5 py-3 rounded-xl shadow-sm">
                <div className="flex flex-col">
                    <span className="text-[10px] font-bold uppercase text-slate-400 leading-none tracking-tight">Pending Approval Total</span>
                    <span className="text-xl font-bold text-blue-600 mt-1">
                        {formatCurrency(pendingTotal, currency)}
                    </span>
                </div>
                <div className="p-2 bg-blue-50 rounded-full">
                  <Clock className="w-4 h-4 text-blue-600" />
                </div>
            </div>
        </div>
      </CardHeader>

      <CardContent className="p-0 bg-white">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow className="border-b border-slate-200">
                <TableHead className="py-4 text-[10px] font-bold uppercase text-slate-500 pl-8 tracking-wider">Project Name</TableHead>
                <TableHead className="text-[10px] font-bold uppercase text-slate-500 h-12">Requester</TableHead>
                <TableHead className="text-right text-[10px] font-bold uppercase text-slate-500 h-12">Amount</TableHead>
                <TableHead className="text-center text-[10px] font-bold uppercase text-slate-500 h-12">Status</TableHead>
                <TableHead className="text-right text-[10px] font-bold uppercase text-slate-500 pr-8 h-12">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                    <TableCell colSpan={5} className="py-32 text-center">
                        <div className="flex flex-col items-center gap-2">
                            <Loader2 className="h-8 w-8 animate-spin text-blue-600"/>
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Loading Requests...</span>
                        </div>
                    </TableCell>
                </TableRow>
              ) : budgets?.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={5} className="py-24 text-center">
                        <div className="flex flex-col items-center gap-3 text-slate-400">
                            <CheckCircle2 className="w-10 h-10 text-emerald-500/20" />
                            <p className="text-sm font-medium italic uppercase tracking-tight">Approval queue is empty</p>
                        </div>
                    </TableCell>
                </TableRow>
              ) : (
                budgets?.map((b) => (
                  <TableRow key={b.id} className="hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0 group">
                    <TableCell className="pl-8 py-5">
                        <div className="flex flex-col">
                            <span className="font-bold text-slate-900 text-sm">{b.project_name}</span>
                            <span className="text-[10px] font-mono text-slate-400 font-semibold uppercase">REF: {b.id.slice(0,8)}</span>
                        </div>
                    </TableCell>
                    <TableCell>
                        <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center text-[11px] font-bold text-slate-600 border border-slate-200">
                                {b.requester?.charAt(0) || 'S'}
                            </div>
                            <span className="text-xs font-semibold text-slate-700">{b.requester || 'System'}</span>
                        </div>
                    </TableCell>
                    <TableCell className="text-right">
                        <span className="font-bold text-slate-900 text-sm">
                             {formatCurrency(b.amount, currency)}
                        </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="bg-amber-50 text-amber-700 border-amber-100 text-[10px] font-bold uppercase px-2.5">
                        In Review
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-8">
                      <div className="flex justify-end gap-2">
                        <Button 
                          size="sm" 
                          variant="default" 
                          className="h-8 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] px-4 rounded-md shadow-sm"
                          onClick={() => mutation.mutate({ id: b.id, status: 'APPROVED', businessId })}
                          disabled={mutation.isPending}
                        >
                          {mutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserCheck className="w-3.5 h-3.5 mr-1.5"/>}
                          Approve
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-8 w-8 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                          onClick={() => mutation.mutate({ id: b.id, status: 'REJECTED', businessId })}
                          disabled={mutation.isPending}
                        >
                          <XCircle className="w-4 h-4"/>
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