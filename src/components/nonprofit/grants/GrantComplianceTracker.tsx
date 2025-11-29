'use client';

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { CheckSquare, Square, ClipboardCheck, Loader2 } from "lucide-react";

interface ComplianceItem { 
  id: string; 
  grant_id: string; 
  due_date: string; 
  type: 'REPORT' | 'MILESTONE' | 'FINANCIAL'; 
  description: string; 
  status: 'PENDING' | 'COMPLETED' | 'OVERDUE'; 
}

async function fetchCompliance(tenantId: string, grantId: string) {
  const db = createClient();
  const { data, error } = await db
    .from('grant_compliance')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('grant_id', grantId)
    .order('due_date', { ascending: true });
  
  if (error) throw error; 
  return data as ComplianceItem[];
}

async function toggleComplianceStatus({ id, status }: { id: string, status: string }) {
  const db = createClient();
  const { error } = await db.from('grant_compliance').update({ status }).eq('id', id);
  if (error) throw error;
}

export function GrantComplianceTracker({ tenantId, grantId }: { tenantId: string, grantId: string }) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ 
    queryKey: ['grant-compliance', tenantId, grantId], 
    queryFn: () => fetchCompliance(tenantId, grantId) 
  });

  const mutation = useMutation({
    mutationFn: toggleComplianceStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grant-compliance', tenantId, grantId] });
      toast.success("Status updated");
    },
    onError: () => toast.error("Failed to update status")
  });

  const handleToggle = (item: ComplianceItem) => {
    const newStatus = item.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
    mutation.mutate({ id: item.id, status: newStatus });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardCheck className="w-5 h-5 text-blue-600"/> Compliance & Reporting
        </CardTitle>
        <CardDescription>Track mandatory reports and milestones for this grant.</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="rounded-md border-t">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="w-[50px]">Done</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="h-24 text-center"><Loader2 className="mx-auto animate-spin"/></TableCell></TableRow>
              ) : data?.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">No compliance items found.</TableCell></TableRow>
              ) : (
                data?.map((c) => {
                  const isOverdue = new Date(c.due_date) < new Date() && c.status !== 'COMPLETED';
                  return (
                    <TableRow key={c.id} className={isOverdue ? "bg-red-50" : ""}>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleToggle(c)} 
                          disabled={mutation.isPending}
                          className="h-8 w-8"
                        >
                          {c.status === 'COMPLETED' ? <CheckSquare className="w-4 h-4 text-green-600"/> : <Square className="w-4 h-4 text-slate-400"/>}
                        </Button>
                      </TableCell>
                      <TableCell className="font-medium">{c.description}</TableCell>
                      <TableCell className="text-xs uppercase text-slate-500">{c.type}</TableCell>
                      <TableCell className={isOverdue ? "text-red-600 font-bold" : ""}>
                        {format(new Date(c.due_date), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <Badge variant={c.status === 'COMPLETED' ? 'default' : isOverdue ? 'destructive' : 'outline'}>
                          {isOverdue ? 'OVERDUE' : c.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}