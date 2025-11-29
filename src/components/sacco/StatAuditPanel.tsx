'use client';

import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { FileText, Download, Loader2, Scale } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface AuditRow { 
    id: string; 
    name: string; 
    period: string; 
    status: 'COMPLETED' | 'IN_PROGRESS' | 'PENDING'; 
    url: string | null; 
}

async function fetchAudits(tenantId: string) {
  const db = createClient();
  const { data, error } = await db
    .from('stat_audits')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });
  
  if (error) throw error; 
  return data as AuditRow[];
}

export function StatAuditPanel({ tenantId }: { tenantId: string }) {
  const { data, isLoading } = useQuery({ 
      queryKey: ['stat-audits', tenantId], 
      queryFn: () => fetchAudits(tenantId) 
  });

  return (
    <Card className="h-full border-t-4 border-t-slate-800 shadow-sm">
      <CardHeader>
          <CardTitle className="flex items-center gap-2">
              <Scale className="w-5 h-5 text-slate-800"/> Statutory Audits
          </CardTitle>
          <CardDescription>View compliance reports and external audit logs.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
            <Table>
            <TableHeader className="bg-slate-50">
                <TableRow>
                <TableHead>Audit Name</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {isLoading ? (
                    <TableRow><TableCell colSpan={4} className="h-24 text-center"><Loader2 className="animate-spin mx-auto"/></TableCell></TableRow>
                ) : !data || data.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="h-24 text-center text-muted-foreground">No audit records found.</TableCell></TableRow>
                ) : (
                    data.map((a) => (
                    <TableRow key={a.id}>
                        <TableCell className="font-medium">{a.name}</TableCell>
                        <TableCell>{a.period}</TableCell>
                        <TableCell>
                            <Badge variant="outline" className={a.status === 'COMPLETED' ? 'border-green-200 text-green-700 bg-green-50' : ''}>
                                {a.status}
                            </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                            {a.url ? (
                                <Button variant="ghost" size="sm" asChild>
                                    <a href={a.url} target="_blank" rel="noopener noreferrer">
                                        <Download className="w-4 h-4 mr-2"/> Download
                                    </a>
                                </Button>
                            ) : (
                                <span className="text-xs text-muted-foreground">N/A</span>
                            )}
                        </TableCell>
                    </TableRow>
                    ))
                )}
            </TableBody>
            </Table>
        </div>
      </CardContent>
    </Card>
  )
}