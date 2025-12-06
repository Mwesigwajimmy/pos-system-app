'use client';

import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { createClient } from "@/lib/supabase/client";
import { Loader2, FileBarChart, Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
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

export default function SaccoReportsCenter({ tenantId }: { tenantId: string }) {
  const { data, isLoading } = useQuery({ 
      queryKey: ['sacco-reports', tenantId], 
      queryFn: () => fetchReports(tenantId) 
  });

  return (
    <Card className="h-full border-t-4 border-t-purple-600 shadow-sm">
      <CardHeader>
          <CardTitle className="flex items-center gap-2">
              <FileBarChart className="w-5 h-5 text-purple-600"/> Reports Center
          </CardTitle>
          <CardDescription>Download standardized financial statements, member lists, and loan aging reports.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
            <Table>
            <TableHeader className="bg-slate-50">
                <TableRow>
                <TableHead>Report Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Reporting Period</TableHead>
                <TableHead>Generated Info</TableHead>
                <TableHead className="text-right">Action</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {isLoading ? (
                    <TableRow><TableCell colSpan={5} className="h-24 text-center"><Loader2 className="animate-spin mx-auto text-purple-300"/></TableCell></TableRow>
                ) : !data || data.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">No generated reports found.</TableCell></TableRow>
                ) : (
                    data.map((r) => (
                    <TableRow key={r.id} className="hover:bg-slate-50">
                        <TableCell>
                            <div className="font-medium flex items-center gap-2">
                                <FileText className="w-4 h-4 text-slate-400"/> {r.report_name}
                            </div>
                        </TableCell>
                        <TableCell>
                            <span className="inline-flex items-center rounded-md bg-slate-50 px-2 py-1 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-500/10">
                                {r.category}
                            </span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground font-mono">
                            {format(new Date(r.period_start), 'MMM yyyy')} - {format(new Date(r.period_end), 'MMM yyyy')}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                            <div>{format(new Date(r.generated_at), 'PP p')}</div>
                            <div>By: {r.generated_by}</div>
                        </TableCell>
                        <TableCell className="text-right">
                            <Button variant="outline" size="sm" asChild className="text-purple-700 hover:text-purple-800 hover:bg-purple-50 border-purple-200">
                                <a href={r.download_url} target="_blank" rel="noopener noreferrer">
                                    <Download className="w-4 h-4 mr-2"/> PDF
                                </a>
                            </Button>
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