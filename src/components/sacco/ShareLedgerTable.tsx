'use client';

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { createClient } from "@/lib/supabase/client";
import { PieChart, Loader2, TrendingUp, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface ShareTxn { 
    id: string; 
    member_name: string; 
    member_no: string;
    created_at: string; 
    transaction_type: 'PURCHASE' | 'TRANSFER' | 'DIVIDEND_REINVEST'; 
    number_of_shares: number; 
    amount: number; 
    currency: string; // Added for multi-currency
    share_price_at_txn: number;
}

async function fetchShareLedger(tenantId: string) {
  const db = createClient();
  const { data, error } = await db
    .from('sacco_share_ledger_view') 
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(50);
  
  if (error) throw new Error(error.message); 
  return data as ShareTxn[];
}

export default function ShareLedgerTable({ tenantId }: { tenantId: string }) {
  const { data, isLoading } = useQuery({ 
      queryKey: ['share-ledger', tenantId], 
      queryFn: () => fetchShareLedger(tenantId) 
  });

  const formatMoney = (val: number, currency: string) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'UGX' }).format(val);

  return (
    <Card className="h-full border-t-4 border-t-indigo-500 shadow-sm">
      <CardHeader>
          <CardTitle className="flex items-center gap-2">
              <PieChart className="w-5 h-5 text-indigo-500"/> Share Capital Ledger
          </CardTitle>
          <CardDescription>Real-time tracking of member equity and share transfers.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
            <Table>
                <TableHeader className="bg-slate-50">
                <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Member Details</TableHead>
                    <TableHead>Transaction Type</TableHead>
                    <TableHead className="text-right">Units</TableHead>
                    <TableHead className="text-right">Total Value</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {isLoading ? (
                    <TableRow><TableCell colSpan={5} className="h-32 text-center"><Loader2 className="animate-spin mx-auto text-indigo-200"/></TableCell></TableRow>
                ) : !data || data.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">No share transactions recorded yet.</TableCell></TableRow>
                ) : (
                    data.map((s) => (
                    <TableRow key={s.id} className="group hover:bg-slate-50">
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {format(new Date(s.created_at), 'MMM d, yyyy HH:mm')}
                        </TableCell>
                        <TableCell>
                            <div className="flex items-center gap-2">
                                <div className="p-1 bg-indigo-50 rounded-full"><User className="w-3 h-3 text-indigo-400"/></div>
                                <div>
                                    <div className="font-medium text-slate-900">{s.member_name}</div>
                                    <div className="text-[10px] text-muted-foreground font-mono">{s.member_no}</div>
                                </div>
                            </div>
                        </TableCell>
                        <TableCell>
                            <Badge variant="secondary" className="text-[10px] font-normal">
                                {s.transaction_type === 'DIVIDEND_REINVEST' && <TrendingUp className="w-3 h-3 mr-1 text-green-600"/>}
                                {s.transaction_type.replace('_', ' ')}
                            </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-slate-600">
                            {s.number_of_shares.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-slate-800">
                            {formatMoney(s.amount, s.currency)}
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