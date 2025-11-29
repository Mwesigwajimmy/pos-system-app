'use client';

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Users, HeartHandshake } from "lucide-react";

interface Beneficiary { 
  id: string; 
  name: string; 
  program: string; 
  impact_status: 'Active' | 'Graduated' | 'Waitlist'; 
  gender: string; 
  age: number;
  enrolled_date: string;
}

async function fetchBeneficiaries(tenantId: string) {
  const db = createClient();
  const { data, error } = await db
    .from('beneficiaries')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('name', { ascending: true });
  
  if (error) throw error; 
  return data as Beneficiary[];
}

export function BeneficiaryList({ tenantId }: { tenantId: string }) {
  const { data, isLoading } = useQuery({ 
    queryKey: ['beneficiaries', tenantId], 
    queryFn: () => fetchBeneficiaries(tenantId) 
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HeartHandshake className="w-5 h-5 text-rose-500"/> Beneficiaries
        </CardTitle>
        <CardDescription>Directory of individuals served by your programs.</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="rounded-md border-t">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Program</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Gender</TableHead>
                <TableHead className="text-right">Age</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="h-24 text-center"><Loader2 className="mx-auto animate-spin"/></TableCell></TableRow>
              ) : data?.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">No beneficiaries found.</TableCell></TableRow>
              ) : (
                data?.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">{b.name}</TableCell>
                    <TableCell>{b.program}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={
                        b.impact_status === 'Active' ? 'bg-green-100 text-green-800' : 
                        b.impact_status === 'Graduated' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-800'
                      }>
                        {b.impact_status}
                      </Badge>
                    </TableCell>
                    <TableCell className="capitalize">{b.gender}</TableCell>
                    <TableCell className="text-right">{b.age}</TableCell>
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