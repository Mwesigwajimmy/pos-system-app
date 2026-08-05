'use client';

import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { createClient } from "@/lib/supabase/client";
import { Loader2, FileBarChart, Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface Report {
  id: string;
  report_name: string;
  category: 'FINANCIAL' | 'OPERATIONAL' | 'COMPLIANCE';
  period_start: string;
  period_end: string;
  generated_at: string;
  generated_by: string;
  download_url: string;
  // Optional fields — display only if sacco_reports returns them; safe to ignore otherwise.
  status?: 'READY' | 'PROCESSING' | 'FAILED';
  file_format?: string; // e.g. PDF, XLSX, CSV
  file_size_kb?: number;
  reference_number?: string;
}

async function fetchReports(tenantId: string) {
  const db = createClient();
  const { data, error } = await db
    .from('sacco_reports')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('generated_at', { ascending: false });

  if (error) throw error;
  return data as Report[];
}

const categoryBadgeClass = (category: Report['category']) => {
  if (category === 'FINANCIAL') return 'bg-emerald-50 text-emerald-700 ring-emerald-600/10';
  if (category === 'COMPLIANCE') return 'bg-amber-50 text-amber-700 ring-amber-600/10';
  return 'bg-slate-50 text-slate-600 ring-slate-500/10'; // OPERATIONAL / default
};

const statusBadgeVariant = (status?: Report['status']): 'default' | 'outline' | 'destructive' | 'secondary' => {
  if (status === 'READY' || !status) return 'default';
  if (status === 'FAILED') return 'destructive';
  return 'secondary'; // PROCESSING
};

const formatFileSize = (kb?: number) => {
  if (!kb) return null;
  if (kb < 1024) return `${kb} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
};

export default function SaccoReportsCenter({ tenantId }: { tenantId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['sacco-reports', tenantId],
    queryFn: () => fetchReports(tenantId),
  });

  return (
    <Card className="h-full border-t-4 border-t-purple-600 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileBarChart className="h-5 w-5 text-purple-600" />
          Reports Center
        </CardTitle>
        <CardDescription>Download standardized financial statements, member lists, and loan aging reports.</CardDescription>
      </CardHeader>

      <CardContent>
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Report Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Reporting Period</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>File</TableHead>
                <TableHead>Generated Info</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    <Loader2 className="mx-auto animate-spin text-purple-300" />
                  </TableCell>
                </TableRow>
              ) : !data || data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    No generated reports found.
                  </TableCell>
                </TableRow>
              ) : (
                data.map((r) => {
                  const isReady = !r.status || r.status === 'READY';
                  const size = formatFileSize(r.file_size_kb);
                  return (
                    <TableRow key={r.id} className="hover:bg-slate-50">
                      <TableCell className="align-middle">
                        <div className="flex items-center gap-2 font-medium">
                          <FileText className="h-4 w-4 text-slate-400" />
                          <div>
                            <div>{r.report_name}</div>
                            {r.reference_number && (
                              <div className="font-mono text-[10px] text-muted-foreground">
                                Ref: {r.reference_number}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="align-middle">
                        <span
                          className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${categoryBadgeClass(r.category)}`}
                        >
                          {r.category}
                        </span>
                      </TableCell>
                      <TableCell className="align-middle whitespace-nowrap font-mono text-xs text-muted-foreground">
                        {format(new Date(r.period_start), 'MMM yyyy')} - {format(new Date(r.period_end), 'MMM yyyy')}
                      </TableCell>
                      <TableCell className="align-middle">
                        <Badge variant={statusBadgeVariant(r.status)} className="text-[10px]">
                          {r.status || 'READY'}
                        </Badge>
                      </TableCell>
                      <TableCell className="align-middle whitespace-nowrap text-xs text-muted-foreground">
                        <div>{r.file_format || 'PDF'}</div>
                        {size && <div>{size}</div>}
                      </TableCell>
                      <TableCell className="align-middle whitespace-nowrap text-xs text-muted-foreground">
                        <div>{format(new Date(r.generated_at), 'PP p')}</div>
                        <div>By: {r.generated_by}</div>
                      </TableCell>
                      <TableCell className="align-middle text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                          disabled={!isReady}
                          className="border-purple-200 text-purple-700 hover:bg-purple-50 hover:text-purple-800"
                        >
                          {/* download_url, target, and rel are untouched from the original */}
                          <a href={r.download_url} target="_blank" rel="noopener noreferrer">
                            <Download className="mr-2 h-4 w-4" />
                            {r.file_format || 'PDF'}
                          </a>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}