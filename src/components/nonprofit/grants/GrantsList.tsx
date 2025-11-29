'use client';

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";
import { FileText, Loader2 } from "lucide-react";

interface Grant { id: string; title: string; funder: string; status: string; requested: number; received: number; deadline: string; }

async function fetchGrants(tenantId: string) {
  const db = createClient();
  const { data, error } = await db.from('grants').select('*').eq('tenant_id', tenantId).order('deadline', { ascending: true });
  if (error) throw error; return data as Grant[];
}

export function GrantList({ tenantId }: { tenantId: string }) {
  const { data, isLoading } = useQuery({ queryKey: ['grants', tenantId], queryFn: ()=>fetchGrants(tenantId) });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5"/> Grant Pipeline</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="rounded-md border-t">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Grant Title</TableHead>
                <TableHead>Funder</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Requested</TableHead>
                <TableHead className="text-right">Received</TableHead>
                <TableHead>Deadline</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="h-24 text-center"><Loader2 className="mx-auto animate-spin"/></TableCell></TableRow>
              ) : data?.map((g) => (
                <TableRow key={g.id}>
                  <TableCell className="font-medium">{g.title}</TableCell>
                  <TableCell>{g.funder}</TableCell>
                  <TableCell>
                    <Badge variant={g.status === 'AWARDED' ? 'default' : g.status === 'REJECTED' ? 'destructive' : 'outline'}>
                      {g.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{g.requested?.toLocaleString()}</TableCell>
                  <TableCell className="text-right text-green-600 font-bold">{g.received?.toLocaleString()}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{format(new Date(g.deadline), 'PP')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}