'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileText, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { format } from 'date-fns';

interface TenantContext { tenantId: string; currency: string; }

interface Invoice {
  id: string;
  invoice_number: string;
  client_name: string;
  total: number;
  status: 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  issue_date: string;
  due_date: string;
}

async function fetchInvoices(tenantId: string) {
  const db = createClient();
  const { data, error } = await db
    .from('invoices')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('issue_date', { ascending: false });
  
  if (error) throw error;
  return data as Invoice[];
}

export default function InvoiceStatusTracker({ tenant }: { tenant: TenantContext }) {
  const { data: invoices, isLoading } = useQuery({
    queryKey: ['invoices', tenant.tenantId],
    queryFn: () => fetchInvoices(tenant.tenantId)
  });

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5 text-indigo-600"/> Invoice Tracker</CardTitle>
        <CardDescription>Monitor outstanding receivables and payment status.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Issue Date</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead className="text-right">Total ({tenant.currency})</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="h-32 text-center"><Loader2 className="mx-auto animate-spin text-slate-400"/></TableCell></TableRow>
              ) : invoices?.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="h-32 text-center text-muted-foreground">No invoices found.</TableCell></TableRow>
              ) : (
                invoices?.map((inv) => {
                  const isOverdue = new Date(inv.due_date) < new Date() && inv.status !== 'PAID' && inv.status !== 'CANCELLED';
                  
                  return (
                    <TableRow key={inv.id} className={isOverdue ? 'bg-red-50' : ''}>
                      <TableCell className="font-mono font-medium">{inv.invoice_number}</TableCell>
                      <TableCell>{inv.client_name}</TableCell>
                      <TableCell>{format(new Date(inv.issue_date), 'MMM d, yyyy')}</TableCell>
                      <TableCell className={isOverdue ? 'text-red-600 font-bold' : ''}>
                        {format(new Date(inv.due_date), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="text-right font-bold">{inv.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell className="text-center">
                        {isOverdue ? (
                          <Badge variant="destructive" className="flex items-center w-fit mx-auto gap-1">
                            <AlertCircle className="w-3 h-3"/> OVERDUE
                          </Badge>
                        ) : (
                          <Badge 
                            variant={inv.status === 'PAID' ? 'default' : inv.status === 'SENT' ? 'secondary' : 'outline'}
                            className={inv.status === 'PAID' ? 'bg-green-600 hover:bg-green-700' : ''}
                          >
                            {inv.status}
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}