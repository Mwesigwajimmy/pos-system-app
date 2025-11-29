'use client';

import React from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Loader2, Users, TrendingUp } from "lucide-react";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Progress } from "@/components/ui/progress";

interface TenantContext { 
    tenantId: string;
}

interface UtilizationRecord {
    employee_id: string;
    employee_name: string;
    total_hours: number;
    billable_hours: number;
    utilization_pct: number;
    realization_pct: number;
}

async function fetchUtilization(tenantId: string) {
  const db = createClient();
  // Using an RPC call for complex aggregation
  const { data, error } = await db.rpc('get_employee_utilization', { tenant_id_param: tenantId });
  
  if (error) {
      console.error("RPC Error:", error);
      throw new Error("Failed to calculate utilization metrics");
  }
  return data as UtilizationRecord[];
}

export default function UtilizationAndRealizationReport({ tenant }: { tenant: TenantContext }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['util-real', tenant.tenantId],
    queryFn: () => fetchUtilization(tenant.tenantId)
  });

  return (
    <Card className="h-full border-t-4 border-t-blue-500 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-500"/> Utilization & Realization
        </CardTitle>
        <CardDescription>Productivity metrics for billable resources.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
            <Table>
            <TableHeader className="bg-slate-50">
                <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Utilization</TableHead>
                    <TableHead>Realization</TableHead>
                    <TableHead className="text-right">Billable Hrs</TableHead>
                    <TableHead className="text-right">Total Hrs</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {isLoading ? (
                    <TableRow><TableCell colSpan={5} className="h-32 text-center"><Loader2 className="animate-spin mx-auto"/></TableCell></TableRow>
                ) : isError ? (
                    <TableRow><TableCell colSpan={5} className="h-24 text-center text-red-500">Failed to load report data.</TableCell></TableRow>
                ) : !data || data.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">No utilization data found for this period.</TableCell></TableRow>
                ) : (
                    data.map((r) => (
                    <TableRow key={r.employee_id} className="hover:bg-slate-50/50">
                        <TableCell className="font-medium text-slate-700">{r.employee_name}</TableCell>
                        <TableCell className="w-[200px]">
                            <div className="flex flex-col gap-1">
                                <span className="text-xs font-semibold">{r.utilization_pct.toFixed(1)}%</span>
                                <Progress value={r.utilization_pct} className="h-2" />
                            </div>
                        </TableCell>
                        <TableCell className="w-[200px]">
                             <div className="flex flex-col gap-1">
                                <span className="text-xs font-semibold">{r.realization_pct.toFixed(1)}%</span>
                                <Progress value={r.realization_pct} className="h-2 bg-slate-100" />
                            </div>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">{r.billable_hours.toFixed(1)}</TableCell>
                        <TableCell className="text-right font-mono text-sm">{r.total_hours.toFixed(1)}</TableCell>
                    </TableRow>
                    ))
                )}
            </TableBody>
            </Table>
        </div>
      </CardContent>
    </Card>
  )
}