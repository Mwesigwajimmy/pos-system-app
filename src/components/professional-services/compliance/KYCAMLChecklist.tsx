'use client';

import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableHead, TableRow, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { Loader2, ShieldCheck, CheckCircle2, AlertTriangle, FileText } from "lucide-react";
import { format } from "date-fns";

interface TenantContext { tenantId: string; }

interface KYCCheck {
  id: number;
  client_name: string; // Joined field
  type: 'INDIVIDUAL' | 'BUSINESS';
  status: 'PENDING' | 'PASSED' | 'FAILED' | 'FLAGGED';
  risk_score: 'LOW' | 'MEDIUM' | 'HIGH';
  last_checked: string;
  notes: string;
}

async function fetchKYCAML(tenantId: string) {
  const db = createClient();
  const { data, error } = await db
    .from("kyc_aml_checks")
    .select(`
      id, type, status, risk_score, last_checked, notes,
      clients ( name )
    `)
    .eq("tenant_id", tenantId)
    .order('last_checked', { ascending: false });
  
  if (error) throw error;
  
  // Transform for UI
  return data.map((d: any) => ({
    ...d,
    client_name: d.clients?.name || 'Unknown'
  })) as KYCCheck[];
}

async function updateCheck({ id, status, tenantId }: { id: number, status: string, tenantId: string }) {
  const db = createClient();
  const { error } = await db
    .from("kyc_aml_checks")
    .update({ 
      status, 
      last_checked: new Date().toISOString() 
    })
    .eq("id", id)
    .eq("tenant_id", tenantId);
  
  if (error) throw error;
}

export default function KYCAMLChecklist({ tenant }: { tenant: TenantContext }) {
  const queryClient = useQueryClient();
  
  const { data, isLoading } = useQuery({ 
    queryKey: ["kyc-aml", tenant.tenantId], 
    queryFn: () => fetchKYCAML(tenant.tenantId) 
  });

  const mutation = useMutation({ 
    mutationFn: updateCheck,
    onSuccess: () => {
      toast.success("Compliance status updated");
      queryClient.invalidateQueries({ queryKey: ["kyc-aml", tenant.tenantId] });
    },
    onError: (e: Error) => toast.error(e.message || "Update failed") 
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PASSED': return <Badge className="bg-green-600">Passed</Badge>;
      case 'FAILED': return <Badge variant="destructive">Failed</Badge>;
      case 'FLAGGED': return <Badge className="bg-amber-500">Flagged</Badge>;
      default: return <Badge variant="secondary">Pending</Badge>;
    }
  };

  return (
    <Card className="h-full border-t-4 border-t-indigo-600">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-indigo-600"/> KYC / AML Monitor
        </CardTitle>
        <CardDescription>Customer Due Diligence and Anti-Money Laundering checks.</CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Client Entity</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Risk Profile</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Reviewed</TableHead>
                <TableHead className="text-right">Decision</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="h-24 text-center"><Loader2 className="mx-auto animate-spin text-slate-400"/></TableCell></TableRow>
              ) : data?.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">No checks pending.</TableCell></TableRow>
              ) : (
                data?.map((k) => (
                  <TableRow key={k.id}>
                    <TableCell className="font-medium">{k.client_name}</TableCell>
                    <TableCell className="text-xs uppercase text-slate-500">{k.type}</TableCell>
                    <TableCell>
                      <span className={`text-xs font-bold px-2 py-1 rounded ${
                        k.risk_score === 'HIGH' ? 'text-red-700 bg-red-100' : 
                        k.risk_score === 'MEDIUM' ? 'text-amber-700 bg-amber-100' : 
                        'text-green-700 bg-green-100'
                      }`}>
                        {k.risk_score}
                      </span>
                    </TableCell>
                    <TableCell>{getStatusBadge(k.status)}</TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {format(new Date(k.last_checked), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-right">
                      {k.status === 'PENDING' && (
                        <div className="flex justify-end gap-2">
                          <Button 
                            size="sm" 
                            className="bg-green-600 hover:bg-green-700 h-7 text-xs" 
                            onClick={() => mutation.mutate({ id: k.id, status: "PASSED", tenantId: tenant.tenantId })}
                            disabled={mutation.isPending}
                          >
                            Approve
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            className="h-7 text-xs"
                            onClick={() => mutation.mutate({ id: k.id, status: "FAILED", tenantId: tenant.tenantId })}
                            disabled={mutation.isPending}
                          >
                            Reject
                          </Button>
                        </div>
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