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
import { FileText, Loader2, AlertCircle } from "lucide-react";

// --- Types ---
interface Grant { 
  id: string; 
  title: string; 
  funder: string; 
  status: 'PROSPECT' | 'APPLIED' | 'AWARDED' | 'REJECTED'; 
  requested: number; 
  received: number; 
  deadline: string; 
}

interface GrantsListProps {
  tenant: {
    tenantId: string;
    currency: string;
  };
}

// --- Data Fetching ---
async function fetchGrants(tenantId: string) {
  const db = createClient();
  const { data, error } = await db
    .from('grants')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('deadline', { ascending: true });
  
  if (error) throw error; 
  return data as Grant[];
}

// --- Component ---
export default function GrantsList({ tenant }: GrantsListProps) {
  const { tenantId, currency } = tenant;
  
  const { data, isLoading, isError } = useQuery({ 
    queryKey: ['grants', tenantId], 
    queryFn: () => fetchGrants(tenantId) 
  });

  if (isError) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="flex items-center justify-center p-6 text-red-600 gap-2">
          <AlertCircle className="w-5 h-5"/> Failed to load grant pipeline.
        </CardContent>
      </Card>
    );
  }

  const getBadgeVariant = (status: string) => {
    switch (status) {
      case 'AWARDED': return 'default'; // dark/primary
      case 'REJECTED': return 'destructive';
      case 'APPLIED': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary"/> 
          Grant Pipeline
        </CardTitle>
        <CardDescription>
          Overview of current applications and awarded funding.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0 flex-1">
        <div className="border-t">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Grant Title</TableHead>
                <TableHead>Funder</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Requested</TableHead>
                <TableHead className="text-right">Received</TableHead>
                <TableHead>Deadline / Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      <span className="text-xs">Loading grants...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : !data || data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    No grants tracked yet. Start by applying for a grant.
                  </TableCell>
                </TableRow>
              ) : (
                data.map((g) => (
                  <TableRow key={g.id} className="group hover:bg-slate-50/50">
                    <TableCell className="font-medium">{g.title}</TableCell>
                    <TableCell>{g.funder}</TableCell>
                    <TableCell>
                      <Badge variant={getBadgeVariant(g.status)} className="uppercase text-[10px] tracking-wider">
                        {g.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {g.requested ? new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(g.requested) : '-'}
                    </TableCell>
                    <TableCell className="text-right font-medium text-green-700">
                      {g.received ? new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(g.received) : '-'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                        {g.deadline ? format(new Date(g.deadline), 'MMM d, yyyy') : 'No Date'}
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