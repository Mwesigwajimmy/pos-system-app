'use client';
import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

interface Application { id:string; borrower_id:string; product:string; amount:number; term:number; status:string; date:string }
async function fetchApplications(tenantId:string) {
  const db = createClient();
  const { data, error } = await db.from('loan_applications').select('*').eq('tenant_id', tenantId).order('date', {ascending:false});
  if (error) throw error; return data;
}
export function ApplicationsList({ tenantId, onSelect }: { tenantId: string, onSelect: (id:string)=>void }) {
  const { data, isLoading } = useQuery({ queryKey:['applications',tenantId], queryFn:()=>fetchApplications(tenantId) });
  return (
    <Card>
      <CardHeader>
        <CardTitle>Applications</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Borrower</TableHead><TableHead>Product</TableHead>
              <TableHead>Term</TableHead><TableHead>Amount</TableHead>
              <TableHead>Status</TableHead><TableHead>Date</TableHead><TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading?<TableRow><TableCell colSpan={7}>Loading...</TableCell></TableRow>:
              data?.map((a:Application)=>
                <TableRow key={a.id}>
                  <TableCell>{a.borrower_id}</TableCell>
                  <TableCell>{a.product}</TableCell>
                  <TableCell>{a.term}</TableCell>
                  <TableCell>{a.amount}</TableCell>
                  <TableCell>{a.status}</TableCell>
                  <TableCell>{a.date ? new Date(a.date).toLocaleDateString() : ""}</TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" onClick={()=>onSelect(a.id)}>View</Button>
                  </TableCell>
                </TableRow>
              )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}