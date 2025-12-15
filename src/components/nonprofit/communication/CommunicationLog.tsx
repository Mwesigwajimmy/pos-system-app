'use client';

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent, 
  CardDescription 
} from "@/components/ui/card";
import { 
  Table, 
  TableHeader, 
  TableRow, 
  TableHead, 
  TableBody, 
  TableCell 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";
import { Loader2, Mail, CheckCircle2, AlertCircle } from "lucide-react";

// --- Types ---
interface CommLogEntry { 
  id: string; 
  campaign: string | null; 
  recipient: string; 
  channel: string; 
  subject: string; 
  sent: boolean; 
  sent_at: string | null; 
  error?: string | null;
}

interface CommunicationLogProps {
  tenant: {
    tenantId: string;
    currency: string;
  };
}

// --- Data Fetching ---
async function fetchCommunicationLog(tenantId: string) {
  const db = createClient();
  const { data, error } = await db
    .from('communication_log')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('sent_at', { ascending: false })
    .limit(50); // Pagination limit for performance
  
  if (error) {
    console.error("Error fetching comms log:", error);
    throw new Error(error.message);
  }
  
  return data as CommLogEntry[];
}

// --- Component ---
export default function CommunicationLog({ tenant }: CommunicationLogProps) {
  const { tenantId } = tenant;

  const { data, isLoading, isError } = useQuery({
    queryKey: ['comm-log', tenantId],
    queryFn: () => fetchCommunicationLog(tenantId),
    staleTime: 1000 * 60 * 1, // Cache for 1 minute
    retry: 1
  });

  if (isError) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="flex items-center justify-center p-6 text-red-600 gap-2">
          <AlertCircle className="w-5 h-5"/> 
          <span className="font-medium">Failed to load communication logs.</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="w-5 h-5 text-slate-500"/> 
          Communication Logs
        </CardTitle>
        <CardDescription>Real-time log of messages sent to stakeholders.</CardDescription>
      </CardHeader>
      <CardContent className="p-0 flex-1">
        <div className="border-t">
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
                  <TableCell colSpan={6} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      <span className="text-xs">Loading logs...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : !data || data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    No communication logs found for this period.
                  </TableCell>
                </TableRow>
              ) : (
                data.map((c) => (
                  <TableRow key={c.id} className="group hover:bg-slate-50/50">
                    <TableCell className="font-medium text-sm">{c.recipient}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {c.campaign || "Direct Message"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="uppercase text-[10px] tracking-wider font-semibold">
                        {c.channel}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {c.sent ? (
                        <div className="flex items-center text-green-700 text-xs font-medium bg-green-50 w-fit px-2 py-1 rounded-full border border-green-100">
                          <CheckCircle2 className="w-3 h-3 mr-1.5"/> Sent
                        </div>
                      ) : (
                        <div className="flex items-center text-red-700 text-xs font-medium bg-red-50 w-fit px-2 py-1 rounded-full border border-red-100">
                          <AlertCircle className="w-3 h-3 mr-1.5"/> Failed
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {c.sent_at ? format(new Date(c.sent_at), "MMM d, h:mm a") : "-"}
                    </TableCell>
                    <TableCell className="max-w-[150px] truncate text-xs text-slate-500" title={c.error || c.subject}>
                      {c.error ? <span className="text-red-500 font-medium">{c.error}</span> : c.subject}
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