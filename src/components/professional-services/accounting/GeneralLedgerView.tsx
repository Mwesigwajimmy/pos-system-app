'use client';

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";
import { Loader2, BookOpen, Filter } from "lucide-react";

interface LedgerEntry {
  id: string;
  transaction_date: string;
  account_code: string;
  account_name: string;
  description: string;
  debit: number;
  credit: number;
  reference: string;
}

interface Props {
  tenantId: string;
  currency: string;
}

async function fetchLedger(tenantId: string, startDate: string, endDate: string) {
  const db = createClient();
  const { data, error } = await db
    .from('journal_entry_lines')
    .select(`
      id,
      debit,
      credit,
      description,
      journal_entries!inner(date, reference),
      accounts!inner(code, name)
    `)
    .eq('tenant_id', tenantId)
    .gte('journal_entries.date', startDate)
    .lte('journal_entries.date', endDate)
    .order('journal_entries(date)', { ascending: false });

  if (error) throw error;

  return data.map((row: any) => ({
    id: row.id,
    transaction_date: row.journal_entries.date,
    reference: row.journal_entries.reference,
    account_code: row.accounts.code,
    account_name: row.accounts.name,
    description: row.description,
    debit: row.debit,
    credit: row.credit
  })) as LedgerEntry[];
}

export default function GeneralLedgerView({ tenantId, currency }: Props) {
  const [dateRange, setDateRange] = React.useState({
    start: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['general-ledger', tenantId, dateRange.start, dateRange.end],
    queryFn: () => fetchLedger(tenantId, dateRange.start, dateRange.end)
  });

  const totals = React.useMemo(() => {
    if (!data) return { debit: 0, credit: 0 };
    return data.reduce((acc, curr) => ({
      debit: acc.debit + curr.debit,
      credit: acc.credit + curr.credit
    }), { debit: 0, credit: 0 });
  }, [data]);

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-600"/> General Ledger
            </CardTitle>
            <CardDescription>Comprehensive record of all financial transactions.</CardDescription>
          </div>
          
          <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-600">From:</span>
              <Input 
                type="date" 
                className="w-36 h-8 bg-white" 
                value={dateRange.start} 
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-600">To:</span>
              <Input 
                type="date" 
                className="w-36 h-8 bg-white" 
                value={dateRange.end} 
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              />
            </div>
            <Button size="sm" variant="outline" onClick={() => refetch()}>
              <Filter className="w-4 h-4 mr-1"/> Filter
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="border rounded-md">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Debit ({currency})</TableHead>
                <TableHead className="text-right">Credit ({currency})</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="h-32 text-center"><Loader2 className="mx-auto animate-spin text-slate-400"/></TableCell></TableRow>
              ) : data?.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="h-32 text-center text-muted-foreground">No transactions found in this period.</TableCell></TableRow>
              ) : (
                data?.map((row) => (
                  <TableRow key={row.id} className="hover:bg-slate-50">
                    <TableCell className="text-xs text-slate-600">
                      {format(new Date(row.transaction_date), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-xs font-mono">{row.reference}</TableCell>
                    <TableCell className="text-sm">
                      <span className="font-mono text-slate-500 mr-2">{row.account_code}</span>
                      {row.account_name}
                    </TableCell>
                    <TableCell className="text-sm text-slate-600 max-w-[200px] truncate" title={row.description}>
                      {row.description}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {row.debit > 0 ? row.debit.toLocaleString(undefined, {minimumFractionDigits: 2}) : '-'}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {row.credit > 0 ? row.credit.toLocaleString(undefined, {minimumFractionDigits: 2}) : '-'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
            {!isLoading && data && data.length > 0 && (
              <tfoot className="bg-slate-100 font-bold text-sm">
                <TableRow>
                  <TableCell colSpan={4} className="text-right">Period Totals</TableCell>
                  <TableCell className="text-right text-blue-700">{totals.debit.toLocaleString(undefined, {minimumFractionDigits: 2})}</TableCell>
                  <TableCell className="text-right text-blue-700">{totals.credit.toLocaleString(undefined, {minimumFractionDigits: 2})}</TableCell>
                </TableRow>
              </tfoot>
            )}
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}