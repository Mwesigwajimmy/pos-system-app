"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Search, X, RefreshCw, PauseCircle, PlayCircle } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { createClient } from '@/lib/supabase/client';
import { useTenant } from '@/hooks/useTenant';
import { Badge } from '@/components/ui/badge';

interface RecurringEntry {
  id: string;
  description: string;
  amount: number;
  interval_type: string; // e.g., 'Monthly', 'Weekly'
  next_post_date: string;
  last_posted_date: string | null;
  account_name: string;
  tenant_id: string;
  entity: string;
  currency: string;
  country: string;
  is_active: boolean;
  schedule_type: 'depreciation' | 'accrual' | 'subscription' | 'other';
}

interface Props {
  tenantId?: string;
}

export default function RecurringEntriesTable({ tenantId: propTenantId }: Props) {
  // 1. Context & Hooks
  const { data: tenant } = useTenant();
  const tenantId = propTenantId || tenant?.id;
  const supabase = createClient();

  // 2. State
  const [entries, setEntries] = useState<RecurringEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  // 3. Data Fetching
  useEffect(() => {
    if (!tenantId) return;

    const fetchRecurringEntries = async () => {
      try {
        const { data, error } = await supabase
          .from('accounting_recurring_entries')
          .select('*')
          .eq('tenant_id', tenantId)
          .order('next_post_date', { ascending: true });

        if (error) throw error;
        if (data) setEntries(data as unknown as RecurringEntry[]);
      } catch (error) {
        console.error("Error fetching recurring entries:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecurringEntries();
  }, [tenantId, supabase]);

  // 4. Filtering
  const filtered = useMemo(
    () =>
      entries.filter(
        r =>
          (r.description || '').toLowerCase().includes(filter.toLowerCase()) ||
          (r.account_name || '').toLowerCase().includes(filter.toLowerCase()) ||
          (r.entity || '').toLowerCase().includes(filter.toLowerCase())
      ),
    [entries, filter]
  );

  // 5. Action Handlers
  const toggleEntryStatus = async (entry: RecurringEntry) => {
    setProcessingId(entry.id);
    try {
      const newStatus = !entry.is_active;
      
      const { error } = await supabase
        .from('accounting_recurring_entries')
        .update({ is_active: newStatus })
        .eq('id', entry.id)
        .eq('tenant_id', tenantId);

      if (error) throw error;

      // Optimistic Update
      setEntries(prev => 
        prev.map(e => e.id === entry.id ? { ...e, is_active: newStatus } : e)
      );

    } catch (error) {
      console.error("Failed to update status:", error);
      alert("Failed to update entry status.");
    } finally {
      setProcessingId(null);
    }
  };

  if (loading && !entries.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recurring & Scheduled Entries</CardTitle>
          <CardDescription>Loading schedules...</CardDescription>
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
        <CardTitle>Recurring & Scheduled Entries</CardTitle>
        <CardDescription>
          Handle depreciation, rent, and other periodic multi-company, multi-country postings.
        </CardDescription>
        <div className="relative mt-3 max-w-xs">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Filter schedules..." 
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
                <TableHead>Description</TableHead>
                <TableHead>Schedule</TableHead>
                <TableHead>Next Post</TableHead>
                <TableHead>Last Posted</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Account</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    No recurring entries found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.description}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal">
                        {r.interval_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {r.next_post_date ? format(new Date(r.next_post_date), 'yyyy-MM-dd') : '-'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {r.last_posted_date ? format(new Date(r.last_posted_date), 'yyyy-MM-dd') : 'Never'}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{r.entity}</span>
                        <span className="text-xs text-muted-foreground">{r.country}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{r.account_name}</TableCell>
                    <TableCell className="text-right font-mono">
                      {r.currency} {r.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      {r.is_active ? (
                        <Badge variant="default" className="bg-green-600 hover:bg-green-700">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Paused</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        size="sm" 
                        variant={r.is_active ? "secondary" : "default"}
                        onClick={() => toggleEntryStatus(r)}
                        disabled={processingId === r.id}
                      >
                        {processingId === r.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : r.is_active ? (
                          <>
                            <PauseCircle className="h-4 w-4 mr-1" /> Pause
                          </>
                        ) : (
                          <>
                            <PlayCircle className="h-4 w-4 mr-1" /> Activate
                          </>
                        )}
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