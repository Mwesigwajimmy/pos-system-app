"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Loader2, CheckCircle2, AlertCircle, Clock, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { createClient } from "@/lib/supabase/client";

// ENTERPRISE TYPE ALIGNMENT: Matches DB columns 1:1
interface ApprovalStep {
  id: string;
  request_no: string;
  stage: string;
  reviewer_name: string; // Updated from 'reviewer' to match SQL schema
  status: "pending" | "approved" | "rejected" | string;
  updated_at: string;
  entity?: string;
  country?: string;
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
      // Logic interconnected to your 'procurement_approval_steps' table
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
        (aw.reviewer_name || '').toLowerCase().includes(filter.toLowerCase())
    ),
    [workflow, filter]
  );

  return (
    <Card className="border-l-4 border-l-blue-500 shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Procurement Approval Workflow
        </CardTitle>
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
          ? <div className="flex justify-center py-10"><Loader2 className="h-7 w-7 animate-spin text-blue-500" /></div>
          : <ScrollArea className="h-72 border rounded-md">
              <Table>
                <TableHeader className="bg-slate-50">
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
                    ? <TableRow><TableCell colSpan={5} className="text-center py-4">No active workflows.</TableCell></TableRow>
                    : filtered.map(wf => (
                        <TableRow key={wf.id} className="hover:bg-slate-50 transition-colors">
                          <TableCell>
                            {wf.status === "approved"
                              ? <div className="flex items-center text-green-700 font-medium"><CheckCircle2 className="w-4 h-4 mr-2"/> Approved</div>
                              : wf.status === "rejected"
                                ? <div className="flex items-center text-red-700 font-medium"><AlertCircle className="w-4 h-4 mr-2"/> Rejected</div>
                                : <div className="flex items-center text-amber-600 font-medium"><Clock className="w-4 h-4 mr-2 animate-pulse"/> Pending</div>
                            }
                          </TableCell>
                          <TableCell className="font-mono text-sm">{wf.request_no}</TableCell>
                          <TableCell className="italic text-slate-500">{wf.stage}</TableCell>
                          <TableCell className="font-medium">{wf.reviewer_name}</TableCell>
                          <TableCell className="text-muted-foreground">{new Date(wf.updated_at).toLocaleDateString()}</TableCell>
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