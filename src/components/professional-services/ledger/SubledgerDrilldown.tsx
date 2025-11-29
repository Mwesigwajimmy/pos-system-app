'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search, Filter } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface TenantContext { 
    tenantId: string;
    currency: string;
}

interface ChartOfAccount {
    code: string;
    name: string;
}

interface SubledgerEntry {
    id: string;
    date: string;
    description: string;
    debit: number;
    credit: number;
    balance: number;
    related_entity_name: string; // e.g., Customer Name
}

// 1. Fetch available accounts dynamically
async function fetchChartOfAccounts(tenantId: string) {
    const db = createClient();
    const { data, error } = await db
        .from('chart_of_accounts') // Assuming table name
        .select('code, name')
        .eq('tenant_id', tenantId)
        .eq('has_subledger', true) // Only fetch accounts that actually have subledgers (AP/AR)
        .order('name');
    
    if (error) {
        console.warn("Could not fetch accounts, defaulting to basics");
        return [
            { code: 'AR', name: 'Accounts Receivable' },
            { code: 'AP', name: 'Accounts Payable' }
        ];
    }
    return data as ChartOfAccount[];
}

// 2. Fetch specific entries
async function fetchSubledgerEntries(accountCode: string, tenantId: string) {
  const db = createClient();
  const { data, error } = await db
    .from('subledger_entries')
    .select('*')
    .eq('account_code', accountCode)
    .eq('tenant_id', tenantId)
    .order('date', { ascending: false })
    .limit(100);

  if (error) throw error;
  return data as SubledgerEntry[];
}

export default function SubledgerDrilldown({ tenant }: { tenant: TenantContext }) {
  const [account, setAccount] = useState<string>('');

  // Query for Accounts List
  const { data: accounts, isLoading: accountsLoading } = useQuery({
      queryKey: ['coa-subledger', tenant.tenantId],
      queryFn: () => fetchChartOfAccounts(tenant.tenantId)
  });

  // Query for Entries (Enabled only when account selected)
  const { data: entries, isLoading: entriesLoading } = useQuery({
    queryKey: ['subledger', account, tenant.tenantId],
    queryFn: () => fetchSubledgerEntries(account, tenant.tenantId),
    enabled: !!account
  });

  const currencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: tenant.currency,
  });

  return (
    <Card className="h-full border-t-4 border-t-indigo-600 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-indigo-600" /> Subledger Analysis
        </CardTitle>
        <CardDescription>Detailed transaction breakdown by specific control accounts.</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Account Selector */}
        <div className="mb-6 max-w-md">
            <label className="text-sm font-medium mb-1 block text-slate-700">Select Control Account</label>
            <Select value={account} onValueChange={setAccount} disabled={accountsLoading}>
                <SelectTrigger className="w-full">
                    <SelectValue placeholder={accountsLoading ? "Loading accounts..." : "Select Account (e.g., Accounts Receivable)..."} />
                </SelectTrigger>
                <SelectContent>
                    {accounts?.map((acc) => (
                        <SelectItem key={acc.code} value={acc.code}>
                            <span className="font-mono text-xs text-muted-foreground mr-2">[{acc.code}]</span> 
                            {acc.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>

        {/* Results Table */}
        <div className="rounded-md border min-h-[300px]">
            <Table>
            <TableHeader className="bg-slate-50">
                <TableRow>
                <TableHead className="w-[120px]">Date</TableHead>
                <TableHead>Entity / Description</TableHead>
                <TableHead className="text-right">Debit</TableHead>
                <TableHead className="text-right">Credit</TableHead>
                <TableHead className="text-right bg-slate-100">Running Bal</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {!account ? (
                    <TableRow>
                        <TableCell colSpan={5} className="h-40 text-center text-muted-foreground bg-slate-50/50">
                            <Search className="h-8 w-8 mx-auto mb-2 opacity-50"/>
                            Select an account above to view transactions.
                        </TableCell>
                    </TableRow>
                ) : entriesLoading ? (
                    <TableRow><TableCell colSpan={5} className="h-40 text-center"><Loader2 className="animate-spin inline h-6 w-6 text-indigo-600"/> Fetching records...</TableCell></TableRow>
                ) : entries?.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">No transactions found for this period.</TableCell></TableRow>
                ) : (
                    entries?.map((item) => (
                        <TableRow key={item.id} className="hover:bg-slate-50/50">
                            <TableCell className="text-xs font-mono">
                                {new Date(item.date).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                                <div className="font-medium text-sm text-slate-800">{item.related_entity_name}</div>
                                <div className="text-xs text-muted-foreground">{item.description}</div>
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm text-slate-600">
                                {item.debit > 0 ? currencyFormatter.format(item.debit) : '-'}
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm text-slate-600">
                                {item.credit > 0 ? currencyFormatter.format(item.credit) : '-'}
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm font-bold bg-slate-50">
                                {currencyFormatter.format(item.balance)}
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