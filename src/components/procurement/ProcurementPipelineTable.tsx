"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Loader2, Search, X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";

interface PipelineRow {
  id: string;
  request_no: string;
  description: string;
  requestor: string;
  department: string;
  entity: string;
  country: string;
  total_value: number;
  currency: string;
  status: string;
  created_at: string;
}

interface Props {
  tenantId: string;
}

export default function ProcurementPipelineTable({ tenantId }: Props) {
  const [pipeline, setPipeline] = useState<PipelineRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const supabase = createClient();

  useEffect(() => {
    const fetchPipeline = async () => {
      const { data } = await supabase
        .from('procurement_requests')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (data) setPipeline(data as any);
      setLoading(false);
    };

    fetchPipeline();
  }, [tenantId, supabase]);

  const filtered = useMemo(
    () => pipeline.filter(
      p => (p.request_no || '').toLowerCase().includes(filter.toLowerCase())
        || (p.description || '').toLowerCase().includes(filter.toLowerCase())
        || (p.requestor || '').toLowerCase().includes(filter.toLowerCase())
    ),
    [pipeline, filter]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Procurement Pipeline</CardTitle>
        <CardDescription>
          All procurement requests, every stage—request, review, approval, PO, tender.
        </CardDescription>
        <div className="relative mt-3 max-w-xs">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Filter by request/desc..." 
            value={filter} 
            onChange={e => setFilter(e.target.value)} 
            className="pl-8" 
          />
          {filter && (
            <X 
              className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground cursor-pointer" 
              onClick={() => setFilter("")}
            />
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading
          ? <div className="flex py-10 justify-center"><Loader2 className="w-7 h-7 animate-spin"/></div>
          : <ScrollArea className="h-80">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Request #</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Requestor</TableHead>
                  <TableHead>Dept</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0
                  ? <TableRow><TableCell colSpan={7} className="text-center">No requests found.</TableCell></TableRow>
                  : filtered.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>
                          <Badge variant={p.status === 'approved' ? 'default' : 'secondary'}>
                            {p.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{p.request_no}</TableCell>
                        <TableCell>{p.description}</TableCell>
                        <TableCell>{p.requestor}</TableCell>
                        <TableCell>{p.department}</TableCell>
                        <TableCell>
                          {(p.total_value || 0).toLocaleString()} {p.currency}
                        </TableCell>
                        <TableCell>{new Date(p.created_at).toLocaleDateString()}</TableCell>
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