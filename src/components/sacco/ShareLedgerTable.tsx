'use client';

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell, TableFooter } from "@/components/ui/table";
import { createClient } from "@/lib/supabase/client";
import { PieChart, Loader2, TrendingUp, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface ShareTxn {
  id: string;
  member_name: string;
  member_no: string;
  created_at: string;
  transaction_type: 'PURCHASE' | 'TRANSFER' | 'DIVIDEND_REINVEST';
  number_of_shares: number;
  amount: number;
  currency: string; // Added for multi-currency
  share_price_at_txn: number;
  // Optional fields — display only if sacco_share_ledger_view returns them; safe to ignore otherwise.
  reference?: string;
  shares_balance_after?: number;
  processed_by?: string;
  status?: 'COMPLETED' | 'PENDING' | 'REVERSED';
}

async function fetchShareLedger(tenantId: string) {
  const db = createClient();
  const { data, error } = await db
    .from('sacco_share_ledger_view')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw new Error(error.message);
  return data as ShareTxn[];
}

const formatMoney = (val: number, currency: string) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'UGX' }).format(val ?? 0);

const statusBadgeVariant = (status?: ShareTxn['status']): 'default' | 'outline' | 'destructive' | 'secondary' => {
  if (!status || status === 'COMPLETED') return 'default';
  if (status === 'REVERSED') return 'destructive';
  return 'secondary'; // PENDING
};

export default function ShareLedgerTable({ tenantId }: { tenantId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['share-ledger', tenantId],
    queryFn: () => fetchShareLedger(tenantId),
  });

  const totalShares = React.useMemo(
    () => (data ?? []).reduce((sum, s) => sum + (s.number_of_shares ?? 0), 0),
    [data]
  );
  const totalValue = React.useMemo(
    () => (data ?? []).reduce((sum, s) => sum + (s.amount ?? 0), 0),
    [data]
  );

  return (
    <Card className="h-full border-t-4 border-t-indigo-500 shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5 text-indigo-500" />
            Share Capital Ledger
          </CardTitle>
          <CardDescription>Real-time tracking of member equity and share transfers.</CardDescription>
        </div>
        {!isLoading && data && data.length > 0 && (
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Total units shown</div>
            <div className="font-mono text-sm font-semibold text-indigo-700">{totalShares.toLocaleString()}</div>
          </div>
        )}
      </CardHeader>

      <CardContent>
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Member Details</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Transaction Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Units</TableHead>
                <TableHead className="text-right">Share Price</TableHead>
                <TableHead className="text-right">Units Balance</TableHead>
                <TableHead>Processed By</TableHead>
                <TableHead className="text-right">Total Value</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={10} className="h-32 text-center">
                    <Loader2 className="mx-auto animate-spin text-indigo-200" />
                  </TableCell>
                </TableRow>
              ) : !data || data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">
                    No share transactions recorded yet.
                  </TableCell>
                </TableRow>
              ) : (
                data.map((s) => (
                  <TableRow key={s.id} className="group hover:bg-slate-50">
                    <TableCell className="align-middle whitespace-nowrap text-xs text-muted-foreground">
                      {format(new Date(s.created_at), 'MMM d, yyyy HH:mm')}
                    </TableCell>
                    <TableCell className="align-middle">
                      <div className="flex items-center gap-2">
                        <div className="rounded-full bg-indigo-50 p-1"><User className="h-3 w-3 text-indigo-400" /></div>
                        <div>
                          <div className="font-medium text-slate-900">{s.member_name}</div>
                          <div className="font-mono text-[10px] text-muted-foreground">{s.member_no}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="align-middle font-mono text-xs text-muted-foreground">
                      {s.reference || '—'}
                    </TableCell>
                    <TableCell className="align-middle">
                      <Badge variant="secondary" className="text-[10px] font-normal">
                        {s.transaction_type === 'DIVIDEND_REINVEST' && <TrendingUp className="mr-1 h-3 w-3 text-green-600" />}
                        {s.transaction_type.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="align-middle">
                      <Badge variant={statusBadgeVariant(s.status)} className="text-[10px]">
                        {s.status || 'COMPLETED'}
                      </Badge>
                    </TableCell>
                    <TableCell className="align-middle text-right font-mono tabular-nums text-slate-600">
                      {s.number_of_shares.toLocaleString()}
                    </TableCell>
                    <TableCell className="align-middle text-right font-mono tabular-nums text-slate-500">
                      {formatMoney(s.share_price_at_txn, s.currency)}
                    </TableCell>
                    <TableCell className="align-middle text-right font-mono tabular-nums text-slate-500">
                      {s.shares_balance_after !== undefined ? s.shares_balance_after.toLocaleString() : '—'}
                    </TableCell>
                    <TableCell className="align-middle text-sm text-muted-foreground">
                      {s.processed_by || '—'}
                    </TableCell>
                    <TableCell className="align-middle text-right font-mono font-bold tabular-nums text-slate-800">
                      {formatMoney(s.amount, s.currency)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>

            {!isLoading && data && data.length > 0 && (
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={5} className="text-xs text-muted-foreground">
                    Showing latest {data.length} transaction{data.length === 1 ? '' : 's'}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs font-semibold tabular-nums">
                    {totalShares.toLocaleString()}
                  </TableCell>
                  <TableCell colSpan={2} />
                  <TableCell />
                  <TableCell className="text-right font-mono text-xs font-semibold tabular-nums">
                    {formatMoney(totalValue, data[0]?.currency)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}