"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Lock, Unlock, Search, X } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { createClient } from '@/lib/supabase/client';
import { useTenant } from '@/hooks/useTenant';
import { Badge } from "@/components/ui/badge";

// Updated Interface: changed optional (?) to explicit | null to match Supabase and State logic
interface FiscalPeriod {
  id: string;
  entity: string;
  country: string;
  period_name: string;
  fiscal_year: number;
  is_locked: boolean;
  locked_at: string | null;
  locked_by: string | null;
  tenant_id: string;
}

interface Props {
  tenantId?: string;
}

export default function LockDatesManager({ tenantId: propTenantId }: Props) {
  // 1. Context & Hooks
  const { data: tenant } = useTenant();
  const tenantId = propTenantId || tenant?.id;
  const supabase = createClient();

  // 2. State
  const [periods, setPeriods] = useState<FiscalPeriod[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // 3. Data Fetching
  useEffect(() => {
    if (!tenantId) return;

    const fetchPeriods = async () => {
      try {
        const { data, error } = await supabase
          .from('accounting_fiscal_periods')
          .select('*')
          .eq('tenant_id', tenantId)
          .order('fiscal_year', { ascending: false })
          .order('period_name', { ascending: false });

        if (error) throw error;
        // Cast data to ensure it matches our interface regarding null vs undefined
        if (data) setPeriods(data as unknown as FiscalPeriod[]);
      } catch (error) {
        console.error("Error fetching fiscal periods:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPeriods();
  }, [tenantId, supabase]);

  // 4. Filtering
  const filtered = useMemo(
    () =>
      periods.filter(
        p =>
          (p.entity || '').toLowerCase().includes(filter.toLowerCase()) ||
          (p.country || '').toLowerCase().includes(filter.toLowerCase()) ||
          (p.period_name || '').toLowerCase().includes(filter.toLowerCase())
      ),
    [periods, filter]
  );

  // 5. Action Handlers
  const handleToggleLock = async (period: FiscalPeriod) => {
    setProcessingId(period.id);
    try {
      // Get current user for audit trail
      const { data: { user } } = await supabase.auth.getUser();
      const userEmail = user?.email || 'System';

      const newLockState = !period.is_locked;
      
      // Explicitly using null for DB compatibility
      const updates = {
        is_locked: newLockState,
        locked_at: newLockState ? new Date().toISOString() : null,
        locked_by: newLockState ? userEmail : null
      };

      const { error } = await supabase
        .from('accounting_fiscal_periods')
        .update(updates)
        .eq('id', period.id)
        .eq('tenant_id', tenantId);

      if (error) throw error;

      // Optimistic Update
      setPeriods(prev => 
        prev.map(p => p.id === period.id ? { ...p, ...updates } : p)
      );

    } catch (error) {
      console.error("Failed to update lock status:", error);
      alert("Failed to update lock status. Please try again.");
    } finally {
      setProcessingId(null);
    }
  };

  if (loading && !periods.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Fiscal Period Lock Dates</CardTitle>
          <CardDescription>Loading period configuration...</CardDescription>
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
        <CardTitle>Fiscal Period Lock Dates</CardTitle>
        <CardDescription>
          Securely close or re-open fiscal periods by entity, tenant, and country—full audit for global compliance.
        </CardDescription>
        <div className="relative mt-3 max-w-xs">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Filter periods..." 
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
                <TableHead>Entity</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Year</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Locked By</TableHead>
                <TableHead>Lock Date</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No fiscal periods found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.entity}</TableCell>
                    <TableCell>{p.country}</TableCell>
                    <TableCell>{p.period_name}</TableCell>
                    <TableCell>{p.fiscal_year}</TableCell>
                    <TableCell>
                      {p.is_locked ? (
                        <Badge variant="destructive" className="flex w-fit items-center gap-1">
                          <Lock className="h-3 w-3" /> Locked
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="flex w-fit items-center gap-1 text-green-600 border-green-200 bg-green-50">
                          <Unlock className="h-3 w-3" /> Open
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {p.locked_by || "-"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {p.locked_at ? format(new Date(p.locked_at), 'MMM d, yyyy') : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant={p.is_locked ? "outline" : "default"}
                        disabled={processingId === p.id}
                        onClick={() => handleToggleLock(p)}
                        className={p.is_locked ? "" : "bg-red-600 hover:bg-red-700"}
                      >
                        {processingId === p.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : p.is_locked ? (
                          <>
                            <Unlock className="h-4 w-4 mr-2" />
                            Unlock
                          </>
                        ) : (
                          <>
                            <Lock className="h-4 w-4 mr-2" />
                            Lock
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