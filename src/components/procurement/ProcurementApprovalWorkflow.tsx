"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Loader2, CheckCircle2, AlertCircle, UserCheck, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { createClient } from "@/lib/supabase/client";

interface ApprovalStep {
  id: string;
  request_no: string;
  stage: string;
  reviewer: string;
  status: "pending" | "approved" | "rejected";
  updated_at: string;
  entity: string;
  country: string;
}

interface Props {
  tenantId?: string;
}

export default function ProcurementApprovalWorkflow({ tenantId }: Props) {
  const [workflow, setWorkflow] = useState<ApprovalStep[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    if (!tenantId) return;

    const fetchApprovals = async () => {
      // Assuming a table that tracks approval steps
      const { data } = await supabase
        .from('procurement_approval_steps')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('updated_at', { ascending: false })
        .limit(50);

      if (data) setWorkflow(data as any);
      setLoading(false);
    };

    fetchApprovals();
  }, [tenantId, supabase]);

  const [filter, setFilter] = useState('');
  const filtered = useMemo(
    () => workflow.filter(
      aw =>
        (aw.request_no || '').toLowerCase().includes(filter.toLowerCase()) ||
        (aw.reviewer || '').toLowerCase().includes(filter.toLowerCase())
    ),
    [workflow, filter]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Procurement Approval Workflow</CardTitle>
        <CardDescription>
          Live view of approval steps, reviewer actions, and status.
        </CardDescription>
        <div className="relative mt-3 max-w-xs">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground"/>
          <Input placeholder="Filter by request/reviewer..." value={filter} onChange={e=>setFilter(e.target.value)} className="pl-8"/>
          {filter && <X className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground cursor-pointer" onClick={()=>setFilter("")}/>}
        </div>
      </CardHeader>
      <CardContent>
        {loading
          ? <div className="flex justify-center py-10"><Loader2 className="h-7 w-7 animate-spin" /></div>
          : <ScrollArea className="h-60">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Request</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Reviewer</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0
                    ? <TableRow><TableCell colSpan={5}>No active workflows.</TableCell></TableRow>
                    : filtered.map(wf => (
                        <TableRow key={wf.id}>
                          <TableCell>
                            {wf.status === "approved"
                              ? <div className="flex items-center text-green-700"><CheckCircle2 className="w-4 h-4 mr-2"/> Approved</div>
                              : wf.status === "rejected"
                                ? <div className="flex items-center text-red-700"><AlertCircle className="w-4 h-4 mr-2"/> Rejected</div>
                                : <div className="flex items-center text-yellow-700"><UserCheck className="w-4 h-4 mr-2"/> Pending</div>
                            }
                          </TableCell>
                          <TableCell className="font-medium">{wf.request_no}</TableCell>
                          <TableCell className="capitalize">{wf.stage}</TableCell>
                          <TableCell>{wf.reviewer}</TableCell>
                          <TableCell>{new Date(wf.updated_at).toLocaleDateString()}</TableCell>
                        </TableRow>
                      ))}
                </TableBody>
              </Table>
            </ScrollArea>
        }
      </CardContent>
    </Card>
  );
}