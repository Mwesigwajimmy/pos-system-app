'use client';

import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Download, Loader2, Scale, AlertCircle, FileLock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface AuditRecord { 
    id: string; 
    audit_title: string; 
    financial_year: string; 
    auditor_firm: string;
    compliance_score: number;
    status: 'COMPLETED' | 'IN_PROGRESS' | 'PENDING_REVIEW'; 
    file_path: string; // Internal storage path
    signed_url?: string; // Generated on fetch
    completed_at: string;
}

async function fetchAudits(tenantId: string) {
  const db = createClient();
  // We use an RPC to get the record AND a signed URL for the file in one go for security
  const { data, error } = await db.rpc('get_secure_audit_logs', { p_tenant_id: tenantId });
  
  if (error) throw new Error("Failed to load audit logs"); 
  return data as AuditRecord[];
}

export default function StatAuditPanel({ tenantId }: { tenantId: string }) {
  const { data, isLoading, isError } = useQuery({ 
      queryKey: ['stat-audits', tenantId], 
      queryFn: () => fetchAudits(tenantId) 
  });

  if (isError) return <div className="p-4 bg-red-50 text-red-600 rounded flex gap-2"><AlertCircle className="w-5 h-5"/> Error loading audit records.</div>;

  return (
    <Card className="h-full border-t-4 border-t-slate-800 shadow-sm">
      <CardHeader>
          <CardTitle className="flex items-center gap-2">
              <Scale className="w-5 h-5 text-slate-800"/> Statutory Audit Logs
          </CardTitle>
          <CardDescription>External audit reports and compliance certificates required by the Regulator.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
            <Table>
            <TableHeader className="bg-slate-50">
                <TableRow>
                <TableHead>Audit Title</TableHead>
                <TableHead>Financial Year</TableHead>
                <TableHead>Auditor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Document</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {isLoading ? (
                    <TableRow><TableCell colSpan={5} className="h-32 text-center"><Loader2 className="animate-spin mx-auto text-slate-400"/></TableCell></TableRow>
                ) : !data || data.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="h-32 text-center text-muted-foreground flex flex-col items-center justify-center">
                        <FileLock className="w-8 h-8 mb-2 opacity-20"/>
                        No audit records found for this tenant.
                    </TableCell></TableRow>
                ) : (
                    data.map((a) => (
                    <TableRow key={a.id}>
                        <TableCell>
                            <div className="font-medium">{a.audit_title}</div>
                            <div className="text-xs text-muted-foreground">Score: {a.compliance_score}%</div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{a.financial_year}</TableCell>
                        <TableCell className="text-sm text-slate-600">{a.auditor_firm}</TableCell>
                        <TableCell>
                            <Badge variant="outline" className={
                                a.status === 'COMPLETED' ? 'border-green-200 text-green-700 bg-green-50' : 
                                a.status === 'IN_PROGRESS' ? 'border-blue-200 text-blue-700 bg-blue-50' : ''
                            }>
                                {a.status.replace('_', ' ')}
                            </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                            {a.status === 'COMPLETED' && a.signed_url ? (
                                <Button variant="ghost" size="sm" asChild className="hover:bg-slate-100">
                                    <a href={a.signed_url} target="_blank" rel="noopener noreferrer">
                                        <Download className="w-4 h-4 mr-2"/> Report
                                    </a>
                                </Button>
                            ) : (
                                <span className="text-xs text-slate-400 italic">Processing...</span>
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