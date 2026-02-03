"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Loader2, Search, X, Globe } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";

// ENTERPRISE TYPE ALIGNMENT: Matches DB columns 1:1
interface PipelineRow {
  id: string;
  request_no: string;
  description: string;
  requestor_name: string; // Fixed: Matches DB column 'requestor_name'
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
    if (!tenantId) return;

    const fetchPipeline = async () => {
      // Interconnected query strictly isolated by tenant_id
      const { data, error } = await supabase
        .from('procurement_requests')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (data) setPipeline(data as any);
      setLoading(false);
    };

    fetchPipeline();
  }, [tenantId, supabase]);

  const filtered = useMemo(
    () => pipeline.filter(
      p => (p.request_no || '').toLowerCase().includes(filter.toLowerCase())
        || (p.description || '').toLowerCase().includes(filter.toLowerCase())
        || (p.requestor_name || '').toLowerCase().includes(filter.toLowerCase())
    ),
    [pipeline, filter]
  );

  // Enterprise status coloring logic
  const getStatusVariant = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'approved': return 'default';
      case 'pending': return 'secondary';
      case 'rejected': return 'destructive';
      case 'draft': return 'outline';
      default: return 'outline';
    }
  };

  return (
    <Card className="shadow-sm border-t-4 border-t-slate-800">
      <CardHeader>
        <CardTitle>Procurement Pipeline</CardTitle>
        <CardDescription>
          Real-time tracking of all procurement requests through every stage of the lifecycle.
        </CardDescription>
        <div className="relative mt-3 max-w-xs">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search pipeline..." 
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
          ? <div className="flex py-20 justify-center"><Loader2 className="w-8 h-8 animate-spin text-slate-400"/></div>
          : <ScrollArea className="h-[450px] border rounded-md">
            <Table>
              <TableHeader className="bg-slate-50 sticky top-0 z-10">
                <TableRow>
                  <TableHead className="w-[120px]">Status</TableHead>
                  <TableHead>Request #</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Requestor & Entity</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0
                  ? <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">No active pipeline items found.</TableCell></TableRow>
                  : filtered.map((p) => (
                      <TableRow key={p.id} className="hover:bg-slate-50/50 transition-colors">
                        <TableCell>
                          <Badge variant={getStatusVariant(p.status)} className="uppercase text-[10px] tracking-wider">
                            {p.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs font-semibold">{p.request_no}</TableCell>
                        <TableCell className="max-w-[200px] truncate" title={p.description}>
                          {p.description}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-sm">{p.requestor_name}</div>
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase">
                             <Globe className="h-2 w-2" /> {p.country} / {p.entity}
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold whitespace-nowrap">
                          {(Number(p.total_value) || 0).toLocaleString()} <span className="text-[10px] text-muted-foreground font-normal">{p.currency}</span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(p.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </TableCell>
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