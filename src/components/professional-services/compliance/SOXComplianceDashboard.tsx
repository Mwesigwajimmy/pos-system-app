'use client';

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableHead, TableRow, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Lock, FileCheck, AlertOctagon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";

interface TenantContext { tenantId: string }

interface ControlItem {
  id: string;
  control_id: string; // e.g., AC-1
  control_name: string;
  description: string;
  status: 'PASS' | 'FAIL' | 'NEEDS_REVIEW';
  last_audit_date: string;
  owner: string;
  evidence_count: number;
}

async function fetchSOXItems(tenantId: string) {
  const db = createClient();
  const { data, error } = await db
    .from("sox_compliance_controls")
    .select("*")
    .eq("tenant_id", tenantId)
    .order('control_id', { ascending: true });
  
  if (error) throw error;
  return data as ControlItem[];
}

export default function SOXComplianceDashboard({ tenant }: { tenant: TenantContext }) {
  const { data, isLoading } = useQuery({ 
    queryKey: ["sox-dashboard", tenant.tenantId], 
    queryFn: () => fetchSOXItems(tenant.tenantId) 
  });

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="w-5 h-5 text-purple-600"/> SOX & Internal Controls
        </CardTitle>
        <CardDescription>Internal control framework status and audit readiness.</CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="w-[80px]">ID</TableHead>
                <TableHead>Control Objective</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead className="text-center">Evidence</TableHead>
                <TableHead>Last Audit</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="h-24 text-center"><Loader2 className="mx-auto animate-spin text-slate-400"/></TableCell></TableRow>
              ) : data?.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">No controls defined.</TableCell></TableRow>
              ) : (
                data?.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono font-bold text-xs">{item.control_id}</TableCell>
                    <TableCell>
                      <div className="font-medium text-sm">{item.control_name}</div>
                      <div className="text-xs text-slate-500 truncate max-w-[300px]">{item.description}</div>
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">{item.owner}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1 text-xs text-slate-500">
                        <FileCheck className="w-3 h-3"/> {item.evidence_count} docs
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {format(new Date(item.last_audit_date), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.status === 'PASS' ? (
                        <Badge className="bg-green-600 hover:bg-green-700">PASS</Badge>
                      ) : item.status === 'FAIL' ? (
                        <Badge variant="destructive">FAIL</Badge>
                      ) : (
                        <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">REVIEW</Badge>
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