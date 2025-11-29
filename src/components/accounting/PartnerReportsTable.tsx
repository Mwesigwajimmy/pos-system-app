"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Search, X, FileDown, FileText } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { createClient } from '@/lib/supabase/client';
import { useTenant } from '@/hooks/useTenant';
import { format } from "date-fns";

interface PartnerReport {
  id: string;
  partner_name: string;
  report_type: string;
  currency: string;
  country: string;
  entity: string;
  period_name: string;
  fiscal_year: number;
  file_url: string | null;
  tenant_id: string;
  created_at: string;
}

interface Props {
  tenantId?: string;
}

export default function PartnerReportsTable({ tenantId: propTenantId }: Props) {
  // 1. Context & Hooks
  const { data: tenant } = useTenant();
  const tenantId = propTenantId || tenant?.id;
  const supabase = createClient();

  // 2. State
  const [reports, setReports] = useState<PartnerReport[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  // 3. Data Fetching
  useEffect(() => {
    if (!tenantId) return;

    const fetchPartnerReports = async () => {
      try {
        const { data, error } = await supabase
          .from('accounting_partner_reports')
          .select('*')
          .eq('tenant_id', tenantId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        if (data) setReports(data as unknown as PartnerReport[]);
      } catch (error) {
        console.error("Error fetching partner reports:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPartnerReports();
  }, [tenantId, supabase]);

  // 4. Filtering
  const filtered = useMemo(
    () =>
      reports.filter(
        p =>
          (p.partner_name || '').toLowerCase().includes(filter.toLowerCase()) ||
          (p.entity || '').toLowerCase().includes(filter.toLowerCase()) ||
          (p.country || '').toLowerCase().includes(filter.toLowerCase()) ||
          (p.report_type || '').toLowerCase().includes(filter.toLowerCase())
      ),
    [reports, filter]
  );

  // 5. Loading State
  if (loading && !reports.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Partner/External Reports</CardTitle>
          <CardDescription>Loading reports...</CardDescription>
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
        <CardTitle>Partner/External Reports</CardTitle>
        <CardDescription>
          Download packages for auditors/tax bureaus. Global, multi-tenant, fully-compliant partner reporting center.
        </CardDescription>
        <div className="relative mt-3 max-w-xs">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Filter by partner/entity..." 
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
                <TableHead>Partner</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Currency</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Year</TableHead>
                <TableHead>Generated Date</TableHead>
                <TableHead className="text-right">Export</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    No partner reports found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.partner_name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        {r.report_type}
                      </div>
                    </TableCell>
                    <TableCell>{r.entity}</TableCell>
                    <TableCell>{r.country}</TableCell>
                    <TableCell>
                      <span className="font-mono text-xs border px-1 rounded bg-muted">{r.currency}</span>
                    </TableCell>
                    <TableCell>{r.period_name}</TableCell>
                    <TableCell>{r.fiscal_year}</TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(r.created_at), 'MMM d, yyyy')}
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
                          Not Available
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