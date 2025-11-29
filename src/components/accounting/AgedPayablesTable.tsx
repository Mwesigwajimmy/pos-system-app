"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Loader2, Search, X } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { createClient } from '@/lib/supabase/client';
import { useTenant } from '@/hooks/useTenant';
import { differenceInDays, parseISO } from 'date-fns';

// Data shape from Database (Raw Bills)
interface Bill {
  id: string;
  vendor_name: string;
  amount_due: number;
  due_date: string;
  currency: string;
  status: string;
}

// Aggregated shape for UI
interface AgedPayable {
  supplier: string;
  due_0_30: number;
  due_31_60: number;
  due_61_90: number;
  due_90_plus: number;
  total: number;
  currency: string;
}

interface Props {
  tenantId?: string;
}

export default function AgedPayablesTable({ tenantId: propTenantId }: Props) {
  // 1. Context & Hooks
  const { data: tenant } = useTenant();
  const tenantId = propTenantId || tenant?.id;
  const supabase = createClient();

  // 2. State
  const [payables, setPayables] = useState<AgedPayable[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  // 3. Data Fetching & Aggregation
  useEffect(() => {
    if (!tenantId) return;

    const fetchAndAggregatePayables = async () => {
      try {
        // Fetch all open bills/invoices
        const { data: bills, error } = await supabase
          .from('accounting_bills')
          .select('id, vendor_name, amount_due, due_date, currency, status')
          .eq('tenant_id', tenantId)
          .neq('status', 'paid') // Only unpaid or partial
          .gt('amount_due', 0);  // Ensure there is a balance

        if (error) throw error;

        if (bills) {
          const today = new Date();
          const aggregation: Record<string, AgedPayable> = {};

          bills.forEach((bill: Bill) => {
            const supplier = bill.vendor_name || 'Unknown Supplier';
            
            // Initialize supplier row if not exists
            if (!aggregation[supplier]) {
              aggregation[supplier] = {
                supplier,
                due_0_30: 0,
                due_31_60: 0,
                due_61_90: 0,
                due_90_plus: 0,
                total: 0,
                currency: bill.currency || 'USD' // Default or mixed currency handling strategy needed for prod
              };
            }

            // Calculate Age
            const dueDate = parseISO(bill.due_date);
            const daysOverdue = differenceInDays(today, dueDate);
            const amount = bill.amount_due;

            // Bucket Logic
            if (daysOverdue <= 30) {
              aggregation[supplier].due_0_30 += amount;
            } else if (daysOverdue <= 60) {
              aggregation[supplier].due_31_60 += amount;
            } else if (daysOverdue <= 90) {
              aggregation[supplier].due_61_90 += amount;
            } else {
              aggregation[supplier].due_90_plus += amount;
            }

            // Total
            aggregation[supplier].total += amount;
          });

          // Convert to array and sort by Total Descending
          const reportData = Object.values(aggregation).sort((a, b) => b.total - a.total);
          setPayables(reportData);
        }
      } catch (error) {
        console.error("Error generating aged payables report:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAndAggregatePayables();
  }, [tenantId, supabase]);

  // 4. Filtering
  const filtered = useMemo(
    () =>
      payables.filter(
        p => p.supplier.toLowerCase().includes(filter.toLowerCase())
      ),
    [payables, filter]
  );

  // Helper for currency formatting
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // 5. Loading State
  if (loading && !payables.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Aged Payables</CardTitle>
          <CardDescription>Loading outstanding liability report...</CardDescription>
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
        <CardTitle>Aged Payables</CardTitle>
        <CardDescription>
          Analyze your outstanding liabilities grouped by overdue duration. Proactively clear longest due balances.
        </CardDescription>
        <div className="relative mt-3 max-w-xs">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Filter by supplier..." 
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
                <TableHead>Supplier</TableHead>
                <TableHead className="text-right">0-30 Days</TableHead>
                <TableHead className="text-right">31-60 Days</TableHead>
                <TableHead className="text-right">61-90 Days</TableHead>
                <TableHead className="text-right">90+ Days</TableHead>
                <TableHead className="text-right">Total Outstanding</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No outstanding payables found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((p, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{p.supplier}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {p.due_0_30 > 0 ? formatCurrency(p.due_0_30, p.currency) : '-'}
                    </TableCell>
                    <TableCell className="text-right text-yellow-600">
                      {p.due_31_60 > 0 ? formatCurrency(p.due_31_60, p.currency) : '-'}
                    </TableCell>
                    <TableCell className="text-right text-orange-600">
                      {p.due_61_90 > 0 ? formatCurrency(p.due_61_90, p.currency) : '-'}
                    </TableCell>
                    <TableCell className="text-right text-red-600 font-semibold">
                      {p.due_90_plus > 0 ? formatCurrency(p.due_90_plus, p.currency) : '-'}
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      {formatCurrency(p.total, p.currency)}
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