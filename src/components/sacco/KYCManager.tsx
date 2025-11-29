'use client';

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { format } from "date-fns";

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShieldCheck, CheckCircle2, UserCheck } from "lucide-react";

interface Applicant { 
    id: string; 
    name: string; 
    national_id: string; 
    kyc_status: 'PENDING' | 'APPROVED' | 'REJECTED'; 
    submitted_at: string;
    risk_score?: 'LOW' | 'MEDIUM' | 'HIGH';
}

async function fetchApplicants(tenantId: string) {
  const db = createClient();
  const { data, error } = await db
    .from('kyc_applications')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('submitted_at', { ascending: false });
  
  if (error) throw error; 
  return data as Applicant[];
}

async function approveKYC(id: string, tenantId: string) {
  const db = createClient();
  const { error } = await db
    .from('kyc_applications')
    .update({ 
        kyc_status: "APPROVED", 
        reviewed_at: new Date().toISOString() 
    })
    .eq('id', id)
    .eq('tenant_id', tenantId);
  
  if (error) throw error;
}

export function KYCManager({ tenantId }: { tenantId: string }) {
  const queryClient = useQueryClient();
  const [processingId, setProcessingId] = React.useState<string | null>(null);

  const { data, isLoading } = useQuery({ 
      queryKey: ['kyc-apps', tenantId], 
      queryFn: () => fetchApplicants(tenantId) 
  });

  const mutation = useMutation({ 
      mutationFn: (id: string) => approveKYC(id, tenantId), 
      onMutate: (id) => setProcessingId(id),
      onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['kyc-apps', tenantId] });
          toast.success("Applicant KYC Approved");
          setProcessingId(null);
      }, 
      onError: (e) => {
          toast.error(e.message || "Approval Failed");
          setProcessingId(null);
      } 
  });

  return (
    <Card className="h-full border-t-4 border-t-indigo-600 shadow-sm">
      <CardHeader>
          <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-600"/> KYC Verification
          </CardTitle>
          <CardDescription>Review and approve new member applications.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
            <Table>
            <TableHeader className="bg-slate-50">
                <TableRow>
                <TableHead>Applicant Name</TableHead>
                <TableHead>National ID / Passport</TableHead>
                <TableHead>Risk Profile</TableHead>
                <TableHead>Submission Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {isLoading ? (
                    <TableRow><TableCell colSpan={6} className="h-32 text-center"><Loader2 className="animate-spin mx-auto text-slate-400"/></TableCell></TableRow>
                ) : !data || data.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">No pending applications.</TableCell></TableRow>
                ) : (
                    data.map((a) => (
                    <TableRow key={a.id} className="hover:bg-slate-50/50">
                        <TableCell className="font-medium text-slate-800">{a.name}</TableCell>
                        <TableCell className="font-mono text-sm">{a.national_id}</TableCell>
                        <TableCell>
                            {a.risk_score === 'HIGH' && <Badge variant="destructive">High Risk</Badge>}
                            {a.risk_score === 'MEDIUM' && <Badge className="bg-amber-500">Medium</Badge>}
                            {(!a.risk_score || a.risk_score === 'LOW') && <Badge variant="secondary" className="bg-green-100 text-green-800">Low Risk</Badge>}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                            {format(new Date(a.submitted_at), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>
                            <Badge variant={a.kyc_status === 'APPROVED' ? 'default' : 'outline'} className={a.kyc_status === 'APPROVED' ? 'bg-green-600' : ''}>
                                {a.kyc_status}
                            </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                            {a.kyc_status === "PENDING" ? (
                                <Button 
                                    size="sm" 
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white h-8"
                                    onClick={() => mutation.mutate(a.id)}
                                    disabled={processingId === a.id}
                                >
                                    {processingId === a.id ? <Loader2 className="w-3 h-3 animate-spin"/> : <UserCheck className="w-3 h-3 mr-1"/>}
                                    Approve
                                </Button>
                            ) : (
                                <CheckCircle2 className="w-5 h-5 text-green-500 ml-auto"/>
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