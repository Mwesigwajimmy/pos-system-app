'use client';

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";
import { Loader2, Hand, Phone, Mail } from "lucide-react";

interface Volunteer { 
  id: string; 
  name: string; 
  email: string; 
  phone: string; 
  type: 'General' | 'Skilled' | 'Pro-bono'; 
  status: 'ACTIVE' | 'PENDING' | 'INACTIVE'; 
  joined_date: string 
}

async function fetchVolunteers(tenantId: string) {
  const db = createClient();
  const { data, error } = await db
    .from('volunteers')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('name', { ascending: true });
  
  if (error) throw error; 
  return data as Volunteer[];
}

export function VolunteerList({ tenantId }: { tenantId: string}) {
  const { data, isLoading } = useQuery({ 
    queryKey: ['volunteers', tenantId], 
    queryFn: () => fetchVolunteers(tenantId) 
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Hand className="w-5 h-5 text-orange-500"/> Volunteer Force
        </CardTitle>
        <CardDescription>Manage your volunteer database and availability.</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="rounded-md border-t">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Skill Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="h-24 text-center"><Loader2 className="mx-auto animate-spin"/></TableCell></TableRow>
              ) : data?.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">No volunteers registered.</TableCell></TableRow>
              ) : (
                data?.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-medium">{v.name}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 text-xs">
                        <span className="flex items-center gap-1"><Mail className="w-3 h-3"/> {v.email}</span>
                        <span className="flex items-center gap-1 text-slate-500"><Phone className="w-3 h-3"/> {v.phone}</span>
                      </div>
                    </TableCell>
                    <TableCell>{v.type}</TableCell>
                    <TableCell>
                      <Badge variant={v.status === 'ACTIVE' ? 'default' : 'secondary'} className={v.status === 'ACTIVE' ? 'bg-green-600' : ''}>
                        {v.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">
                      {v.joined_date ? format(new Date(v.joined_date), "MMM yyyy") : "-"}
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