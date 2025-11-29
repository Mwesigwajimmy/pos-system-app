'use client';
import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { formatCurrency } from "@/lib/utils";
import { Phone, CheckCircle } from "lucide-react";

interface ArrearsRow { 
    id: string; 
    borrower_id: string;
    borrower_name: string; 
    loan_id: string; 
    overdue: number; 
    status: string; 
    contacted: boolean; 
}

async function fetchArrears(tenantId: string) {
  const db = createClient();
  const { data, error } = await db.rpc('arrears_portfolio', { tenant_id: tenantId });
  if (error) throw error; 
  return data as ArrearsRow[];
}

async function recordContact({ arrearsId, tenantId }: { arrearsId: string, tenantId: string }) {
  const db = createClient();
  const { error } = await db.from('arrears_contacts').insert([{ 
    arrears_id: arrearsId, 
    contacted_at: new Date().toISOString(), 
    tenant_id: tenantId 
  }]);
  if (error) throw error;
}

export function CollectionsManager({ tenantId }: { tenantId: string }) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ 
      queryKey: ['collections', tenantId], 
      queryFn: () => fetchArrears(tenantId) 
  });

  const mutation = useMutation({ 
      mutationFn: recordContact, 
      onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['collections', tenantId] });
          toast.success("Interaction logged successfully");
      }, 
      onError: (e: Error) => toast.error(e.message || "Failed to log contact") 
  });

  return (
    <Card>
      <CardHeader><CardTitle>Arrears & Collections Queue</CardTitle></CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Borrower</TableHead>
              <TableHead>Loan Ref</TableHead>
              <TableHead className="text-right">Overdue Amount</TableHead>
              <TableHead>Risk Status</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-4">Loading portfolio...</TableCell></TableRow>
            ) : data?.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.borrower_name}</TableCell>
                  <TableCell className="font-mono text-xs">{row.loan_id.slice(0,8)}...</TableCell>
                  <TableCell className="text-right font-bold text-red-600">{formatCurrency(row.overdue)}</TableCell>
                  <TableCell>{row.status}</TableCell>
                  <TableCell>
                    {row.contacted ? (
                        <span className="flex items-center text-green-600 text-sm"><CheckCircle className="w-4 h-4 mr-1"/> Contacted</span>
                    ) : (
                        <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => mutation.mutate({ arrearsId: row.id, tenantId })}
                            disabled={mutation.isPending}
                        >
                            <Phone className="w-3 h-3 mr-2" /> Log Call
                        </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}