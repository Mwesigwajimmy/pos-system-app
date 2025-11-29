'use client';

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users } from "lucide-react";

interface Customer { 
    id: string; 
    name: string; 
    msisdn: string; 
    segment: 'PREPAID' | 'POSTPAID' | 'CORPORATE'; 
    region: string; 
    products: string; 
    last_active: string; 
    wallet_balance: number;
    status: 'ACTIVE' | 'CHURNED' | 'INACTIVE';
}

async function fetchCustomers(tenantId: string) {
  const db = createClient();
  const { data, error } = await db
    .from('telecom_customers')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('last_active', { ascending: false })
    .limit(50);
  
  if (error) throw error; 
  return data as Customer[];
}

export function CustomerCRMPanel({ tenantId }: { tenantId: string }) {
  const { data, isLoading } = useQuery({ 
      queryKey: ['customers', tenantId], 
      queryFn: () => fetchCustomers(tenantId) 
  });

  return (
    <Card className="h-full border-t-4 border-t-blue-600 shadow-sm">
      <CardHeader>
          <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600"/> Customer CRM
          </CardTitle>
          <CardDescription>View subscriber profiles, segments, and usage history.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
            <Table>
            <TableHeader className="bg-slate-50">
                <TableRow>
                <TableHead>Customer Name</TableHead>
                <TableHead>MSISDN</TableHead>
                <TableHead>Segment</TableHead>
                <TableHead>Region</TableHead>
                <TableHead>Products</TableHead>
                <TableHead className="text-right">Wallet Balance</TableHead>
                <TableHead className="text-right">Last Active</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {isLoading ? (
                    <TableRow><TableCell colSpan={7} className="h-32 text-center"><Loader2 className="animate-spin mx-auto"/></TableCell></TableRow>
                ) : !data || data.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">No customers found.</TableCell></TableRow>
                ) : (
                    data.map((c) => (
                    <TableRow key={c.id} className="hover:bg-slate-50/50">
                        <TableCell className="font-medium text-slate-800">{c.name}</TableCell>
                        <TableCell className="font-mono text-sm text-slate-600">{c.msisdn}</TableCell>
                        <TableCell>
                            <Badge variant="outline" className={c.segment === 'CORPORATE' ? 'bg-purple-50 text-purple-700 border-purple-200' : ''}>
                                {c.segment}
                            </Badge>
                        </TableCell>
                        <TableCell>{c.region}</TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate" title={c.products}>{c.products}</TableCell>
                        <TableCell className="text-right font-mono font-semibold text-green-700">
                            {c.wallet_balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">
                            {c.last_active ? format(new Date(c.last_active), 'MMM d, HH:mm') : '-'}
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