'use client';

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { Loader2, User, Phone, Mail } from "lucide-react";
import { format } from "date-fns";

interface Donor { 
  id: string; 
  name: string; 
  email: string; 
  phone?: string; 
  type: 'Individual' | 'Corporate' | 'Foundation'; 
  status: 'Active' | 'Lapsed' | 'New'; 
  last_donation?: string 
}

async function fetchDonors(tenantId: string) {
  const db = createClient();
  const { data, error } = await db
    .from('donors')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('name', { ascending: true });
  
  if (error) throw error; 
  return data as Donor[];
}

export function DonorList({ tenantId }: { tenantId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['donors', tenantId],
    queryFn: () => fetchDonors(tenantId)
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5 text-blue-600"/> Donors Directory
        </CardTitle>
        <CardDescription>Manage your organization's donor base.</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="rounded-md border-t">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Donation</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="h-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-slate-400"/></TableCell></TableRow>
              ) : data?.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">No donors found.</TableCell></TableRow>
              ) : (
                data?.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.name}</TableCell>
                    <TableCell className="text-sm">
                      <div className="flex flex-col gap-1">
                        <span className="flex items-center gap-1 text-slate-600"><Mail className="w-3 h-3"/> {d.email}</span>
                        {d.phone && <span className="flex items-center gap-1 text-slate-500"><Phone className="w-3 h-3"/> {d.phone}</span>}
                      </div>
                    </TableCell>
                    <TableCell>{d.type}</TableCell>
                    <TableCell>
                      <Badge variant={d.status === 'Active' ? 'default' : 'secondary'}>{d.status}</Badge>
                    </TableCell>
                    <TableCell>
                      {d.last_donation ? format(new Date(d.last_donation), 'MMM d, yyyy') : <span className="text-slate-400">Never</span>}
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