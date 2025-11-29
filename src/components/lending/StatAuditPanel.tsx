'use client';

import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { FileText, Download, CheckCircle, Clock } from "lucide-react";

interface StatRow { 
    id: string; 
    name: string; 
    period: string; 
    status: 'GENERATED' | 'PENDING' | 'SUBMITTED'; 
    url: string | null; 
    generated_at: string;
}

async function fetchStatAudits(tenantId: string) {
  const db = createClient();
  const { data, error } = await db.from('lending_stat_audits').select('*').eq('tenant_id', tenantId).order('generated_at', { ascending: false });
  if (error) throw error; 
  return data as StatRow[];
}

export function StatAuditPanel({ tenantId }: { tenantId: string }) {
  const { data, isLoading } = useQuery({ 
      queryKey: ['lending-audits', tenantId], 
      queryFn: () => fetchStatAudits(tenantId) 
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Statutory Audit Reports</CardTitle>
        <CardDescription>Regulatory compliance reports generated for Central Bank / Financial Authority.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Report Name</TableHead>
              <TableHead>Reporting Period</TableHead>
              <TableHead>Generated Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={5} className="text-center">Loading reports...</TableCell></TableRow> :
              data?.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-500" /> {a.name}
                  </TableCell>
                  <TableCell>{a.period}</TableCell>
                  <TableCell>{new Date(a.generated_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    {a.status === 'SUBMITTED' ? (
                        <div className="flex items-center text-green-600 text-xs font-medium"><CheckCircle className="w-3 h-3 mr-1"/> Submitted</div>
                    ) : (
                        <div className="flex items-center text-amber-600 text-xs font-medium"><Clock className="w-3 h-3 mr-1"/> {a.status}</div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {a.url ? (
                        <Button size="sm" variant="outline" asChild>
                            <a href={a.url} target="_blank" rel="noopener noreferrer">
                                <Download className="mr-2 h-4 w-4" /> Download
                            </a>
                        </Button>
                    ) : <span className="text-xs text-muted-foreground">Processing</span>}
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}