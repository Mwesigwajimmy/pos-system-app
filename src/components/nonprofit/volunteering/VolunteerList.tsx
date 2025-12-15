'use client';

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";
import { Loader2, Hand, Phone, Mail, Users } from "lucide-react";

interface Volunteer { 
  id: string; 
  name: string; 
  email: string; 
  phone: string; 
  type: 'General' | 'Skilled' | 'Pro-bono'; 
  status: 'ACTIVE' | 'PENDING' | 'INACTIVE'; 
  joined_date: string;
}

// Named Export
export function VolunteerList({ tenantId }: { tenantId: string }) {
  const { data, isLoading } = useQuery({ 
    queryKey: ['volunteers', tenantId], 
    queryFn: async () => {
      const db = createClient();
      const { data, error } = await db
        .from('volunteers')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('name', { ascending: true });
      if (error) throw error;
      return data as Volunteer[];
    }
  });

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5 text-indigo-600"/> Volunteer Roster
        </CardTitle>
        <CardDescription>Active volunteers and their current status.</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="border-t">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={4} className="h-32 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-slate-400"/></TableCell></TableRow>
              ) : data?.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="h-32 text-center text-muted-foreground">No volunteers found.</TableCell></TableRow>
              ) : (
                data?.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell>
                      <div className="font-medium">{v.name}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                         <Mail className="w-3 h-3"/> {v.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs font-normal">
                        {v.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={v.status === 'ACTIVE' ? 'default' : 'secondary'} className={v.status === 'ACTIVE' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}>
                        {v.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
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