'use client';
import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { formatDate } from "@/lib/utils";

interface KYCApplication { 
    id: string; 
    borrower_id: string; 
    name: string; 
    national_id: string; 
    kyc_status: 'PENDING' | 'APPROVED' | 'REJECTED'; 
    submitted_at: string; 
}

async function fetchKYCApps(tenantId: string) {
  const db = createClient();
  const { data, error } = await db.from('lending_kyc').select('*').eq('tenant_id', tenantId).order('submitted_at', { ascending: false });
  if (error) throw error; 
  return data as KYCApplication[];
}

async function updateKYCStatus({ id, status, tenantId }: { id: string, status: string, tenantId: string }) {
  const db = createClient();
  const { error } = await db.from('lending_kyc').update({ kyc_status: status }).eq('id', id).eq('tenant_id', tenantId);
  if (error) throw error;
}

export function KYCManager({ tenantId }: { tenantId: string }) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ 
      queryKey: ['lending-kyc', tenantId], 
      queryFn: () => fetchKYCApps(tenantId) 
  });

  const mutation = useMutation({ 
      mutationFn: updateKYCStatus, 
      onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['lending-kyc', tenantId] });
          toast.success("KYC Status Updated");
      }, 
      onError: (e: Error) => toast.error(e.message) 
  });

  return (
    <Card>
      <CardHeader><CardTitle>KYC Verification Queue</CardTitle></CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Applicant Name</TableHead>
              <TableHead>National ID</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={5}>Loading...</TableCell></TableRow> :
              data?.map((app) => (
                <TableRow key={app.id}>
                  <TableCell className="font-medium">{app.name}</TableCell>
                  <TableCell>{app.national_id}</TableCell>
                  <TableCell>
                      <Badge variant={app.kyc_status === 'APPROVED' ? 'default' : app.kyc_status === 'REJECTED' ? 'destructive' : 'secondary'}>
                          {app.kyc_status}
                      </Badge>
                  </TableCell>
                  <TableCell>{formatDate(app.submitted_at)}</TableCell>
                  <TableCell className="flex gap-2">
                    {app.kyc_status === "PENDING" && (
                        <>
                            <Button size="sm" onClick={() => mutation.mutate({ id: app.id, status: 'APPROVED', tenantId })}>Approve</Button>
                            <Button size="sm" variant="destructive" onClick={() => mutation.mutate({ id: app.id, status: 'REJECTED', tenantId })}>Reject</Button>
                        </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}