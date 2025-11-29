"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from "@/components/ui/input";
import { Loader2, Search, X } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { createClient } from '@/lib/supabase/client';
import { useTenant } from '@/hooks/useTenant';
import { differenceInDays, parseISO } from 'date-fns';

// Raw DB Data Shape
interface Invoice {
  id: string;
  customer_name: string;
  amount_due: number;
  due_date: string;
  currency: string;
  status: string;
  entity?: string;
  country?: string; // Optional if not denormalized in invoices table
}

// Aggregated Report Shape
interface AgedReceivable {
  customer: string;
  entity: string;
  country: string;
  currency: string;
  due_0_30: number;
  due_31_60: number;
  due_61_90: number;
  due_90_plus: number;
  total: number;
}

interface Props {
  tenantId?: string;
}

export default function AgedReceivablesTable({ tenantId: propTenantId }: Props) {
  // 1. Context & Hooks
  const { data: tenant } = useTenant();
  const tenantId = propTenantId || tenant?.id;
  const supabase = createClient();

  // 2. State
  const [receivables, setReceivables] = useState<AgedReceivable[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  // 3. Data Fetching & Aggregation
  useEffect(() => {
    if (!tenantId) return;

    const fetchAndAggregateReceivables = async () => {
      try {
        // Fetch unpaid invoices
        const { data: invoices, error } = await supabase
          .from('accounting_invoices')
          .select('id, customer_name, amount_due, due_date, currency, status, entity, country')
          .eq('tenant_id', tenantId)
          .neq('status', 'paid')
          .gt('amount_due', 0); // Only positive outstanding balances

        if (error) throw error;

        if (invoices) {
          const today = new Date();
          const aggregation: Record<string, AgedReceivable> = {};

          invoices.forEach((inv: Invoice) => {
            const customer = inv.customer_name || 'Unknown Customer';
            const currency = inv.currency || 'USD';
            // Create a unique key for grouping (Customer + Currency) to avoid mixing currencies
            const key = `${customer}-${currency}`;

            if (!aggregation[key]) {
              aggregation[key] = {
                customer,
                entity: inv.entity || 'N/A',
                country: inv.country || 'N/A',
                currency,
                due_0_30: 0,
                due_31_60: 0,
                due_61_90: 0,
                due_90_plus: 0,
                total: 0,
              };
            }

            const dueDate = parseISO(inv.due_date);
            const daysOverdue = differenceInDays(today, dueDate);
            const amount = inv.amount_due;

            // Bucketing Logic
            if (daysOverdue <= 30) {
              aggregation[key].due_0_30 += amount;
            } else if (daysOverdue <= 60) {
              aggregation[key].due_31_60 += amount;
            } else if (daysOverdue <= 90) {
              aggregation[key].due_61_90 += amount;
            } else {
              aggregation[key].due_90_plus += amount;
            }

            aggregation[key].total += amount;
          });

          // Convert aggregation map to array and sort by Total amount descending
          const reportData = Object.values(aggregation).sort((a, b) => b.total - a.total);
          setReceivables(reportData);
        }
      } catch (error) {
        console.error("Error generating aged receivables report:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAndAggregateReceivables();
  }, [tenantId, supabase]);

  // 4. Filtering
  const filtered = useMemo(
    () =>
      receivables.filter(
        r =>
          r.customer.toLowerCase().includes(filter.toLowerCase()) ||
          r.entity.toLowerCase().includes(filter.toLowerCase()) ||
          r.country.toLowerCase().includes(filter.toLowerCase())
      ),
    [receivables, filter]
  );

  // Helper for currency formatting
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // 5. Loading State
  if (loading && !receivables.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Aged Receivables</CardTitle>
          <CardDescription>Loading outstanding invoice report...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Aged Receivables</CardTitle>
        <CardDescription>
          Analyze outstanding receivables per tenant, country, and customer. Multi-currency, global view.
        </CardDescription>
        <div className="relative mt-3 max-w-xs">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Filter by customer/entity..." 
            value={filter} 
            onChange={e => setFilter(e.target.value)} 
            className="pl-8" 
          />
          {filter && (
            <X 
              className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground cursor-pointer hover:text-foreground" 
              onClick={() => setFilter('')}
            />
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] border rounded-md">
          <Table>
            <TableHeader className="bg-gray-50 dark:bg-gray-800 sticky top-0 z-10">
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Currency</TableHead>
                <TableHead className="text-right">0-30</TableHead>
                <TableHead className="text-right">31-60</TableHead>
                <TableHead className="text-right">61-90</TableHead>
                <TableHead className="text-right">90+</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    No outstanding receivables found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((r, idx) => (
                  <TableRow key={`${r.customer}-${idx}`}>
                    <TableCell className="font-medium">{r.customer}</TableCell>
                    <TableCell>{r.entity}</TableCell>
                    <TableCell>{r.country}</TableCell>
                    <TableCell>
                      <span className="font-mono text-xs border px-1 rounded bg-muted">{r.currency}</span>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {r.due_0_30 > 0 ? formatCurrency(r.due_0_30, r.currency) : '-'}
                    </TableCell>
                    <TableCell className="text-right text-yellow-600">
                      {r.due_31_60 > 0 ? formatCurrency(r.due_31_60, r.currency) : '-'}
                    </TableCell>
                    <TableCell className="text-right text-orange-600">
                      {r.due_61_90 > 0 ? formatCurrency(r.due_61_90, r.currency) : '-'}
                    </TableCell>
                    <TableCell className="text-right text-red-600 font-semibold">
                      {r.due_90_plus > 0 ? formatCurrency(r.due_90_plus, r.currency) : '-'}
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      {formatCurrency(r.total, r.currency)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}