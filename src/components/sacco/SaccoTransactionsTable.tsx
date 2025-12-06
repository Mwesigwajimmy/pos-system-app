'use client';

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { createClient } from "@/lib/supabase/client";
import { Loader2, ArrowRightLeft, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

interface Transaction { 
    id: string; 
    member_name: string; 
    transaction_type: string; 
    amount: number; 
    currency: string; // Enterprise: Support multi-currency rows
    account_number: string; 
    product_name: string; 
    status: 'COMPLETED' | 'PENDING' | 'FAILED';
    created_at: string;
}

async function fetchTransactions(tenantId: string) {
  const db = createClient();
  const { data, error } = await db
    .from('sacco_transactions_view') 
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(50);
  
  if (error) throw error; 
  return data as Transaction[];
}

export default function SaccoTransactionsTable({ tenantId }: { tenantId: string }) {
  const { data, isLoading, isError } = useQuery({ 
      queryKey: ['sacco-transactions', tenantId], 
      queryFn: () => fetchTransactions(tenantId),
      refetchInterval: 30000 // Real-time poll every 30s
  });

  const formatMoney = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', { 
        style: 'currency', 
        currency: currency || 'UGX' 
    }).format(amount);
  };

  return (
    <Card className="h-full border-t-4 border-t-cyan-600 shadow-sm">
      <CardHeader>
          <CardTitle className="flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-cyan-600"/> Audit Trail
          </CardTitle>
          <CardDescription>Live feed of all financial movements across the cooperative.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
            <Table>
                <TableHeader className="bg-slate-50">
                <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Member</TableHead>
                    <TableHead>Product / Account</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {isLoading ? (
                    <TableRow><TableCell colSpan={6} className="h-32 text-center"><Loader2 className="animate-spin mx-auto text-slate-400"/></TableCell></TableRow>
                ) : isError ? (
                    <TableRow><TableCell colSpan={6} className="h-24 text-center text-red-500 flex items-center justify-center gap-2"><AlertCircle className="w-4 h-4"/> Failed to load transactions.</TableCell></TableRow>
                ) : !data || data.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">No recent transactions found.</TableCell></TableRow>
                ) : (
                    data.map((t) => (
                    <TableRow key={t.id}>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {format(new Date(t.created_at), 'MMM d, h:mm a')}
                        </TableCell>
                        <TableCell>
                            <div className="font-medium text-slate-800">{t.member_name}</div>
                        </TableCell>
                        <TableCell>
                             <div className="text-sm">{t.product_name}</div>
                             <div className="text-xs text-muted-foreground font-mono">{t.account_number}</div>
                        </TableCell>
                        <TableCell>
                            <Badge variant="outline" className="text-[10px] font-normal">{t.transaction_type}</Badge>
                        </TableCell>
                         <TableCell>
                            <Badge className={`text-[10px] ${t.status === 'COMPLETED' ? 'bg-green-100 text-green-700 hover:bg-green-100' : t.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100' : 'bg-red-100 text-red-700 hover:bg-red-100'}`}>
                                {t.status}
                            </Badge>
                        </TableCell>
                        <TableCell className={`text-right font-mono font-semibold whitespace-nowrap ${t.amount < 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {formatMoney(t.amount, t.currency)}
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