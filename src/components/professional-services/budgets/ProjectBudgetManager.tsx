'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
    Card, 
    CardHeader, 
    CardTitle, 
    CardContent, 
    CardDescription 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from "@/components/ui/progress";
import { 
    Dialog, 
    DialogContent, 
    DialogDescription, 
    DialogHeader, 
    DialogTitle, 
    DialogTrigger, 
    DialogFooter 
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Badge } from "@/components/ui/badge";
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast'; 
import { 
    Loader2, 
    Plus, 
    PieChart, 
    AlertCircle, 
    TrendingUp, 
    Wallet, 
    CheckCircle2,
    Target,
    BarChart3
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ProjectBudget {
  id: string;
  project_name: string;
  amount: number;
  spent: number;
  status: 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'CRITICAL';
  business_id: string;
}

/**
 * API Logic (Preserved)
 */
async function fetchProjectBudgets(businessId: string): Promise<ProjectBudget[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('project_budgets')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false });
  
  if (error) throw new Error(error.message);
  return data || [];
}

export default function ProjectBudgetManager({ 
    businessId, 
    currency = 'UGX' 
}: { 
    businessId: string, 
    currency?: string 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', amount: 0 });
  const queryClient = useQueryClient();
  const supabase = createClient();

  const { data: budgets, isLoading } = useQuery({
    queryKey: ['project-budgets', businessId],
    queryFn: () => fetchProjectBudgets(businessId),
    enabled: !!businessId
  });

  const totals = useMemo(() => {
    if (!budgets) return { totalAllocated: 0, totalSpent: 0, utilization: 0 };
    const allocated = budgets.reduce((s, b) => s + b.amount, 0);
    const spent = budgets.reduce((s, b) => s + b.spent, 0);
    return {
      totalAllocated: allocated,
      totalSpent: spent,
      utilization: allocated > 0 ? (spent / allocated) * 100 : 0
    };
  }, [budgets]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('project_budgets').insert({
        business_id: businessId,
        project_name: newProject.name,
        amount: newProject.amount,
        spent: 0,
        status: 'ACTIVE'
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Project budget initialized');
      setIsOpen(false);
      setNewProject({ name: '', amount: 0 });
      queryClient.invalidateQueries({ queryKey: ['project-budgets', businessId] });
    },
    onError: (e: Error) => toast.error(`Error: ${e.message}`)
  });

  return (
    <Card className="shadow-sm border-slate-200 overflow-hidden rounded-xl bg-white animate-in fade-in duration-500">
      <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between bg-slate-50/50 border-b p-6 gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg shadow-sm">
                <BarChart3 className="w-5 h-5 text-white"/> 
            </div>
            <CardTitle className="text-xl font-bold tracking-tight text-slate-900">
                Project Budgets
            </CardTitle>
          </div>
          <CardDescription className="text-sm font-medium text-slate-500 ml-1">
            Tracking capital utilization across active project milestones.
          </CardDescription>
        </div>
        
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700 font-bold shadow-sm rounded-lg h-10 px-6">
                <Plus className="w-4 h-4 mr-2"/> Initialize Project
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[450px] p-0 border-none rounded-xl shadow-2xl overflow-hidden">
            <DialogHeader className="p-8 bg-white border-b">
                <DialogTitle className="text-xl font-bold text-slate-900">New Project Budget</DialogTitle>
                <DialogDescription className="text-sm">Set the financial limit for a new company initiative.</DialogDescription>
            </DialogHeader>
            <div className="p-8 space-y-6 bg-white">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-700 uppercase">Project Name</Label>
                <Input 
                    value={newProject.name} 
                    onChange={e => setNewProject({...newProject, name: e.target.value})} 
                    placeholder="e.g. Q4 Marketing Campaign"
                    className="h-10 border-slate-200 font-semibold"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-700 uppercase">Total Allocation ({currency})</Label>
                <Input 
                    type="number" 
                    value={newProject.amount} 
                    onChange={e => setNewProject({...newProject, amount: Number(e.target.value)})}
                    className="h-10 border-slate-200 font-bold"
                />
              </div>
            </div>
            <DialogFooter className="bg-slate-50 p-6 border-t flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setIsOpen(false)} className="font-bold text-slate-500">Cancel</Button>
              <Button 
                onClick={() => createMutation.mutate()} 
                disabled={!newProject.name || newProject.amount <= 0 || createMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 font-bold px-8 h-10 rounded-lg shadow-sm"
              >
                {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <CheckCircle2 className="w-4 h-4 mr-2"/>} 
                Create Budget
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      
      <CardContent className="p-6 space-y-8">
        {/* KPI OVERVIEW */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Total Allocated</span>
                    <Wallet className="w-4 h-4 text-blue-600 opacity-60" />
                </div>
                <p className="text-2xl font-bold text-slate-900">{formatCurrency(totals.totalAllocated, currency)}</p>
            </div>
            <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Total Spent</span>
                    <TrendingUp className="w-4 h-4 text-purple-600 opacity-60" />
                </div>
                <p className="text-2xl font-bold text-slate-900">{formatCurrency(totals.totalSpent, currency)}</p>
            </div>
            <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm border-l-4 border-l-emerald-500">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Utilization</span>
                    <Target className="w-4 h-4 text-emerald-600 opacity-60" />
                </div>
                <p className="text-2xl font-bold text-slate-900">{totals.utilization.toFixed(1)}%</p>
            </div>
        </div>

        {/* PROJECT LIST */}
        {isLoading ? (
          <div className="py-32 text-center flex flex-col items-center">
              <Loader2 className="h-10 w-10 animate-spin text-blue-600 mb-4"/>
              <span className="font-semibold text-slate-400 uppercase tracking-widest text-xs">Syncing Ledger Data...</span>
          </div>
        ) : budgets?.length === 0 ? (
          <div className="py-32 text-center bg-slate-50/50 border border-dashed border-slate-200 rounded-xl">
              <p className="text-slate-400 font-medium italic">No active project budgets found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {budgets?.map(budget => {
              const percent = Math.min((budget.spent / budget.amount) * 100, 100);
              const isOverBudget = budget.spent > budget.amount;
              const isDanger = percent > 90 || isOverBudget;
              
              return (
                <div key={budget.id} className="p-6 border border-slate-200 rounded-xl bg-white hover:border-blue-500 transition-all shadow-sm group">
                  <div className="flex justify-between items-start mb-5">
                    <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase text-slate-400 tracking-tight">Project Name</span>
                        <h4 className="font-bold text-slate-900 text-base">{budget.project_name}</h4>
                    </div>
                    <Badge variant={isOverBudget ? "destructive" : "secondary"} className="text-[10px] font-bold tracking-tight uppercase px-2.5 py-0.5">
                        {isOverBudget ? 'Critical' : 'Operational'}
                    </Badge>
                  </div>

                  <div className="space-y-4">
                      <div className="flex justify-between items-end">
                        <div className="space-y-0.5">
                            <span className="text-[10px] font-bold uppercase text-slate-400">Total Spent</span>
                            <p className={cn("text-base font-bold", isOverBudget ? "text-red-600" : "text-slate-900")}>
                                {formatCurrency(budget.spent, currency)}
                            </p>
                        </div>
                        <div className="text-right space-y-0.5">
                            <span className="text-[10px] font-bold uppercase text-slate-400">Limit</span>
                            <p className="text-base font-semibold text-slate-500">
                                {formatCurrency(budget.amount, currency)}
                            </p>
                        </div>
                      </div>

                      <div className="pt-2">
                        <Progress 
                            value={percent} 
                            className={cn(
                                "h-2 bg-slate-100", 
                                isDanger ? "[&>div]:bg-red-500" : "[&>div]:bg-blue-600"
                            )} 
                        />
                      </div>
                      
                      <div className="flex justify-between items-center mt-1">
                        <div className="flex items-center gap-2">
                            {isOverBudget && <AlertCircle className="w-4 h-4 text-red-500" />}
                            <span className={cn(
                                "text-[10px] font-bold uppercase tracking-tight",
                                isOverBudget ? "text-red-600" : "text-slate-400"
                            )}>
                                {isOverBudget ? "Over Budget" : "Healthy Status"}
                            </span>
                        </div>
                        <span className={cn(
                            "text-xs font-bold",
                            isDanger ? "text-red-600" : "text-blue-600"
                        )}>
                            {percent.toFixed(1)}% USED
                        </span>
                      </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}