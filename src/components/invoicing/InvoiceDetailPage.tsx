"use client";

import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from "date-fns";
import { createClient } from '@/lib/supabase/client';
import { Loader2, Download, Mail, ArrowLeft, Printer } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

// Define strict types for better safety
interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface InvoiceDetail {
  id: string;
  invoice_number: string;
  customer_name: string; 
  customer_email?: string;
  total: number;
  subtotal: number;
  tax_total: number;
  currency: string;
  issue_date: string;
  due_date: string;
  status: string;
  notes?: string;
  invoice_items: InvoiceItem[];
}

interface Props {
  invoiceId: string;
  tenantId: string;
  locale: string;
}

export default function InvoiceDetailPage({ invoiceId, tenantId, locale }: Props) {
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Client-side supabase does not need cookies passed manually
  const supabase = createClient();

  useEffect(() => {
    const fetchInvoice = async () => {
      setLoading(true);
      
      // Fetch invoice + join items
      // Ensure your Database has Foreign Keys set up between invoices and invoice_items
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          invoice_items ( 
            id, 
            description, 
            quantity, 
            unit_price, 
            total 
          )
        `)
        .eq('id', invoiceId)
        .eq('tenant_id', tenantId)
        .single();

      if (error) {
        console.error("Error loading invoice:", error);
      } else {
        setInvoice(data as any);
      }
      setLoading(false);
    };

    fetchInvoice();
  }, [invoiceId, tenantId, supabase]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 h-[50vh]">
        <Loader2 className="animate-spin h-10 w-10 text-blue-600 mb-4" />
        <p className="text-gray-500">Loading invoice details...</p>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="p-8 text-center bg-gray-50 rounded-lg">
        <h3 className="text-lg font-bold text-gray-700">Invoice not found</h3>
        <p className="text-gray-500 mb-4">It may have been deleted or you do not have permission to view it.</p>
        <Button asChild variant="outline">
          <Link href={`/${locale}/invoicing/invoices`}>Back to List</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Navigation & Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <Button asChild variant="ghost" className="pl-0 hover:pl-2 transition-all">
          <Link href={`/${locale}/invoicing/invoices`}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Invoices
          </Link>
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Printer className="mr-2 h-4 w-4" /> Print
          </Button>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" /> PDF
          </Button>
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
            <Mail className="mr-2 h-4 w-4" /> Email Customer
          </Button>
        </div>
      </div>

      {/* Invoice Card */}
      <Card className="shadow-lg border-t-4 border-t-blue-600 overflow-hidden">
        <CardHeader className="bg-gray-50/50 pb-6 border-b">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-3xl font-bold text-gray-900">
                Invoice #{invoice.invoice_number}
              </CardTitle>
              <CardDescription className="mt-2 text-base">
                Billed to: <span className="font-semibold text-gray-700">{invoice.customer_name}</span>
                {invoice.customer_email && <span className="block text-sm">{invoice.customer_email}</span>}
              </CardDescription>
            </div>
            <div className="text-right">
              <Badge variant={invoice.status === 'paid' ? 'default' : 'secondary'} className="mb-2 text-sm px-3 py-1 uppercase">
                {invoice.status.replace('_', ' ')}
              </Badge>
              <div className="text-sm text-gray-500 mt-1">
                Issued: {format(new Date(invoice.issue_date), "MMM dd, yyyy")}
              </div>
              <div className="text-sm font-medium text-red-600 mt-1">
                Due: {format(new Date(invoice.due_date), "MMM dd, yyyy")}
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-8">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50%]">Description</TableHead>
                <TableHead className="text-center">Qty</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.invoice_items?.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium text-gray-800">{item.description}</TableCell>
                  <TableCell className="text-center text-gray-500">{item.quantity}</TableCell>
                  <TableCell className="text-right text-gray-500">
                    {item.unit_price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {item.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex flex-col md:flex-row justify-between mt-8 pt-6 border-t gap-8">
            <div className="w-full md:w-1/2">
              {invoice.notes && (
                <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-600">
                  <span className="font-semibold block mb-1 text-gray-800">Notes:</span>
                  {invoice.notes}
                </div>
              )}
            </div>
            
            <div className="w-full md:w-1/3 space-y-3">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal:</span>
                <span>{invoice.subtotal?.toLocaleString()} {invoice.currency}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Tax:</span>
                <span>{invoice.tax_total?.toLocaleString()} {invoice.currency}</span>
              </div>
              <div className="flex justify-between text-xl font-bold text-gray-900 border-t pt-3 mt-3">
                <span>Total:</span>
                <span>{invoice.total.toLocaleString()} {invoice.currency}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}