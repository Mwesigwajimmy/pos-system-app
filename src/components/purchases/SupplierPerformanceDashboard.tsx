'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, BarChart3, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface TenantContext {
  tenantId: string;
  country: string;
  currency: string;
}

interface SupplierPerf {
  id: number;
  name: string;
  total_spend: number;
  avg_on_time_delivery: number; // 0 to 100
  defective_rate: number; // 0 to 100
  completed_orders: number;
  compliance_flags: number;
}

async function fetchSupplierPerformance(tenantId: string) {
  const supabase = createClient();
  // Using an RPC to handle the complex aggregation logic on the server
  const { data, error } = await supabase.rpc('get_supplier_performance', { tenant_id: tenantId });
  
  if (error) {
      console.error("RPC Error:", error);
      throw new Error("Could not calculate performance metrics.");
  }
  return data as SupplierPerf[];
}

export default function SupplierPerformanceDashboard({ tenant }: { tenant: TenantContext }) {
  const { data: suppliers, isLoading, isError } = useQuery({
    queryKey: ['supplier-performance', tenant.tenantId],
    queryFn: () => fetchSupplierPerformance(tenant.tenantId),
  });

  return (
    <Card className="h-full border-t-4 border-t-indigo-600 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-600"/> Supplier Scorecard
        </CardTitle>
        <CardDescription>Performance metrics based on order history and QA checks.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
            <Table>
                <TableHeader className="bg-slate-50">
                <TableRow>
                    <TableHead>Supplier Name</TableHead>
                    <TableHead className="text-right">Total Spend</TableHead>
                    <TableHead className="text-center">On-Time Delivery</TableHead>
                    <TableHead className="text-center">Defect Rate</TableHead>
                    <TableHead className="text-center">Orders</TableHead>
                    <TableHead className="text-right">Compliance</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {isLoading ? (
                    <TableRow><TableCell colSpan={6} className="h-32 text-center"><Loader2 className="animate-spin mx-auto"/></TableCell></TableRow>
                ) : isError ? (
                    <TableRow><TableCell colSpan={6} className="h-24 text-center text-red-500">Failed to load performance data.</TableCell></TableRow>
                ) : !suppliers || suppliers.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">No sufficient data for performance analysis.</TableCell></TableRow>
                ) : (
                    suppliers.map((s) => (
                    <TableRow key={s.id} className="hover:bg-slate-50/50">
                        <TableCell className="font-medium text-slate-800">{s.name}</TableCell>
                        <TableCell className="text-right font-mono">
                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: tenant.currency }).format(s.total_spend)}
                        </TableCell>
                        <TableCell className="text-center">
                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${s.avg_on_time_delivery >= 90 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                {s.avg_on_time_delivery?.toFixed(1)}%
                            </span>
                        </TableCell>
                        <TableCell className="text-center">
                            <span className={`font-mono text-xs ${s.defective_rate > 5 ? 'text-red-600 font-bold' : 'text-slate-600'}`}>
                                {s.defective_rate?.toFixed(2)}%
                            </span>
                        </TableCell>
                        <TableCell className="text-center">{s.completed_orders}</TableCell>
                        <TableCell className="text-right">
                        {s.compliance_flags > 0 ? (
                            <div className="flex items-center justify-end text-red-600 text-xs font-semibold">
                                <AlertTriangle className="w-3 h-3 mr-1"/> {s.compliance_flags} Flags
                            </div>
                        ) : (
                            <div className="flex items-center justify-end text-green-600 text-xs font-semibold">
                                <CheckCircle2 className="w-3 h-3 mr-1"/> Compliant
                            </div>
                        )}
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