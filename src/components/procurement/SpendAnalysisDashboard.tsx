"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';
import { Loader2, TrendingDown, TrendingUp, BarChart3 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';

interface CategorySpend {
  category_name: string;
  total_budget: number;
  actual_spend: number;
  currency: string;
  transaction_count: number;
  entity: string;
}

interface Props {
  tenantId: string;
}

export default function SpendAnalysisDashboard({ tenantId }: Props) {
  const [spendData, setSpendData] = useState<CategorySpend[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    if (!tenantId) return;

    const fetchSpend = async () => {
      // Logic interconnected to the autonomous aggregation view
      const { data } = await supabase
        .from('view_spend_analysis_summary')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('actual_spend', { ascending: false });

      if (data) setSpendData(data as any);
      setLoading(false);
    };
    fetchSpend();
  }, [tenantId, supabase]);

  if (loading) return (
    <Card className="flex items-center justify-center p-20 shadow-sm border-none">
      <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
    </Card>
  );

  return (
    <Card className="col-span-1 lg:col-span-2 shadow-lg border-t-4 border-t-blue-600">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-600" /> Spend Analysis & Budget Tracking
          </CardTitle>
          <CardDescription>Real-time variance analysis of approved POs vs Category Budgets.</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead>Category & Entity</TableHead>
              <TableHead className="text-right">Activity</TableHead>
              <TableHead className="text-right">Actual Spend</TableHead>
              <TableHead className="w-[200px]">Budget Utilization</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {spendData.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center py-10 text-slate-400 italic">No spend or budget data found for this period.</TableCell></TableRow>
            ) : (
              spendData.map((item, idx) => {
                const spend = Number(item.actual_spend || 0);
                const budget = Number(item.total_budget || 1); // Prevent div by 0
                const utilization = Math.min((spend / budget) * 100, 100);
                const isOverBudget = spend > budget;

                return (
                  <TableRow key={idx} className="hover:bg-slate-50/50">
                    <TableCell>
                      <div className="font-bold text-slate-900">{item.category_name}</div>
                      <div className="text-[10px] text-slate-400 uppercase tracking-tighter">{item.entity}</div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {item.transaction_count} <span className="text-slate-400">POs</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="font-bold">{spend.toLocaleString()} {item.currency}</div>
                      <div className={`text-[10px] flex items-center justify-end gap-1 ${isOverBudget ? 'text-red-500' : 'text-green-500'}`}>
                         {isOverBudget ? <TrendingUp className="h-2 w-2"/> : <TrendingDown className="h-2 w-2"/>}
                         Budget: {budget.toLocaleString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-medium">
                           <span>{utilization.toFixed(0)}% Used</span>
                           {isOverBudget && <span className="text-red-600 font-bold">OVER LIMIT</span>}
                        </div>
                        <Progress 
                          value={utilization} 
                          className={`h-2 ${isOverBudget ? "[&>div]:bg-red-500" : "[&>div]:bg-blue-600"}`} 
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}