'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Table, TableRow, TableCell, TableHeader, TableHead, TableBody } from '@/components/ui/table';
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, AlertTriangle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface TenantContext { 
  tenantId: string; 
  currency: string; 
}

interface BudgetVarianceRow {
  project_id: string;
  project_name: string;
  budgeted: number;
  actual: number;
}

// Fetches aggregated budget data via a Postgres RPC function for performance
async function fetchBudgetVsActuals(tenantId: string) {
  const db = createClient();
  // Ensure your Supabase RPC function is named 'get_budget_vs_actuals' or adjust accordingly
  const { data, error } = await db.rpc('get_budget_vs_actuals', { p_tenant_id: tenantId });
  
  if (error) throw error;
  return data as BudgetVarianceRow[];
}

export default function BudgetVsActualsReport({ tenant }: { tenant: TenantContext }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['budgets-vs-actuals', tenant.tenantId],
    queryFn: () => fetchBudgetVsActuals(tenant.tenantId)
  });

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: tenant.currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(val);

  if (isError) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="flex items-center justify-center p-6 text-red-600 gap-2">
          <AlertTriangle className="w-5 h-5"/> Failed to load budget data.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full border-t-4 border-t-cyan-600 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-cyan-600"/> Budget vs Actuals
        </CardTitle>
        <CardDescription>
          Real-time analysis of project spending against approved budgets.
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="w-[30%]">Project</TableHead>
                <TableHead className="text-right">Budgeted</TableHead>
                <TableHead className="text-right">Actual Spent</TableHead>
                <TableHead className="text-center w-[20%]">Utilization</TableHead>
                <TableHead className="text-right">Variance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-slate-400"/>
                  </TableCell>
                </TableRow>
              ) : data?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                    No active project budgets found.
                  </TableCell>
                </TableRow>
              ) : (
                data?.map((row) => {
                  const variance = row.budgeted - row.actual;
                  const isOverBudget = variance < 0;
                  // Cap percentage at 100 for visual sanity, or allow overflow logic
                  const percentage = row.budgeted > 0 ? (row.actual / row.budgeted) * 100 : 0;
                  
                  return (
                    <TableRow key={row.project_id} className="hover:bg-slate-50">
                      <TableCell className="font-medium text-slate-800">
                        {row.project_name}
                      </TableCell>
                      
                      <TableCell className="text-right font-mono text-slate-600">
                        {formatCurrency(row.budgeted)}
                      </TableCell>
                      
                      <TableCell className="text-right font-mono font-medium">
                        {formatCurrency(row.actual)}
                      </TableCell>
                      
                      <TableCell className="align-middle">
                        <div className="flex flex-col gap-1">
                          <div className="flex justify-between text-[10px] text-muted-foreground">
                            <span>{percentage.toFixed(1)}%</span>
                          </div>
                          <Progress 
                            value={Math.min(percentage, 100)} 
                            className="h-2" 
                            // Custom class logic for progress bar color usually handled via CSS variables or distinct components in shadcn
                            // Here we use standard styling, logic implies visual warning if high
                          />
                        </div>
                      </TableCell>
                      
                      <TableCell className="text-right">
                        <Badge 
                          variant={isOverBudget ? "destructive" : "outline"}
                          className={!isOverBudget ? "bg-green-50 text-green-700 border-green-200" : ""}
                        >
                          {isOverBudget ? '-' : '+'}{formatCurrency(Math.abs(variance))}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}