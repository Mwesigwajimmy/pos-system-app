'use client';

import React from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { Loader2, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface TenantContext { 
    tenantId: string; 
    currency: string;
}

interface ProjectProfit {
    project_id: string;
    project_name: string;
    revenue: number;
    cost: number;
    profit: number;
    margin_pct: number;
}

async function fetchProfitability(tenantId: string) {
  const db = createClient();
  const { data, error } = await db.rpc('get_project_profitability', { tenant_id_param: tenantId });
  
  if (error) {
      console.error("RPC Error:", error);
      throw new Error("Failed to calculate profitability");
  }
  return data as ProjectProfit[];
}

export default function ProjectProfitabilityAnalysis({ tenant }: { tenant: TenantContext }) {
  const { data, isLoading } = useQuery({
    queryKey: ['proj-profitability', tenant.tenantId],
    queryFn: () => fetchProfitability(tenant.tenantId)
  });

  const formatMoney = (val: number) => {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: tenant.currency }).format(val);
  }

  return (
    <Card className="h-full border-t-4 border-t-emerald-600 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-600"/> Project Profitability
        </CardTitle>
        <CardDescription>Financial performance by engagement.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
            <Table>
            <TableHeader className="bg-slate-50">
                <TableRow>
                    <TableHead>Project</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead className="text-right">Net Profit</TableHead>
                    <TableHead className="text-right">Margin</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {isLoading ? (
                    <TableRow><TableCell colSpan={5} className="h-32 text-center"><Loader2 className="animate-spin mx-auto"/></TableCell></TableRow>
                ) : !data || data.length === 0 ? (
                     <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">No financial data available.</TableCell></TableRow>
                ) : (
                    data.map((p) => {
                        const margin = p.revenue > 0 ? (p.profit / p.revenue) * 100 : 0;
                        const isPositive = p.profit >= 0;

                        return (
                            <TableRow key={p.project_id} className="hover:bg-slate-50/50">
                                <TableCell className="font-medium text-slate-700">{p.project_name}</TableCell>
                                <TableCell className="text-right font-mono text-sm">{formatMoney(p.revenue)}</TableCell>
                                <TableCell className="text-right font-mono text-sm">{formatMoney(p.cost)}</TableCell>
                                <TableCell className={`text-right font-mono text-sm font-bold ${isPositive ? 'text-green-700' : 'text-red-600'}`}>
                                    {formatMoney(p.profit)}
                                </TableCell>
                                <TableCell className="text-right text-sm">
                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${isPositive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {margin.toFixed(1)}%
                                    </span>
                                </TableCell>
                            </TableRow>
                        )
                    })
                )}
            </TableBody>
            </Table>
        </div>
      </CardContent>
    </Card>
  )
}