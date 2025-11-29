'use client';

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Users } from "lucide-react";

interface TenantContext { tenantId: string }

interface Client {
  id: string;
  name: string;
  type: string;
  status: 'active' | 'inactive' | 'lead';
  email: string;
}

async function fetchClients(tenantId: string) {
  const db = createClient();
  const { data, error } = await db.from("clients").select("*").eq("tenant_id", tenantId).order('name');
  if (error) throw error;
  return data as Client[];
}

export default function ClientCRMView({ tenant }: { tenant: TenantContext }) {
  const { data, isLoading } = useQuery({
    queryKey: ["crm-clients", tenant.tenantId],
    queryFn: () => fetchClients(tenant.tenantId)
  });

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Users className="w-5 h-5 text-indigo-600"/> Client CRM</CardTitle>
        <CardDescription>Overview of all client relationships and statuses.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Email</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={4} className="h-24 text-center"><Loader2 className="mx-auto animate-spin"/></TableCell></TableRow>
              ) : data?.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="h-24 text-center text-muted-foreground">No clients found.</TableCell></TableRow>
              ) : (
                data?.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>{c.type}</TableCell>
                    <TableCell>
                      <Badge variant={c.status === 'active' ? 'default' : 'secondary'} className="capitalize">
                        {c.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{c.email}</TableCell>
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