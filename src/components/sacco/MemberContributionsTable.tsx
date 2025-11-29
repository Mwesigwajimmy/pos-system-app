'use client';

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp } from "lucide-react";

interface Contribution { 
  id: string; 
  member_id: string; 
  member_name: string; // From View/Join
  contribution_date: string; 
  amount: number; 
  product_name: string; 
  reference: string;
}

async function fetchContributions(tenantId: string) {
  const db = createClient();
  // Ideally querying a view that joins members and savings_products
  const { data, error } = await db
    .from('member_contributions_view') 
    .select('*')
    .eq('tenant_id', tenantId)
    .order('contribution_date', { ascending: false })
    .limit(50); // Pagination recommended for real apps
    
  if (error) throw error; 
  return data as Contribution[];
}

export function MemberContributionsTable({ tenantId }: { tenantId: string }) {
  const { data, isLoading } = useQuery({ 
    queryKey: ['contributions', tenantId], 
    queryFn: () => fetchContributions(tenantId) 
  });

  return (
    <Card className="h-full border-t-4 border-t-emerald-500 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-emerald-500"/> Member Contributions
        </CardTitle>
        <CardDescription>Recent savings deposits and share capital payments.</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="border-t">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="pl-6">Member</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right pr-6">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={4} className="h-32 text-center"><Loader2 className="animate-spin mx-auto text-slate-400"/></TableCell></TableRow>
              ) : !data || data.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="h-24 text-center text-muted-foreground">No contribution records found.</TableCell></TableRow>
              ) : (
                data.map((c) => (
                  <TableRow key={c.id} className="hover:bg-slate-50/50">
                    <TableCell className="pl-6 font-medium text-slate-700">
                      {c.member_name}
                      <div className="text-[10px] text-muted-foreground font-mono">{c.reference}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-slate-100 text-slate-600 font-normal">
                        {c.product_name}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">
                      {format(new Date(c.contribution_date), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-right pr-6 font-mono font-semibold text-emerald-700">
                      {c.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
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