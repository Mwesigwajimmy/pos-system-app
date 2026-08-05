'use client';

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell, TableFooter } from "@/components/ui/table";
import { createClient } from "@/lib/supabase/client";
import { Loader2, ArrowRightLeft, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

interface Transaction {
  id: string;
  member_name: string;
  transaction_type: string;
  amount: number;
  currency: string; // Enterprise: Support multi-currency rows
  account_number: string;
  product_name: string;
  status: 'COMPLETED' | 'PENDING' | 'FAILED';
  created_at: string;
  // Optional fields — display only if sacco_transactions_view returns them; safe to ignore otherwise.
  reference?: string;
  payment_method?: string;
  processed_by?: string;
  balance_after?: number;
}

async function fetchTransactions(tenantId: string) {
  const db = createClient();
  const { data, error } = await db
    .from('sacco_transactions_view')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;
  return data as Transaction[];
}

const formatMoney = (amount: number, currency: string) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'UGX',
  }).format(amount ?? 0);

const statusBadgeClass = (status: Transaction['status']) => {
  if (status === 'COMPLETED') return 'bg-green-100 text-green-700 hover:bg-green-100';
  if (status === 'PENDING') return 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100';
  return 'bg-red-100 text-red-700 hover:bg-red-100';
};

export default function SaccoTransactionsTable({ tenantId }: { tenantId: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['sacco-transactions', tenantId],
    queryFn: () => fetchTransactions(tenantId),
    refetchInterval: 30000, // Real-time poll every 30s
  });

  return (
    <Card className="h-full border-t-4 border-t-cyan-600 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowRightLeft className="h-5 w-5 text-cyan-600" />
          Audit Trail
        </CardTitle>
        <CardDescription>Live feed of all financial movements across the cooperative.</CardDescription>
      </CardHeader>

      <CardContent>
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Member</TableHead>
                <TableHead>Product / Account</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Payment Method</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Processed By</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Balance After</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={10} className="h-32 text-center">
                    <Loader2 className="mx-auto animate-spin text-slate-400" />
                  </TableCell>
                </TableRow>
              ) : isError ? (
                <TableRow>
                  <TableCell colSpan={10} className="h-24 text-center text-red-500">
                    <div className="flex items-center justify-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      Failed to load transactions.
                    </div>
                  </TableCell>
                </TableRow>
              ) : !data || data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">
                    No recent transactions found.
                  </TableCell>
                </TableRow>
              ) : (
                data.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="align-middle whitespace-nowrap text-xs text-muted-foreground">
                      {format(new Date(t.created_at), 'MMM d, h:mm a')}
                    </TableCell>
                    <TableCell className="align-middle">
                      <div className="font-medium text-slate-800">{t.member_name}</div>
                    </TableCell>
                    <TableCell className="align-middle">
                      <div className="text-sm">{t.product_name}</div>
                      <div className="font-mono text-xs text-muted-foreground">{t.account_number}</div>
                    </TableCell>
                    <TableCell className="align-middle font-mono text-xs text-muted-foreground">
                      {t.reference || '—'}
                    </TableCell>
                    <TableCell className="align-middle">
                      <Badge variant="outline" className="text-[10px] font-normal">{t.transaction_type}</Badge>
                    </TableCell>
                    <TableCell className="align-middle text-sm text-slate-500">
                      {t.payment_method || '—'}
                    </TableCell>
                    <TableCell className="align-middle">
                      <Badge className={`text-[10px] ${statusBadgeClass(t.status)}`}>
                        {t.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="align-middle text-sm text-slate-500">
                      {t.processed_by || '—'}
                    </TableCell>
                    <TableCell
                      className={`align-middle whitespace-nowrap text-right font-mono font-semibold tabular-nums ${
                        t.amount < 0 ? 'text-red-600' : 'text-green-600'
                      }`}
                    >
                      {formatMoney(t.amount, t.currency)}
                    </TableCell>
                    <TableCell className="align-middle whitespace-nowrap text-right font-mono text-sm tabular-nums text-slate-600">
                      {t.balance_after !== undefined ? formatMoney(t.balance_after, t.currency) : '—'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>

            {!isLoading && !isError && data && data.length > 0 && (
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={10} className="text-xs text-muted-foreground">
                    Showing latest {data.length} transaction{data.length === 1 ? '' : 's'} · refreshes every 30s
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