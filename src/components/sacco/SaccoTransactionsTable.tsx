'use client';

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { createClient } from "@/lib/supabase/client";
import { Loader2, ArrowRightLeft } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

interface Transaction { 
    id: string; 
    member_name: string; 
    transaction_type: string; 
    amount: number; 
    account_number: string; 
    product_name: string; 
    created_at: string;
}

async function fetchTransactions(tenantId: string) {
  const db = createClient();
  const { data, error } = await db
    .from('sacco_transactions_view') // Assuming a view that joins members/products
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(50);
  
  if (error) throw error; 
  return data as Transaction[];
}

export function SaccoTransactionsTable({ tenantId }: { tenantId: string }) {
  const { data, isLoading } = useQuery({ 
      queryKey: ['sacco-transactions', tenantId], 
      queryFn: () => fetchTransactions(tenantId) 
  });

  return (
    <Card className="h-full border-t-4 border-t-cyan-600 shadow-sm">
      <CardHeader>
          <CardTitle className="flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-cyan-600"/> Recent Transactions
          </CardTitle>
          <CardDescription>Live feed of deposits, withdrawals, and transfers.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
            <Table>
                <TableHeader className="bg-slate-50">
                <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Member</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {isLoading ? (
                    <TableRow><TableCell colSpan={5} className="h-32 text-center"><Loader2 className="animate-spin mx-auto"/></TableCell></TableRow>
                ) : !data || data.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">No recent transactions.</TableCell></TableRow>
                ) : (
                    data.map((t) => (
                    <TableRow key={t.id}>
                        <TableCell className="text-xs text-muted-foreground">
                            {format(new Date(t.created_at), 'MMM d, h:mm a')}
                        </TableCell>
                        <TableCell>
                            <div className="font-medium text-slate-800">{t.member_name}</div>
                            <div className="text-xs text-muted-foreground">{t.account_number}</div>
                        </TableCell>
                        <TableCell className="text-sm">{t.product_name}</TableCell>
                        <TableCell>
                            <Badge variant="outline" className="text-[10px]">{t.transaction_type}</Badge>
                        </TableCell>
                        <TableCell className={`text-right font-mono font-semibold ${t.amount < 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {t.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
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