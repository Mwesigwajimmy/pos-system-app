'use client';

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableHead, TableRow, TableBody, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";
import { Loader2, Search, History, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface TenantContext { tenantId: string }

interface AuditLog {
  id: string;
  timestamp: string;
  actor_email: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'EXPORT';
  entity_type: string;
  entity_id: string;
  changes: Record<string, any>; // JSONB column
  ip_address: string;
}

// Optimized fetch with filtering capability
async function fetchAuditLog(tenantId: string, searchTerm: string) {
  const db = createClient();
  let query = db
    .from("audit_log")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("timestamp", { ascending: false })
    .limit(50); // Pagination limit

  if (searchTerm) {
    // Basic search implementation - real app might use full-text search
    query = query.or(`actor_email.ilike.%${searchTerm}%,entity_type.ilike.%${searchTerm}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as AuditLog[];
}

export default function AuditLogViewer({ tenant }: { tenant: TenantContext }) {
  const [searchTerm, setSearchTerm] = useState("");
  
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["audit-log", tenant.tenantId, searchTerm],
    queryFn: () => fetchAuditLog(tenant.tenantId, searchTerm)
  });

  const getActionColor = (action: string) => {
    switch(action) {
      case 'CREATE': return 'bg-green-100 text-green-800';
      case 'DELETE': return 'bg-red-100 text-red-800';
      case 'UPDATE': return 'bg-blue-100 text-blue-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  return (
    <Card className="h-full border-t-4 border-t-slate-600">
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5 text-slate-600"/> Audit Trail
            </CardTitle>
            <CardDescription>Immutable record of system activities.</CardDescription>
          </div>
          
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500"/>
              <Input 
                placeholder="Search logs..." 
                className="pl-9 w-[250px]" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline" size="icon" onClick={() => refetch()}>
              <Filter className="h-4 w-4"/>
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="w-[180px]">Timestamp</TableHead>
                <TableHead>User / Actor</TableHead>
                <TableHead className="w-[100px]">Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="h-32 text-center"><Loader2 className="mx-auto animate-spin text-slate-400"/></TableCell></TableRow>
              ) : data?.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="h-32 text-center text-muted-foreground">No audit records found matching your criteria.</TableCell></TableRow>
              ) : (
                data?.map((l) => (
                  <TableRow key={l.id} className="hover:bg-slate-50">
                    <TableCell className="text-xs text-slate-500 font-mono">
                      {format(new Date(l.timestamp), "MMM d, yyyy HH:mm:ss")}
                    </TableCell>
                    <TableCell className="font-medium text-sm">{l.actor_email}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={`text-[10px] font-bold ${getActionColor(l.action)}`}>
                        {l.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      <span className="font-semibold text-slate-700">{l.entity_type}</span>
                      <span className="text-slate-400 text-xs ml-1">#{l.entity_id.slice(0,6)}</span>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500 max-w-[200px] truncate">
                      {JSON.stringify(l.changes)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <div className="mt-4 text-xs text-center text-slate-400">
          Showing recent 50 entries. Export for full history.
        </div>
      </CardContent>
    </Card>
  );
}