"use client";

import React, { useEffect, useState, useMemo } from 'react';
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Search, FileText, ArrowRight } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { createClient } from '@/lib/supabase/client';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Invoice {
  id: string;
  invoice_number: string;
  customer_name: string; // Ensure your View/Join returns this column
  total: number;
  currency: string;
  status: string;
  issue_date: string;
  due_date: string;
}

interface Props {
  tenantId: string;
  locale?: string;
}

export default function InvoicesDataTable({ tenantId, locale = 'en' }: Props) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Client-side supabase (no arguments needed)
  const supabase = createClient();

  useEffect(() => {
    const fetchInvoices = async () => {
      setLoading(true);
      
      // Fetch invoices scoped to tenant
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('tenant_id', tenantId)
        .neq('status', 'DRAFT') // Usually we only show issued invoices here, drafts are in "To Be Issued"
        .order('issue_date', { ascending: false });
      
      if (error) {
        console.error("Error fetching invoices:", error);
      } else if (data) {
        setInvoices(data as unknown as Invoice[]);
      }
      setLoading(false);
    };

    if (tenantId) fetchInvoices();
  }, [tenantId, supabase]);

  const filtered = useMemo(() => invoices.filter(inv => 
    (inv.invoice_number || '').toLowerCase().includes(filter.toLowerCase()) ||
    (inv.customer_name || '').toLowerCase().includes(filter.toLowerCase()) ||
    (inv.status || '').toLowerCase().includes(filter.toLowerCase())
  ), [invoices, filter]);

  const getStatusBadge = (status: string) => {
    const s = status.toUpperCase();
    if (s === 'PAID') return <Badge className="bg-green-600">Paid</Badge>;
    if (s === 'OVERDUE') return <Badge variant="destructive">Overdue</Badge>;
    if (s === 'ISSUED' || s === 'SENT') return <Badge className="bg-blue-600">Issued</Badge>;
    return <Badge variant="secondary">{status.replace('_', ' ')}</Badge>;
  };

  return (
    <Card className="shadow-sm border-t-4 border-t-blue-600">
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-gray-500" />
              Invoice History
            </CardTitle>
            <CardDescription>Global invoice tracking and status monitoring.</CardDescription>
          </div>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
            <Input 
              placeholder="Search number, customer..." 
              value={filter} 
              onChange={e => setFilter(e.target.value)} 
              className="pl-9" 
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-500">
            <Loader2 className="animate-spin h-8 w-8 mb-2" />
            <p>Loading invoices...</p>
          </div>
        ) : (
          <ScrollArea className="h-[600px] border rounded-md">
            <Table>
              <TableHeader className="bg-gray-50 dark:bg-gray-800 sticky top-0 z-10">
                <TableRow>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead>Number</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Issued</TableHead>
                  <TableHead className="text-right">Due</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-gray-500">
                      No invoices found matching your search.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map(inv => (
                    <TableRow key={inv.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 group cursor-pointer transition-colors">
                      <TableCell>{getStatusBadge(inv.status)}</TableCell>
                      <TableCell className="font-medium">{inv.invoice_number}</TableCell>
                      <TableCell>{inv.customer_name || "Unknown"}</TableCell>
                      <TableCell className="text-right font-mono font-medium">
                        {inv.total.toLocaleString(undefined, { minimumFractionDigits: 2 })} {inv.currency}
                      </TableCell>
                      <TableCell className="text-right text-gray-500">
                        {inv.issue_date ? format(new Date(inv.issue_date), "yyyy-MM-dd") : '-'}
                      </TableCell>
                      <TableCell className="text-right text-gray-500">
                        {inv.due_date ? format(new Date(inv.due_date), "yyyy-MM-dd") : '-'}
                      </TableCell>
                      <TableCell>
                        <Button asChild size="icon" variant="ghost" className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <Link href={`/${locale}/invoicing/invoice/${inv.id}`}>
                            <ArrowRight className="h-4 w-4 text-gray-400" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}