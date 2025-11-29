'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { Loader2, Plus, PieChart, AlertTriangle } from 'lucide-react';

interface TenantContext { tenantId: string; currency?: string; }

interface ProjectBudget {
  id: number;
  project_name: string;
  amount: number;
  spent: number;
  status: string;
}

async function fetchBudgets(tenantId: string) {
  const db = createClient();
  const { data, error } = await db
    .from('project_budgets')
    .select('*')
    .eq('tenant_id', tenantId)
    .neq('status', 'REJECTED');
  
  if (error) throw error;
  return data as ProjectBudget[];
}

export default function ProjectBudgetManager({ tenant }: { tenant: TenantContext }) {
  const [isOpen, setIsOpen] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', amount: 0 });
  const queryClient = useQueryClient();

  const { data: budgets, isLoading } = useQuery({
    queryKey: ['project-budgets', tenant.tenantId],
    queryFn: () => fetchBudgets(tenant.tenantId)
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const db = createClient();
      const { error } = await db.from('project_budgets').insert({
        tenant_id: tenant.tenantId,
        project_name: newProject.name,
        amount: newProject.amount,
        spent: 0,
        status: 'PENDING'
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Budget proposal created');
      setIsOpen(false);
      setNewProject({ name: '', amount: 0 });
      queryClient.invalidateQueries({ queryKey: ['project-budgets', tenant.tenantId] });
    },
    onError: (e: Error) => toast.error(e.message)
  });

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2"><PieChart className="w-5 h-5 text-indigo-600"/> Project Budgets</CardTitle>
          <CardDescription>Track spending against allocated funds.</CardDescription>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2"/> New Budget</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Project Budget</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Project Name</Label>
                <Input value={newProject.name} onChange={e => setNewProject({...newProject, name: e.target.value})} placeholder="e.g. Website Redesign"/>
              </div>
              <div className="space-y-2">
                <Label>Allocated Amount ({tenant.currency || '$'})</Label>
                <Input type="number" value={newProject.amount} onChange={e => setNewProject({...newProject, amount: Number(e.target.value)})}/>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
              <Button onClick={() => createMutation.mutate()} disabled={!newProject.name || newProject.amount <= 0 || createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin"/>} Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {isLoading ? (
          <div className="flex justify-center p-8"><Loader2 className="animate-spin text-slate-400"/></div>
        ) : budgets?.length === 0 ? (
          <p className="text-center text-muted-foreground p-8">No active budgets found.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {budgets?.map(budget => {
              const percent = Math.min((budget.spent / budget.amount) * 100, 100);
              const isOverBudget = budget.spent > budget.amount;
              
              return (
                <div key={budget.id} className="p-4 border rounded-lg bg-slate-50 space-y-2">
                  <div className="flex justify-between font-medium">
                    <span>{budget.project_name}</span>
                    <div className="flex items-center gap-1">
                        {isOverBudget && <AlertTriangle className="w-4 h-4 text-red-500" />}
                        <span className={isOverBudget ? "text-red-600 font-bold" : "text-slate-700"}>
                        {tenant.currency} {budget.spent.toLocaleString()} / {budget.amount.toLocaleString()}
                        </span>
                    </div>
                  </div>
                  
                  {/* FIX: Removed indicatorColor prop. Using conditional className instead. 
                      Note: Standard shadcn Progress doesn't easily change color via className without deep CSS, 
                      so we rely on the text above for color warning. 
                  */}
                  <Progress value={percent} className="h-2" />
                  
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span className="uppercase font-semibold tracking-wider">{budget.status}</span>
                    <span className={isOverBudget ? "text-red-600 font-bold" : ""}>{percent.toFixed(1)}% Used</span>
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