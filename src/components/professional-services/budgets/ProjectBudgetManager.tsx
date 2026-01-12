'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from "@/components/ui/progress";
// FIXED: Added DialogDescription to the import list below
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
import { toast } from 'sonner'; 
import { 
    Loader2, 
    Plus, 
    PieChart, 
    AlertTriangle, 
    TrendingUp, 
    Wallet, 
    ShieldCheck,
    Target
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';

interface ProjectBudget {
  id: string;
  project_name: string;
  amount: number;
  spent: number;
  status: 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'CRITICAL';
  business_id: string;
}

/**
 * Enterprise API Layer
 * Strictly isolated by businessId
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
    currency = 'USD' 
}: { 
    businessId: string, 
    currency?: string 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', amount: 0 });
  const queryClient = useQueryClient();
  const supabase = createClient();

  // 1. Data Synchronization
  const { data: budgets, isLoading } = useQuery({
    queryKey: ['project-budgets', businessId],
    queryFn: () => fetchProjectBudgets(businessId),
    enabled: !!businessId
  });

  // 2. Performance Aggregation
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

  // 3. Mutation Engine
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
      toast.success('Strategic budget proposal initialized');
      setIsOpen(false);
      setNewProject({ name: '', amount: 0 });
      queryClient.invalidateQueries({ queryKey: ['project-budgets', businessId] });
    },
    onError: (e: Error) => toast.error(`Ledger Error: ${e.message}`)
  });

  return (
    <Card className="shadow-2xl border-none overflow-hidden rounded-2xl bg-white">
      <CardHeader className="flex flex-row items-center justify-between bg-slate-50/50 border-b pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <CardTitle className="text-xl font-black tracking-tight flex items-center gap-2">
                <PieChart className="w-5 h-5 text-blue-600"/> 
                Project Allocation Matrix
            </CardTitle>
            <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">v3.5 Interconnect</Badge>
          </div>
          <CardDescription className="font-medium text-slate-500">
            Real-time capital utilization tracking against project milestones.
          </CardDescription>
        </div>
        
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="bg-slate-900 shadow-lg hover:bg-slate-800 transition-all">
                <Plus className="w-4 h-4 mr-2"/> Initialize Project
            </Button>
          </DialogTrigger>
          <DialogContent className="border-t-8 border-t-blue-600">
            <DialogHeader>
                <DialogTitle className="text-2xl font-black">Create Capital Budget</DialogTitle>
                <DialogDescription>Define the financial ceiling for new project initiatives.</DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400">Project Nomenclature</Label>
                <Input 
                    value={newProject.name} 
                    onChange={e => setNewProject({...newProject, name: e.target.value})} 
                    placeholder="e.g. Q4 Infrastructure Expansion"
                    className="bg-slate-50"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400">Capital Allocation ({currency})</Label>
                <Input 
                    type="number" 
                    value={newProject.amount} 
                    onChange={e => setNewProject({...newProject, amount: Number(e.target.value)})}
                    className="bg-slate-50 font-mono font-bold"
                />
              </div>
            </div>
            <DialogFooter className="bg-slate-50 -mx-6 -mb-6 p-6 border-t mt-4">
              <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
              <Button 
                onClick={() => createMutation.mutate()} 
                disabled={!newProject.name || newProject.amount <= 0 || createMutation.isPending}
                className="bg-blue-700 px-8"
              >
                {createMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <ShieldCheck className="w-4 h-4 mr-2"/>} 
                Authorize Budget
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      
      <CardContent className="p-6 space-y-8">
        {/* HIGH-VALUE SNAPSHOT BAR */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center justify-between mb-2">
                    <Wallet className="w-4 h-4 text-blue-600" />
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Total Capital</span>
                </div>
                <p className="text-xl font-black">{formatCurrency(totals.totalAllocated, currency)}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center justify-between mb-2">
                    <TrendingUp className="w-4 h-4 text-purple-600" />
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Realized Spend</span>
                </div>
                <p className="text-xl font-black">{formatCurrency(totals.totalSpent, currency)}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center justify-between mb-2">
                    <Target className="w-4 h-4 text-green-600" />
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Avg Utilization</span>
                </div>
                <p className="text-xl font-black">{totals.utilization.toFixed(1)}%</p>
            </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-muted-foreground">
              <Loader2 className="h-10 w-10 animate-spin text-blue-600"/>
              <span className="font-bold text-sm">Syncing Capital Ledgers...</span>
          </div>
        ) : budgets?.length === 0 ? (
          <div className="text-center py-24 border-2 border-dashed rounded-3xl bg-slate-50/50">
              <p className="text-muted-foreground font-medium italic">No active capital projects detected in this business tenant.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {budgets?.map(budget => {
              const percent = Math.min((budget.spent / budget.amount) * 100, 100);
              const isOverBudget = budget.spent > budget.amount;
              const isDanger = percent > 90 || isOverBudget;
              
              return (
                <div key={budget.id} className="p-5 border-2 border-slate-100 rounded-2xl bg-white hover:border-blue-200 transition-all group">
                  <div className="flex justify-between items-start mb-4">
                    <div className="space-y-1">
                        <span className="text-xs font-black uppercase text-slate-400 tracking-tighter">Project Name</span>
                        <h4 className="font-extrabold text-slate-900 group-hover:text-blue-700 transition-colors">{budget.project_name}</h4>
                    </div>
                    <Badge className={cn(
                        "text-[10px] font-black tracking-widest uppercase px-2 py-0.5",
                        isOverBudget ? "bg-red-50 text-red-700 border-red-200" : "bg-green-50 text-green-700 border-green-200"
                    )}>
                        {isOverBudget ? 'Critical' : 'Operational'}
                    </Badge>
                  </div>

                  <div className="space-y-3">
                      <div className="flex justify-between items-end">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase text-slate-400">Funds Consumed</span>
                            <span className={cn("font-mono font-bold", isOverBudget ? "text-red-600" : "text-slate-900")}>
                                {formatCurrency(budget.spent, currency)}
                            </span>
                        </div>
                        <div className="text-right flex flex-col">
                            <span className="text-[10px] font-black uppercase text-slate-400">Allocation Ceiling</span>
                            <span className="font-mono text-slate-500 font-medium">
                                {formatCurrency(budget.amount, currency)}
                            </span>
                        </div>
                      </div>

                      <div className="relative pt-1">
                        <Progress 
                            value={percent} 
                            className={cn(
                                "h-2 bg-slate-100", 
                                isDanger ? "[&>div]:bg-red-500" : "[&>div]:bg-blue-600"
                            )} 
                        />
                      </div>
                      
                      <div className="flex justify-between items-center mt-2">
                        <div className="flex items-center gap-1.5">
                            {isOverBudget && <AlertTriangle className="w-3.5 h-3.5 text-red-500 animate-pulse" />}
                            <span className={cn(
                                "text-[10px] font-black uppercase tracking-widest",
                                isOverBudget ? "text-red-600" : "text-slate-400"
                            )}>
                                {isOverBudget ? "Budget Breach Detected" : "Within Parameters"}
                            </span>
                        </div>
                        <span className={cn(
                            "text-xs font-mono font-black",
                            isDanger ? "text-red-600" : "text-blue-600"
                        )}>
                            {percent.toFixed(1)}% UTILIZED
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