'use client';

import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Download, Loader2, Scale, AlertCircle, FileLock, ShieldCheck } from "lucide-react";
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
  // Optional fields — display only if get_secure_audit_logs returns them; safe to ignore otherwise.
  audit_type?: string; // e.g. Annual, Interim, Special
  regulator_reference_number?: string;
  submitted_to_regulator?: boolean;
  submitted_at?: string;
  next_audit_due?: string;
  reviewed_by?: string; // internal compliance officer who reviewed the report
}

// NOTE: RPC name (get_secure_audit_logs) and its call signature (p_tenant_id) are
// untouched. This function only reads data — no fields were added to any params here.
async function fetchAudits(tenantId: string) {
  const db = createClient();
  const { data, error } = await db.rpc('get_secure_audit_logs', { p_tenant_id: tenantId });

  if (error) throw new Error("Failed to load audit logs");
  return data as AuditRecord[];
}

const statusBadgeClass = (status: AuditRecord['status']) => {
  if (status === 'COMPLETED') return 'border-green-200 bg-green-50 text-green-700';
  if (status === 'IN_PROGRESS') return 'border-blue-200 bg-blue-50 text-blue-700';
  return 'border-amber-200 bg-amber-50 text-amber-700'; // PENDING_REVIEW
};

export default function StatAuditPanel({ tenantId }: { tenantId: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['stat-audits', tenantId],
    queryFn: () => fetchAudits(tenantId),
  });

  if (isError) {
    return (
      <div className="flex items-center gap-2 rounded bg-red-50 p-4 text-red-600">
        <AlertCircle className="h-5 w-5" />
        Error loading audit records.
      </div>
    );
  }

  return (
    <Card className="h-full border-t-4 border-t-slate-800 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scale className="h-5 w-5 text-slate-800" />
          Statutory Audit Logs
        </CardTitle>
        <CardDescription>External audit reports and compliance certificates required by the Regulator.</CardDescription>
      </CardHeader>

      <CardContent>
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Audit Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Financial Year</TableHead>
                <TableHead>Auditor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Regulator Submission</TableHead>
                <TableHead>Reviewed By</TableHead>
                <TableHead>Next Audit Due</TableHead>
                <TableHead className="text-right">Document</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-32 text-center">
                    <Loader2 className="mx-auto animate-spin text-slate-400" />
                  </TableCell>
                </TableRow>
              ) : !data || data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <FileLock className="h-8 w-8 opacity-20" />
                      No audit records found for this tenant.
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                data.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="align-middle">
                      <div className="font-medium">{a.audit_title}</div>
                      <div className="text-xs text-muted-foreground">
                        Score: {a.compliance_score}%
                        {a.regulator_reference_number && <> · Ref: {a.regulator_reference_number}</>}
                      </div>
                    </TableCell>
                    <TableCell className="align-middle text-sm text-slate-600">
                      {a.audit_type || '—'}
                    </TableCell>
                    <TableCell className="align-middle font-mono text-sm">{a.financial_year}</TableCell>
                    <TableCell className="align-middle text-sm text-slate-600">{a.auditor_firm}</TableCell>
                    <TableCell className="align-middle">
                      <Badge variant="outline" className={statusBadgeClass(a.status)}>
                        {a.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="align-middle">
                      {a.submitted_to_regulator ? (
                        <div className="flex items-center gap-1 text-xs text-green-700">
                          <ShieldCheck className="h-3.5 w-3.5" />
                          Submitted{a.submitted_at ? ` ${format(new Date(a.submitted_at), 'MMM d, yyyy')}` : ''}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Not yet submitted</span>
                      )}
                    </TableCell>
                    <TableCell className="align-middle text-sm text-slate-600">
                      {a.reviewed_by || '—'}
                    </TableCell>
                    <TableCell className="align-middle whitespace-nowrap text-sm text-slate-600">
                      {a.next_audit_due ? format(new Date(a.next_audit_due), 'MMM d, yyyy') : '—'}
                    </TableCell>
                    <TableCell className="align-middle text-right">
                      {a.status === 'COMPLETED' && a.signed_url ? (
                        <Button variant="ghost" size="sm" asChild className="hover:bg-slate-100">
                          {/* signed_url, target, and rel are untouched from the original */}
                          <a href={a.signed_url} target="_blank" rel="noopener noreferrer">
                            <Download className="mr-2 h-4 w-4" /> Report
                          </a>
                        </Button>
                      ) : (
                        <span className="text-xs italic text-slate-400">Processing...</span>
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
  );
}