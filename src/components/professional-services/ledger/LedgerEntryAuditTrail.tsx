'use client';

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Loader2, ShieldCheck, History, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

interface TenantContext { tenantId: string }

interface AuditLog {
  id: string;
  changed_at: string;
  actor: string; // Email or Name
  ledger_entry_id: string;
  change_type: 'INSERT' | 'UPDATE' | 'DELETE' | 'VOID';
  field_name: string | null;
  prev_val: string | null;
  new_val: string | null;
  ip_address?: string;
}

async function fetchAudit(tenantId: string) {
  const db = createClient();
  const { data, error } = await db
    .from("ledger_audit")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("changed_at", { ascending: false })
    .limit(50); // Hard limit for audit trail view
  
  if (error) throw error;
  return data as AuditLog[];
}

export default function LedgerEntryAuditTrail({ tenant }: { tenant: TenantContext }) {
  const { data, isLoading } = useQuery({ 
    queryKey: ["ledger-audit", tenant.tenantId], 
    queryFn: () => fetchAudit(tenant.tenantId) 
  });

  const getActionBadge = (type: string) => {
    switch (type) {
        case 'INSERT': return <Badge className="bg-green-600">Created</Badge>;
        case 'UPDATE': return <Badge className="bg-blue-600">Updated</Badge>;
        case 'DELETE': return <Badge variant="destructive">Deleted</Badge>;
        case 'VOID': return <Badge variant="destructive" className="bg-red-800">Voided</Badge>;
        default: return <Badge variant="outline">{type}</Badge>;
    }
  };

  return (
    <Card className="h-full border-t-4 border-t-purple-600 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-purple-600" />
            Audit Trail
        </CardTitle>
        <CardDescription>Recent changes to financial records for compliance.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border h-[400px] overflow-auto relative">
            <Table>
            <TableHeader className="sticky top-0 bg-white shadow-sm z-10">
                <TableRow>
                <TableHead className="w-[150px]">Time</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entry Ref</TableHead>
                <TableHead>Details</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {isLoading ? (
                <TableRow><TableCell colSpan={5} className="h-32 text-center"><Loader2 className="animate-spin inline mr-2"/> Loading audit logs...</TableCell></TableRow>
                ) : !data || data.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground"><History className="w-4 h-4 inline mr-2"/> No audit history found.</TableCell></TableRow>
                ) : (
                data.map((row) => (
                    <TableRow key={row.id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(row.changed_at), { addSuffix: true })}
                        <div className="text-[10px] text-slate-400 opacity-0 hover:opacity-100 transition-opacity">
                            {new Date(row.changed_at).toLocaleString()}
                        </div>
                    </TableCell>
                    <TableCell className="text-sm font-medium">{row.actor}</TableCell>
                    <TableCell>{getActionBadge(row.change_type)}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{row.ledger_entry_id.slice(0,8)}...</TableCell>
                    <TableCell className="text-sm">
                        {row.change_type === 'UPDATE' && row.field_name ? (
                            <div className="flex items-center gap-2">
                                <span className="font-semibold text-xs uppercase bg-slate-100 px-1 rounded">{row.field_name}</span>
                                <span className="line-through text-red-400 text-xs">{row.prev_val}</span>
                                <ArrowRight className="w-3 h-3 text-slate-400" />
                                <span className="text-green-600 font-medium">{row.new_val}</span>
                            </div>
                        ) : (
                            <span className="text-slate-500 italic text-xs">Full record {row.change_type.toLowerCase()}</span>
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