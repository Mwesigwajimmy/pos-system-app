'use client';

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell, TableFooter } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, Inbox } from "lucide-react";

interface Contribution {
  id: string;
  member_id: string;
  member_name: string; // From View/Join
  contribution_date: string;
  amount: number;
  product_name: string;
  reference: string;
  // Optional fields — display only if your view returns them; safe to ignore otherwise.
  payment_method?: string;
  status?: string; // e.g. Completed / Pending / Reversed
  processed_by?: string; // staff member who recorded the transaction
}

async function fetchContributions(tenantId: string) {
  const db = createClient();
  // Ideally querying a view that joins members and savings_products
  const { data, error } = await db
    .from('member_contributions_view')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('contribution_date', { ascending: false })
    .limit(50); // Pagination recommended for real apps

  if (error) throw error;
  return data as Contribution[];
}

const formatAmount = (value: number) =>
  `UGX ${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2 }).format(value ?? 0)}`;

const statusBadgeVariant = (status?: string): 'default' | 'outline' | 'destructive' | 'secondary' => {
  const normalized = (status || '').toLowerCase();
  if (normalized === 'completed') return 'default';
  if (normalized === 'reversed' || normalized === 'failed') return 'destructive';
  if (normalized === 'pending') return 'secondary';
  return 'outline';
};

export function MemberContributionsTable({ tenantId }: { tenantId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['contributions', tenantId],
    queryFn: () => fetchContributions(tenantId),
  });

  const total = React.useMemo(
    () => (data ?? []).reduce((sum, c) => sum + (c.amount ?? 0), 0),
    [data]
  );

  return (
    <Card className="h-full border-t-4 border-t-emerald-500 shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-emerald-500" />
            Member Contributions
          </CardTitle>
          <CardDescription>Recent savings deposits and share capital payments.</CardDescription>
        </div>
        {!isLoading && data && data.length > 0 && (
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Total shown</div>
            <div className="font-mono text-sm font-semibold text-emerald-700">{formatAmount(total)}</div>
          </div>
        )}
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto border-t">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="pl-6">Member</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Payment Method</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Processed By</TableHead>
                <TableHead className="pr-6 text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center">
                    <Loader2 className="mx-auto animate-spin text-slate-400" />
                  </TableCell>
                </TableRow>
              ) : !data || data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Inbox className="h-5 w-5" />
                      <span>No contribution records found.</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                data.map((c) => (
                  <TableRow key={c.id} className="hover:bg-slate-50/50">
                    <TableCell className="align-middle pl-6 font-medium text-slate-700">
                      <div className="flex flex-col">
                        <span>{c.member_name}</span>
                        <span className="font-mono text-[10px] text-muted-foreground">Ref: {c.reference || '—'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="align-middle">
                      <Badge variant="outline" className="bg-slate-100 font-normal text-slate-600">
                        {c.product_name}
                      </Badge>
                    </TableCell>
                    <TableCell className="align-middle text-sm text-slate-500">
                      {c.payment_method || '—'}
                    </TableCell>
                    <TableCell className="align-middle">
                      <Badge variant={statusBadgeVariant(c.status)}>
                        {c.status || 'Completed'}
                      </Badge>
                    </TableCell>
                    <TableCell className="align-middle whitespace-nowrap text-sm text-slate-500">
                      {format(new Date(c.contribution_date), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="align-middle text-sm text-slate-500">
                      {c.processed_by || '—'}
                    </TableCell>
                    <TableCell className="align-middle pr-6 text-right font-mono font-semibold tabular-nums text-emerald-700">
                      {formatAmount(c.amount)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>

            {!isLoading && data && data.length > 0 && (
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={6} className="pl-6 text-xs text-muted-foreground">
                    Showing latest {data.length} record{data.length === 1 ? '' : 's'}
                  </TableCell>
                  <TableCell className="pr-6 text-right font-mono font-semibold tabular-nums text-emerald-700">
                    {formatAmount(total)}
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