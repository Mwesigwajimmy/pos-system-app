'use client';

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";
import { Loader2, Mail, CheckCircle2, AlertCircle } from "lucide-react";

interface CommLogEntry { 
  id: string; 
  campaign: string; 
  recipient: string; 
  channel: string; 
  subject: string; 
  sent: boolean; 
  sent_at: string; 
  error?: string 
}

async function fetchCommunicationLog(tenantId: string) {
  const db = createClient();
  const { data, error } = await db
    .from('communication_log')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('sent_at', { ascending: false })
    .limit(50); // Pagination limit for performance
  
  if (error) throw error; 
  return data as CommLogEntry[];
}

export function CommunicationLog({ tenantId }: { tenantId: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['comm-log', tenantId],
    queryFn: () => fetchCommunicationLog(tenantId)
  });

  if (isError) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="flex items-center justify-center p-6 text-red-600 gap-2">
          <AlertCircle className="w-5 h-5"/> Failed to load communication logs.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="w-5 h-5 text-slate-500"/> Communication Logs
        </CardTitle>
        <CardDescription>Real-time log of messages sent to stakeholders.</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="rounded-md border-t">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Recipient</TableHead>
                <TableHead>Campaign</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-slate-400" />
                  </TableCell>
                </TableRow>
              ) : data?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    No communication logs found.
                  </TableCell>
                </TableRow>
              ) : (
                data?.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.recipient}</TableCell>
                    <TableCell>{c.campaign || "Direct Message"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="uppercase text-[10px]">{c.channel}</Badge>
                    </TableCell>
                    <TableCell>
                      {c.sent ? (
                        <div className="flex items-center text-green-600 text-xs font-medium">
                          <CheckCircle2 className="w-3 h-3 mr-1"/> Sent
                        </div>
                      ) : (
                        <div className="flex items-center text-red-600 text-xs font-medium">
                          <AlertCircle className="w-3 h-3 mr-1"/> Failed
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {c.sent_at ? format(new Date(c.sent_at), "MMM d, h:mm a") : "-"}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-xs text-slate-500">
                      {c.error ? <span className="text-red-500">{c.error}</span> : c.subject}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}