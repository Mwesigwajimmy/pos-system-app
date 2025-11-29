'use client';

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShieldAlert, Flag } from "lucide-react";

interface ComplianceEvent { 
    id: string; 
    msisdn: string; 
    event_type: string; 
    status: 'CLEARED' | 'INVESTIGATING' | 'BLOCKED'; 
    is_flagged: boolean; 
    created_at: string; 
    region: string; 
    agent_id: string; 
}

async function fetchCompliance(tenantId: string) {
  const db = createClient();
  const { data, error } = await db
    .from('telecom_compliance_logs')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(50);
  
  if (error) throw error; 
  return data as ComplianceEvent[];
}

export function TelecomComplianceLog({ tenantId }: { tenantId: string }) {
  const { data, isLoading } = useQuery({ 
      queryKey: ['telecom-compliance', tenantId], 
      queryFn: () => fetchCompliance(tenantId) 
  });

  return (
    <Card className="h-full border-t-4 border-t-red-600 shadow-sm">
      <CardHeader>
          <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-600"/> Compliance & Exceptions
          </CardTitle>
          <CardDescription>Monitor KYC violations, fraud alerts, and suspicious activity.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
            <Table>
                <TableHeader className="bg-slate-50">
                <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>MSISDN</TableHead>
                    <TableHead>Event Type</TableHead>
                    <TableHead>Region</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Flag</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {isLoading ? (
                    <TableRow><TableCell colSpan={6} className="h-32 text-center"><Loader2 className="animate-spin mx-auto"/></TableCell></TableRow>
                ) : !data || data.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">No compliance events found.</TableCell></TableRow>
                ) : (
                    data.map((r) => (
                    <TableRow key={r.id}>
                        <TableCell className="text-xs text-muted-foreground">
                            {format(new Date(r.created_at), 'MMM d, HH:mm')}
                        </TableCell>
                        <TableCell className="font-mono text-sm">{r.msisdn}</TableCell>
                        <TableCell>
                            <span className="font-medium text-slate-700">{r.event_type}</span>
                        </TableCell>
                        <TableCell className="text-sm">{r.region}</TableCell>
                        <TableCell>
                            <Badge variant="outline" className={
                                r.status === 'BLOCKED' ? 'border-red-200 text-red-700 bg-red-50' : 
                                r.status === 'INVESTIGATING' ? 'border-amber-200 text-amber-700 bg-amber-50' : ''
                            }>
                                {r.status}
                            </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                            {r.is_flagged && <Flag className="w-4 h-4 text-red-500 mx-auto fill-red-500" />}
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