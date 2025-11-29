'use client';

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { createClient } from "@/lib/supabase/client";
import { PieChart, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface ShareTxn { 
    id: string; 
    member_id: string; 
    member_name: string; // View or Join
    created_at: string; 
    transaction_type: 'PURCHASE' | 'TRANSFER' | 'DIVIDEND_REINVEST'; 
    number_of_shares: number; 
    value_amount: number; 
}

async function fetchShareLedger(tenantId: string) {
  const db = createClient();
  const { data, error } = await db
    .from('share_ledger_view') // Assuming a view exists joining members
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });
  
  if (error) throw error; 
  return data as ShareTxn[];
}

export function ShareLedgerTable({ tenantId }: { tenantId: string }) {
  const { data, isLoading } = useQuery({ 
      queryKey: ['share-ledger', tenantId], 
      queryFn: () => fetchShareLedger(tenantId) 
  });

  return (
    <Card className="h-full border-t-4 border-t-indigo-500 shadow-sm">
      <CardHeader>
          <CardTitle className="flex items-center gap-2">
              <PieChart className="w-5 h-5 text-indigo-500"/> Share Capital Ledger
          </CardTitle>
          <CardDescription>Track member share ownership and transfers.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
            <Table>
                <TableHeader className="bg-slate-50">
                <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Member</TableHead>
                    <TableHead>Transaction Type</TableHead>
                    <TableHead className="text-right">Shares</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {isLoading ? (
                    <TableRow><TableCell colSpan={5} className="h-32 text-center"><Loader2 className="animate-spin mx-auto"/></TableCell></TableRow>
                ) : !data || data.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">No share transactions found.</TableCell></TableRow>
                ) : (
                    data.map((s) => (
                    <TableRow key={s.id}>
                        <TableCell className="text-xs text-muted-foreground">
                            {format(new Date(s.created_at), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell className="font-medium text-slate-800">{s.member_name}</TableCell>
                        <TableCell>
                            <Badge variant="secondary" className="text-[10px]">{s.transaction_type.replace('_', ' ')}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono">{s.number_of_shares}</TableCell>
                        <TableCell className="text-right font-mono font-semibold">
                            {s.value_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </TableCell>
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