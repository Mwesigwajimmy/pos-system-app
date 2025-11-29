'use client';

import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { useQuery } from '@tanstack/react-query';
import { Loader2, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";

interface TenantContext { 
    tenantId: string; 
    currency: string; 
}

interface FinancialRow {
    account_code: string;
    account_name: string;
    debit: number;
    credit: number;
}

async function fetchFinancialReport(year: number, tenantId: string) {
  const db = createClient();
  const { data, error } = await db.rpc('get_financial_report_by_year', { 
      year_param: year, 
      tenant_id_param: tenantId 
  });
  
  if (error) throw error;
  return data as FinancialRow[];
}

export default function FinancialReportGenerator({ tenant }: { tenant: TenantContext }) {
  const [year, setYear] = useState(new Date().getFullYear());
  const [queryYear, setQueryYear] = useState(new Date().getFullYear()); // Trigger fetch on button click

  const { data, isLoading } = useQuery({ 
      queryKey: ['fin-report', queryYear, tenant.tenantId], 
      queryFn: () => fetchFinancialReport(queryYear, tenant.tenantId) 
  });

  return (
    <Card className="h-full border-t-4 border-t-slate-800 shadow-sm">
      <CardHeader>
          <CardTitle>Financial Report Generator</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex items-center gap-2">
          <Input 
            type="number" 
            className="w-32" 
            value={year} 
            onChange={e => setYear(Number(e.target.value))}
            min={2000}
            max={2100}
          />
          <Button onClick={() => setQueryYear(year)} disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Search className="mr-2 h-4 w-4"/>}
              Generate Report
          </Button>
        </div>
        
        <div className="rounded-md border">
            <Table>
            <TableHeader className="bg-slate-50">
                <TableRow>
                    <TableHead>Account Name</TableHead>
                    <TableHead className="text-right">Total Debit</TableHead>
                    <TableHead className="text-right">Total Credit</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {isLoading ? (
                    <TableRow><TableCell colSpan={3} className="h-32 text-center"><Loader2 className="animate-spin mx-auto"/></TableCell></TableRow>
                ) : !data || data.length === 0 ? (
                    <TableRow><TableCell colSpan={3} className="h-24 text-center text-muted-foreground">No records found for {queryYear}.</TableCell></TableRow>
                ) : (
                    data.map((row) => (
                        <TableRow key={row.account_code}>
                            <TableCell className="font-medium">
                                <span className="text-xs text-slate-400 mr-2 font-mono">[{row.account_code}]</span>
                                {row.account_name}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                                {new Intl.NumberFormat('en-US', { style: 'currency', currency: tenant.currency }).format(row.debit)}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                                {new Intl.NumberFormat('en-US', { style: 'currency', currency: tenant.currency }).format(row.credit)}
                            </TableCell>
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