"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Search, X, Eye, AlertCircle } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { createClient } from '@/lib/supabase/client';
import { useTenant } from '@/hooks/useTenant';
import { Badge } from '@/components/ui/badge';

interface JournalEntryLine {
  id: string;
  date: string;
  description: string;
  debit: number;
  credit: number;
  account_name: string; // Mapped from DB
  account_code: string;
  entity: string;
  currency: string;
  fx_rate: number;
  country: string;
  created_by_email: string;
  approved: boolean;
  approved_by?: string;
  approved_at?: string;
}

interface Props {
  tenantId?: string;
}

export default function GeneralJournalTable({ tenantId: propTenantId }: Props) {
  // 1. Get Tenant Context
  const { data: tenant } = useTenant();
  const tenantId = propTenantId || tenant?.id;

  // 2. State Management
  const [entries, setEntries] = useState<JournalEntryLine[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  // 3. Data Fetching
  useEffect(() => {
    if (!tenantId) return;

    const fetchJournalEntries = async () => {
      try {
        const { data, error } = await supabase
          .from('accounting_journal_entries')
          .select('*')
          .eq('tenant_id', tenantId)
          .order('date', { ascending: false })
          .limit(100); // Pagination recommended for production

        if (error) throw error;
        
        if (data) {
          setEntries(data as unknown as JournalEntryLine[]);
        }
      } catch (error) {
        console.error("Failed to fetch journal entries:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchJournalEntries();
  }, [tenantId, supabase]);

  // 4. Filtering Logic
  const filtered = useMemo(() =>
    entries.filter(e =>
      (e.description || '').toLowerCase().includes(filter.toLowerCase()) ||
      (e.account_name || '').toLowerCase().includes(filter.toLowerCase()) ||
      (e.account_code || '').toLowerCase().includes(filter.toLowerCase()) ||
      (e.entity || '').toLowerCase().includes(filter.toLowerCase()) ||
      (e.country || '').toLowerCase().includes(filter.toLowerCase())
    ),
    [entries, filter]
  );

  // 5. Loading State
  if (loading && !entries.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>General Journal Entries</CardTitle>
          <CardDescription>Loading ledger data...</CardDescription>
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
        <CardTitle>General Journal Entries</CardTitle>
        <CardDescription>
          Full ledger, by entity/country/currency. Multi-tenant, full audit, compliant in every market.
        </CardDescription>
        <div className="relative mt-3 max-w-xs">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Filter transactions..." 
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
                <TableHead>Date</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Debit</TableHead>
                <TableHead>Credit</TableHead>
                <TableHead>Currency</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>User</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                    No journal entries found matching your criteria.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(e => (
                  <TableRow key={e.id}>
                    <TableCell className="whitespace-nowrap font-medium">
                      {format(new Date(e.date), 'yyyy-MM-dd')}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{e.account_name}</span>
                        <span className="text-xs text-muted-foreground">{e.account_code}</span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate" title={e.description}>
                      {e.description}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{e.entity}</span>
                        <span className="text-xs text-muted-foreground">{e.country}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {e.debit > 0 ? e.debit.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {e.credit > 0 ? e.credit.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">
                        {e.currency} {e.fx_rate !== 1 && `(${e.fx_rate})`}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {e.approved ? (
                        <Badge variant="default" className="bg-green-600 hover:bg-green-700">Approved</Badge>
                      ) : (
                        <Badge variant="secondary">Draft</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[100px] truncate" title={e.created_by_email}>
                      {e.created_by_email}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                        <Eye className="h-4 w-4" />
                        <span className="sr-only">View</span>
                      </Button>
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