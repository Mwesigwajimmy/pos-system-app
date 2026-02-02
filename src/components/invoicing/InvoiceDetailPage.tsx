"use client";

import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from "date-fns";
import { createClient } from '@/lib/supabase/client';
import { Loader2, Download, Mail, ArrowLeft, Printer, ShieldCheck, ExternalLink } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

// Define strict types for Enterprise Data Structure
interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  tax_amount: number; // Added for tax transparency
  total_amount: number;
}

interface InvoiceDetail {
  id: string;
  invoice_number: string;
  total_amount: number;
  subtotal: number;
  tax_amount: number;
  currency: string;
  issue_date: string;
  due_date: string;
  status: string;
  notes?: string;
  transaction_id?: string; // The link to our Autonomous Ledger
  // ENTERPRISE JOIN: Source of Truth from the Customer Table
  customers: {
    name: string;
    email: string;
    phone: string;
    tin_number?: string;
  };
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
  const supabase = createClient();

  useEffect(() => {
    let isMounted = true;
    const fetchInvoice = async () => {
      setLoading(true);
      
      // RELATIONAL FETCH: Bridging BIGINT (Invoice) to UUID (Tenant/Ledger)
      // We join the 'customers' table to ensure we display the most current info.
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          customers ( name, email, phone, tin_number ),
          invoice_items ( id, description, quantity, unit_price, tax_amount, total_amount )
        `)
        .eq('id', invoiceId)
        .eq('tenant_id', tenantId)
        .single();

      if (error) {
        console.error("Fetch Error:", error.message);
      } else if (isMounted) {
        setInvoice(data as any);
      }
      setLoading(false);
    };

    fetchInvoice();
    return () => { isMounted = false; };
  }, [invoiceId, tenantId, supabase]);

  // Enterprise Currency Formatter
  const formatMoney = (val: number) => 
    new Intl.NumberFormat(locale, { 
      style: 'currency', 
      currency: invoice?.currency || 'UGX' 
    }).format(val);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 h-[50vh] text-slate-400">
        <Loader2 className="animate-spin h-10 w-10 text-blue-600 mb-4" />
        <p className="text-sm font-medium animate-pulse">Retrieving Secure Document...</p>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="p-12 text-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl max-w-2xl mx-auto mt-10">
        <ShieldCheck className="h-12 w-12 text-slate-300 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-slate-700">Access Restricted or Document Missing</h3>
        <p className="text-slate-500 mb-6 mt-2">This invoice is not available in your current organization scope.</p>
        <Button asChild variant="default">
          <Link href={`/${locale}/invoicing/all-invoices`}>Return to Invoice Registry</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-6 px-4 space-y-6">
      {/* Action Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-6">
        <Link 
          href={`/${locale}/invoicing/all-invoices`}
          className="group flex items-center text-sm font-bold text-slate-500 hover:text-blue-600 transition-colors"
        >
          <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" /> 
          Back to Registry
        </Link>
        
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="shadow-sm">
            <Printer className="mr-2 h-4 w-4" /> Print
          </Button>
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20">
            <Mail className="mr-2 h-4 w-4" /> Send to Customer
          </Button>
        </div>
      </div>

      <Card className="shadow-2xl border-none overflow-hidden ring-1 ring-slate-200">
        <CardHeader className="bg-slate-50/80 border-b p-8">
          <div className="flex flex-col md:flex-row justify-between gap-8">
            <div className="space-y-4">
              <div>
                <Badge className="mb-4 bg-emerald-600 uppercase tracking-widest text-[10px]">Commercial Invoice</Badge>
                <CardTitle className="text-4xl font-black text-slate-900">
                  #{invoice.invoice_number}
                </CardTitle>
              </div>
              
              <div className="grid grid-cols-2 gap-8 pt-2">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Billed To</span>
                  <p className="font-bold text-slate-800 leading-tight">{invoice.customers?.name}</p>
                  <p className="text-sm text-slate-500">{invoice.customers?.email}</p>
                  {invoice.customers?.tin_number && <p className="text-xs text-slate-400">TIN: {invoice.customers.tin_number}</p>}
                </div>
                <div className="space-y-1">
                   <span className="text-[10px] font-bold text-slate-400 uppercase">Payment Status</span>
                   <div>
                     <Badge variant={invoice.status === 'paid' ? 'default' : 'secondary'} className="px-3 py-0.5">
                       {invoice.status.toUpperCase()}
                     </Badge>
                   </div>
                   {invoice.transaction_id && (
                     <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold mt-1 uppercase">
                       <ShieldCheck className="h-3 w-3" /> Ledger Sealed
                     </div>
                   )}
                </div>
              </div>
            </div>

            <div className="text-left md:text-right space-y-6">
               <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Date Issued</span>
                  <p className="font-bold text-slate-700">{format(new Date(invoice.issue_date), "dd MMM, yyyy")}</p>
               </div>
               <div className="space-y-1">
                  <span className="text-[10px] font-bold text-red-400 uppercase">Due Date</span>
                  <p className="font-bold text-red-600">{format(new Date(invoice.due_date), "dd MMM, yyyy")}</p>
               </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-8">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="hover:bg-transparent border-slate-200">
                <TableHead className="text-slate-900 font-bold uppercase text-[10px]">Description</TableHead>
                <TableHead className="text-center text-slate-900 font-bold uppercase text-[10px]">Quantity</TableHead>
                <TableHead className="text-right text-slate-900 font-bold uppercase text-[10px]">Unit Price</TableHead>
                <TableHead className="text-right text-slate-900 font-bold uppercase text-[10px]">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.invoice_items?.map((item) => (
                <TableRow key={item.id} className="border-slate-100 hover:bg-slate-50/50 transition-colors">
                  <TableCell className="py-5 font-semibold text-slate-700">{item.description}</TableCell>
                  <TableCell className="text-center font-mono text-slate-500">{item.quantity}</TableCell>
                  <TableCell className="text-right font-mono text-slate-500">
                    {formatMoney(item.unit_price)}
                  </TableCell>
                  <TableCell className="text-right font-mono font-bold text-slate-900">
                    {formatMoney(item.total_amount || (item.unit_price * item.quantity))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Totals Section */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-4">
              {invoice.notes && (
                <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100">
                  <span className="text-[10px] font-black text-blue-400 uppercase mb-2 block">Notes & Terms</span>
                  <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{invoice.notes}</p>
                </div>
              )}
            </div>
            
            <div className="space-y-3 bg-slate-50/50 p-6 rounded-2xl border border-slate-100 h-fit">
              <div className="flex justify-between text-sm text-slate-500 font-medium">
                <span>Subtotal</span>
                <span className="text-slate-900 font-mono">{formatMoney(invoice.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-slate-500 font-medium">
                <span>Tax (VAT/GST)</span>
                <span className="text-slate-900 font-mono">{formatMoney(invoice.tax_amount)}</span>
              </div>
              <div className="pt-4 mt-4 border-t border-slate-200 flex justify-between items-center">
                <span className="text-lg font-black text-slate-900 uppercase tracking-tighter">Total Due</span>
                <span className="text-3xl font-black text-blue-600 font-mono tracking-tighter">
                  {formatMoney(invoice.total_amount)}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Audit ID Footer */}
      <div className="text-center py-4">
        <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest flex items-center justify-center gap-2">
           Internal Auth: {invoice.id} <ExternalLink size={10} /> Interconnected System V1.0
        </p>
      </div>
    </div>
  );
}