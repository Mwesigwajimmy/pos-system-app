"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, FileDown, Search, X, FileText } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { createClient } from '@/lib/supabase/client';
import { useTenant } from '@/hooks/useTenant';
import { Badge } from '@/components/ui/badge';

interface TaxReturn {
  id: string;
  tax_type: string; // VAT, GST, CIT, PAYE, WHT, etc.
  entity: string;
  country: string;
  period_name: string;
  fiscal_year: number;
  currency: string;
  is_submitted: boolean;
  submitted_at: string | null;
  submitted_by: string | null;
  total_liability: number;
  file_url: string | null;
  tenant_id: string;
}

interface Props {
  tenantId?: string;
}

export default function TaxReturnsTable({ tenantId: propTenantId }: Props) {
  // 1. Context & Hooks
  const { data: tenant } = useTenant();
  const tenantId = propTenantId || tenant?.id;
  const supabase = createClient();

  // 2. State
  const [returns, setReturns] = useState<TaxReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  // 3. Data Fetching
  useEffect(() => {
    if (!tenantId) return;

    const fetchTaxReturns = async () => {
      try {
        const { data, error } = await supabase
          .from('accounting_tax_returns')
          .select('*')
          .eq('tenant_id', tenantId)
          .order('fiscal_year', { ascending: false })
          .order('period_name', { ascending: false });

        if (error) throw error;
        if (data) setReturns(data as unknown as TaxReturn[]);
      } catch (error) {
        console.error("Error fetching tax returns:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTaxReturns();
  }, [tenantId, supabase]);

  // 4. Filtering Logic
  const filtered = useMemo(
    () =>
      returns.filter(
        r =>
          (r.tax_type || '').toLowerCase().includes(filter.toLowerCase()) ||
          (r.entity || '').toLowerCase().includes(filter.toLowerCase()) ||
          (r.country || '').toLowerCase().includes(filter.toLowerCase()) ||
          (r.period_name || '').toLowerCase().includes(filter.toLowerCase())
      ),
    [returns, filter]
  );

  // 5. Loading State
  if (loading && !returns.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tax Returns</CardTitle>
          <CardDescription>Loading tax compliance data...</CardDescription>
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
        <CardTitle>Tax Returns</CardTitle>
        <CardDescription>
          Automated generation, submission, and export of all tax returns—multi-country, multi-entity.
        </CardDescription>
        <div className="relative mt-3 max-w-xs">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Filter by type/entity..." 
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
                <TableHead>Type</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Year</TableHead>
                <TableHead className="text-right">Total Liability</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted By</TableHead>
                <TableHead>Submitted Date</TableHead>
                <TableHead className="text-right">Export</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                    No tax returns found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-blue-500" />
                        {r.tax_type}
                      </div>
                    </TableCell>
                    <TableCell>{r.entity}</TableCell>
                    <TableCell>{r.country}</TableCell>
                    <TableCell>{r.period_name}</TableCell>
                    <TableCell>{r.fiscal_year}</TableCell>
                    <TableCell className="text-right font-mono">
                      {r.currency} {r.total_liability.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      {r.is_submitted ? (
                        <Badge variant="default" className="bg-green-600 hover:bg-green-700">Submitted</Badge>
                      ) : (
                        <Badge variant="outline" className="text-yellow-600 border-yellow-200 bg-yellow-50">Draft</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {r.submitted_by || "-"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {r.submitted_at ? format(new Date(r.submitted_at), 'MMM d, yyyy') : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {r.file_url ? (
                        <Button size="sm" asChild variant="outline" className="h-8">
                          <a href={r.file_url} target="_blank" rel="noopener noreferrer" download>
                            <FileDown className="h-3 w-3 mr-1" /> PDF
                          </a>
                        </Button>
                      ) : (
                        <Button size="sm" variant="ghost" disabled className="h-8 text-muted-foreground">
                          Not Ready
                        </Button>
                      )}
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