'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Loader2, Scale } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface TenantContext { tenantId: string; currency: string; }

interface TBRow {
  account_code: string;
  account_name: string;
  debit: number;
  credit: number;
}

async function fetchTrialBalance(tenantId: string) {
  const db = createClient();
  const { data, error } = await db.rpc('get_trial_balance', { p_tenant_id: tenantId });
  if (error) throw error;
  return data as TBRow[];
}

export default function TrialBalanceReport({ tenant }: { tenant: TenantContext }) {
  const { data: rows, isLoading } = useQuery({
    queryKey: ['trial-balance', tenant.tenantId],
    queryFn: () => fetchTrialBalance(tenant.tenantId)
  });

  const totalDebit = rows?.reduce((sum, r) => sum + (r.debit || 0), 0) || 0;
  const totalCredit = rows?.reduce((sum, r) => sum + (r.credit || 0), 0) || 0;
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scale className="w-5 h-5 text-purple-600"/> Trial Balance
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="border rounded-md">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Account Code</TableHead>
                <TableHead>Account Name</TableHead>
                <TableHead className="text-right">Debit</TableHead>
                <TableHead className="text-right">Credit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={4} className="h-32 text-center"><Loader2 className="mx-auto animate-spin"/></TableCell></TableRow>
              ) : rows?.map((row) => (
                <TableRow key={row.account_code}>
                  <TableCell className="font-mono">{row.account_code}</TableCell>
                  <TableCell>{row.account_name}</TableCell>
                  <TableCell className="text-right">{row.debit > 0 ? row.debit.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}</TableCell>
                  <TableCell className="text-right">{row.credit > 0 ? row.credit.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            {rows && (
              <tfoot className="bg-slate-100 font-bold">
                <tr>
                  <td colSpan={2} className="p-4 text-right">Totals</td>
                  <td className="p-4 text-right text-purple-700">{totalDebit.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  <td className="p-4 text-right text-purple-700">{totalCredit.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                </tr>
              </tfoot>
            )}
          </Table>
        </div>
        
        {!isLoading && (
          <div className={`mt-4 p-3 rounded text-center font-bold ${isBalanced ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {isBalanced ? "Trial Balance is Balanced" : "Warning: Trial Balance is Out of Balance"}
          </div>
        )}
      </CardContent>
    </Card>
  );
}