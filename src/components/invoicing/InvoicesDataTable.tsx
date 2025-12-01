"use client";

import React, { useState, useMemo } from 'react';
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, FileText, ArrowRight, AlertCircle } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// Define the Data Shape
export interface InvoiceData {
  id: string;
  invoice_number: string;
  customer_name: string | null;
  total: number;
  balance_due: number;
  currency: string;
  status: string;
  issue_date: string;
  due_date: string | null;
  items_count: number;
}

// Define Props - MUST include 'data'
interface Props {
  data: InvoiceData[]; 
  locale?: string;
}

// NAMED EXPORT (Notice: 'export function', NOT 'export default')
export function InvoicesDataTable({ data, locale = 'en' }: Props) {
  const [filter, setFilter] = useState('');

  const filtered = useMemo(() => data.filter(inv => 
    (inv.invoice_number || '').toLowerCase().includes(filter.toLowerCase()) ||
    (inv.customer_name || '').toLowerCase().includes(filter.toLowerCase()) ||
    (inv.status || '').toLowerCase().includes(filter.toLowerCase())
  ), [data, filter]);

  const getStatusBadge = (status: string) => {
    const s = (status || '').toUpperCase();
    switch (s) {
        case 'PAID': return <Badge className="bg-green-600 hover:bg-green-700">Paid</Badge>;
        case 'OVERDUE': return <Badge variant="destructive">Overdue</Badge>;
        case 'SENT': 
        case 'ISSUED': return <Badge className="bg-blue-600 hover:bg-blue-700">Issued</Badge>;
        case 'DRAFT': return <Badge variant="secondary">Draft</Badge>;
        case 'CANCELLED': return <Badge variant="outline" className="text-muted-foreground">Void</Badge>;
        default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat(locale, { style: 'currency', currency: currency || 'UGX' }).format(amount);
  };

  return (
    <Card className="shadow-sm border-t-4 border-t-primary">
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
              Invoice History
            </CardTitle>
            <CardDescription>Real-time registry of all financial documents.</CardDescription>
          </div>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Filter by number, client, or status..." 
              value={filter} 
              onChange={e => setFilter(e.target.value)} 
              className="pl-9" 
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px] border rounded-md relative">
          <Table>
            <TableHeader className="bg-muted/50 sticky top-0 z-10 backdrop-blur-sm">
              <TableRow>
                <TableHead className="w-[100px]">Status</TableHead>
                <TableHead>Invoice #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead className="text-right">Date</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <AlertCircle className="h-8 w-8 mb-2 opacity-20" />
                        <p>No invoices found.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(inv => (
                  <TableRow key={inv.id} className="group cursor-pointer hover:bg-muted/50 transition-colors">
                    <TableCell>{getStatusBadge(inv.status)}</TableCell>
                    <TableCell className="font-medium font-mono">{inv.invoice_number}</TableCell>
                    <TableCell>
                        <div className="flex flex-col">
                            <span className="font-medium">{inv.customer_name || "Unknown"}</span>
                            <span className="text-[10px] text-muted-foreground">{inv.items_count} items</span>
                        </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(inv.total, inv.currency)}
                    </TableCell>
                    <TableCell className="text-right">
                        {inv.balance_due > 0 ? (
                            <span className="text-red-600 font-medium text-xs bg-red-50 px-2 py-1 rounded-full">
                                {formatCurrency(inv.balance_due, inv.currency)}
                            </span>
                        ) : (
                            <span className="text-green-600 text-xs">Paid</span>
                        )}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground text-sm">
                      {inv.issue_date ? format(new Date(inv.issue_date), "MMM dd, yyyy") : '-'}
                    </TableCell>
                    <TableCell>
                      <Button asChild size="icon" variant="ghost" className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link href={`/invoicing/invoice/${inv.id}`}>
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}