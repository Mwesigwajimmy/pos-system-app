"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from "@/components/ui/input";
import { Loader2, Search, X, AlertCircle } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { createClient } from '@/lib/supabase/client';
import { useTenant } from '@/hooks/useTenant';

interface TrialBalanceEntry {
  id: string;
  account_name: string;
  account_code: string;
  entity: string;
  country: string;
  currency: string;
  total_debit: number;
  total_credit: number;
  closing_balance: number;
  tenant_id: string;
}

interface Props {
  tenantId?: string;
}

export default function TrialBalanceTable({ tenantId: propTenantId }: Props) {
  // 1. Context & Hooks
  const { data: tenant } = useTenant();
  const tenantId = propTenantId || tenant?.id;
  const supabase = createClient();

  // 2. State
  const [entries, setEntries] = useState<TrialBalanceEntry[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  // 3. Data Fetching
  useEffect(() => {
    if (!tenantId) return;

    const fetchTrialBalance = async () => {
      try {
        // Fetching from a dedicated view is best practice for Trial Balances 
        // to avoid expensive real-time aggregation of journal lines.
        const { data, error } = await supabase
          .from('accounting_trial_balance') 
          .select('*')
          .eq('tenant_id', tenantId)
          .order('account_code', { ascending: true });

        if (error) throw error;
        if (data) setEntries(data as unknown as TrialBalanceEntry[]);
      } catch (error) {
        console.error("Error fetching trial balance:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTrialBalance();
  }, [tenantId, supabase]);

  // 4. Filtering
  const filtered = useMemo(
    () =>
      entries.filter(
        e =>
          (e.account_name || '').toLowerCase().includes(filter.toLowerCase()) ||
          (e.account_code || '').toLowerCase().includes(filter.toLowerCase()) ||
          (e.entity || '').toLowerCase().includes(filter.toLowerCase()) ||
          (e.country || '').toLowerCase().includes(filter.toLowerCase())
      ),
    [entries, filter]
  );

  // 5. Currency Formatter Helper
  const formatMoney = (amount: number, currency: string) => {
    if (amount === 0) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // 6. Loading State
  if (loading && !entries.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Trial Balance</CardTitle>
          <CardDescription>Loading ledger balances...</CardDescription>
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
        <CardTitle>Trial Balance</CardTitle>
        <CardDescription>
          Global, multi-entity view. Instantly check your debits and credits for period close per company and currency.
        </CardDescription>
        <div className="relative mt-3 max-w-xs">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Filter account/entity..." 
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
        <ScrollArea className="h-[500px] border rounded-md">
          <Table>
            <TableHeader className="bg-gray-50 dark:bg-gray-800 sticky top-0 z-10">
              <TableRow>
                <TableHead>Account</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Country</TableHead>
                <TableHead className="text-right">Debit</TableHead>
                <TableHead className="text-right">Credit</TableHead>
                <TableHead className="text-right">Net Balance</TableHead>
                <TableHead className="text-center">Ccy</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No matching accounts found in Trial Balance.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(e => (
                  <TableRow key={e.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{e.account_name}</span>
                        <span className="text-xs text-muted-foreground">{e.account_code}</span>
                      </div>
                    </TableCell>
                    <TableCell>{e.entity}</TableCell>
                    <TableCell>{e.country}</TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">
                      {formatMoney(e.total_debit, e.currency)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">
                      {formatMoney(e.total_credit, e.currency)}
                    </TableCell>
                    <TableCell className={`text-right font-mono font-semibold ${e.closing_balance < 0 ? 'text-red-600' : 'text-green-700'}`}>
                      {formatMoney(e.closing_balance, e.currency)}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-xs font-mono border px-1 rounded bg-muted">
                        {e.currency}
                      </span>
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