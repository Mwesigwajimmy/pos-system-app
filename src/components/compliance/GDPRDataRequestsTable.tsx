'use client';

import React, { useEffect, useState, useCallback } from "react";
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Loader2, CheckCircle2, XCircle, Clock, Filter } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface GDPRRequest {
  id: string;
  type: string;
  data_subject: string;
  country: string;
  entity: string;
  status: "open" | "fulfilled" | "rejected";
  submitted_at: string;
  completed_at?: string;
}

export default function GDPRDataRequestsTable() {
  const supabase = createClient();
  const [requests, setRequests] = useState<GDPRRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('gdpr_requests').select('*').order('submitted_at', { ascending: false });
    
    if (statusFilter !== "all") {
        query = query.eq('status', statusFilter);
    }

    const { data, error } = await query;
    if (error) toast.error("Failed to fetch requests");
    else setRequests(data as GDPRRequest[] || []);
    setLoading(false);
  }, [supabase, statusFilter]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const updateStatus = async (id: string, newStatus: string) => {
    // Optimistic Update
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: newStatus as any } : r));

    const { error } = await supabase.from('gdpr_requests').update({ 
        status: newStatus, 
        completed_at: newStatus === 'fulfilled' ? new Date().toISOString() : null 
    }).eq('id', id);
    
    if (error) {
        toast.error("Status update failed");
        fetchRequests(); // Revert
    } else {
        toast.success(`Request marked as ${newStatus}`);
    }
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
            <div>
                <CardTitle>Data Subject Requests (DSAR)</CardTitle>
                <CardDescription>Manage GDPR/CCPA privacy requests.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground"/>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Filter Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Requests</SelectItem>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="fulfilled">Fulfilled</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? <div className="py-12 flex justify-center"><Loader2 className="animate-spin w-8 h-8 text-blue-500"/></div> :
        <ScrollArea className="h-[400px] border rounded-md">
            <Table>
            <TableHeader className="bg-gray-50 sticky top-0">
                <TableRow>
                <TableHead>Request Type</TableHead>
                <TableHead>Data Subject</TableHead>
                <TableHead>Entity / Jurisdiction</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Status Workflow</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {requests.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-gray-500">No requests found.</TableCell></TableRow> :
                requests.map(r => (
                <TableRow key={r.id} className="hover:bg-slate-50">
                    <TableCell>
                        <Badge variant="secondary" className="font-normal">{r.type}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{r.data_subject}</TableCell>
                    <TableCell className="text-sm text-gray-600">{r.entity} ({r.country})</TableCell>
                    <TableCell className="text-sm">{new Date(r.submitted_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                        <Select defaultValue={r.status} onValueChange={(val) => updateStatus(r.id, val)}>
                            <SelectTrigger className={`h-8 w-[130px] border-none shadow-none font-medium ${
                                r.status === 'fulfilled' ? 'text-green-700 bg-green-50' : 
                                r.status === 'rejected' ? 'text-red-700 bg-red-50' : 'text-blue-700 bg-blue-50'
                            }`}>
                                <div className="flex items-center gap-2">
                                    {r.status === 'fulfilled' ? <CheckCircle2 className="w-3 h-3"/> : 
                                     r.status === 'rejected' ? <XCircle className="w-3 h-3"/> : <Clock className="w-3 h-3"/>}
                                    <SelectValue />
                                </div>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="open">Open</SelectItem>
                                <SelectItem value="fulfilled">Fulfilled</SelectItem>
                                <SelectItem value="rejected">Rejected</SelectItem>
                            </SelectContent>
                        </Select>
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