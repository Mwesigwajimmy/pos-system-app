"use client";

import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, parseISO } from "date-fns";
import { createClient } from '@/lib/supabase/client';
import { Loader2, Mail, ArrowLeft, Printer, CheckCircle2, FileText, Hash, User } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

// --- Interfaces ---
interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
}

interface InvoiceDetail {
  id: string;
  invoice_number: string;
  total: number;
  subtotal: number;
  tax_total: number;
  currency: string;
  issue_date: string;
  due_date: string;
  status: string;
  notes?: string;
  transaction_id?: string;
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
      
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          id, invoice_number, total, subtotal, tax_total, currency, issue_date, due_date, status, notes, transaction_id,
          customers ( name, email, phone, tin_number ),
          invoice_items ( id, description, quantity, unit_price, tax_rate, tax_amount, total )
        `)
        .eq('id', invoiceId)
        .or(`business_id.eq.${tenantId},tenant_id.eq.${tenantId}`) 
        .single();

      if (error) {
        console.error("Database Error:", error.message);
      } else if (isMounted && data) {
        if (data.invoice_items) {
          data.invoice_items.sort((a: any, b: any) => Number(a.id) - Number(b.id));
        }
        setInvoice(data as any);
      }
      setLoading(false);
    };

    if (invoiceId && tenantId) fetchInvoice();
    return () => { isMounted = false; };
  }, [invoiceId, tenantId, supabase]);

  const formatMoney = (val: number) => 
    new Intl.NumberFormat(locale === 'en' ? 'en-US' : locale, { 
      style: 'currency', 
      currency: invoice?.currency || 'UGX',
      minimumFractionDigits: 0
    }).format(val || 0);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 h-[50vh] text-slate-400">
        <Loader2 className="animate-spin h-10 w-10 text-blue-600 mb-4" />
        <p className="text-sm font-semibold text-slate-500">Retrieving invoice data...</p>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl max-w-xl mx-auto mt-20 shadow-sm">
        <FileText className="h-12 w-12 text-slate-200 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-slate-900">Invoice Not Found</h3>
        <p className="text-slate-500 mb-8 mt-2 text-sm">This document may have been removed or you do not have permission to view it.</p>
        <Button asChild className="bg-blue-600 hover:bg-blue-700 font-bold px-8 rounded-lg">
          <Link href={`/${locale}/invoicing/all-invoices`}>Return to Invoices</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 space-y-6 animate-in fade-in duration-500">
      
      {/* HEADER CONTROLS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-2">
        <Link 
          href={`/${locale}/invoicing/all-invoices`}
          className="group flex items-center text-xs font-bold text-slate-500 uppercase tracking-wider hover:text-blue-600 transition-colors"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> 
          Back to Invoice History
        </Link>
        
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="font-semibold border-slate-200">
            <Printer className="mr-2 h-4 w-4" /> Print
          </Button>
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 font-bold px-6 shadow-sm">
            <Mail className="mr-2 h-4 w-4" /> Send to Client
          </Button>
        </div>
      </div>

      {/* INVOICE CARD */}
      <Card className="shadow-sm border border-slate-200 overflow-hidden rounded-xl bg-white">
        <CardHeader className="bg-slate-50/50 border-b border-slate-200 p-8 md:p-12">
          <div className="flex flex-col md:flex-row justify-between items-start gap-8">
            <div className="space-y-6 flex-1">
              <div>
                <div className="flex items-center gap-2 mb-4">
                   <Badge className="bg-blue-600 text-white font-bold text-[10px] px-2.5 py-0.5 uppercase tracking-wide rounded">Official Invoice</Badge>
                   {invoice.transaction_id && (
                     <Badge variant="outline" className="border-emerald-200 text-emerald-600 bg-emerald-50 font-bold text-[10px] uppercase tracking-wide px-2.5 py-0.5 rounded">
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Verified Record
                     </Badge>
                   )}
                </div>
                <CardTitle className="text-3xl font-bold text-slate-900 tracking-tight">
                  Invoice #{invoice.invoice_number || 'DRAFT'}
                </CardTitle>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <User size={12} /> Billed To
                  </span>
                  <div className="p-4 bg-white border border-slate-100 rounded-xl shadow-sm">
                    <p className="font-bold text-slate-900 text-base">{invoice.customers?.name || 'Walk-in Customer'}</p>
                    <p className="text-xs text-slate-500 mt-1">{invoice.customers?.email || 'No email provided'}</p>
                    {invoice.customers?.tin_number && <p className="text-[10px] font-bold text-blue-600 mt-2 uppercase">Tax ID: {invoice.customers.tin_number}</p>}
                  </div>
                </div>
                <div className="space-y-2">
                   <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                     <Hash size={12} /> Payment Status
                   </span>
                   <div className="p-4 bg-white border border-slate-100 rounded-xl shadow-sm flex items-center justify-between">
                     <Badge variant={invoice.status.toLowerCase() === 'paid' ? 'default' : 'secondary'} className="px-3 py-0.5 font-bold text-xs uppercase">
                       {invoice.status}
                     </Badge>
                     <div className="text-right">
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Balance Due</p>
                        <p className={`text-sm font-bold ${invoice.status.toLowerCase() === 'paid' ? 'text-slate-900' : 'text-red-600'}`}>
                           {invoice.status.toLowerCase() === 'paid' ? '0.00' : formatMoney(invoice.total)}
                        </p>
                     </div>
                   </div>
                </div>
              </div>
            </div>

            <div className="w-full md:w-auto space-y-4 text-left md:text-right pt-2">
               <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Issue Date</span>
                  <p className="text-base font-bold text-slate-700">{invoice.issue_date ? format(parseISO(invoice.issue_date), "dd MMM yyyy") : '-'}</p>
               </div>
               <div>
                  <span className="text-[11px] font-bold text-red-400 uppercase tracking-wider">Due Date</span>
                  <p className="text-base font-bold text-red-600">{invoice.due_date ? format(parseISO(invoice.due_date), "dd MMM yyyy") : '-'}</p>
               </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-8 md:p-12">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="hover:bg-transparent border-slate-200">
                <TableHead className="text-slate-700 font-bold uppercase text-[10px] tracking-wider h-10">Description</TableHead>
                <TableHead className="text-center text-slate-700 font-bold uppercase text-[10px] tracking-wider h-10">Qty</TableHead>
                <TableHead className="text-right text-slate-700 font-bold uppercase text-[10px] tracking-wider h-10">Unit Price</TableHead>
                <TableHead className="text-right text-slate-700 font-bold uppercase text-[10px] tracking-wider h-10">Tax</TableHead>
                <TableHead className="text-right text-slate-700 font-bold uppercase text-[10px] tracking-wider h-10">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.invoice_items?.map((item) => (
                <TableRow key={item.id} className="border-slate-100 hover:bg-slate-50/30">
                  <TableCell className="py-4 font-medium text-slate-800">
                    {item.description}
                  </TableCell>
                  <TableCell className="text-center font-semibold text-slate-600">
                    {item.quantity}
                  </TableCell>
                  <TableCell className="text-right font-medium text-slate-600">
                    {formatMoney(item.unit_price)}
                  </TableCell>
                  <TableCell className="text-right text-[11px] text-slate-400 font-medium">
                    {item.tax_amount > 0 ? formatMoney(item.tax_amount) : '-'}
                  </TableCell>
                  <TableCell className="text-right font-bold text-slate-900">
                    {formatMoney(item.total)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* SUMMARY SECTION */}
          <div className="mt-12 flex flex-col md:flex-row justify-between gap-12">
            <div className="flex-1">
              {invoice.notes && (
                <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">Notes & Instructions</span>
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">{invoice.notes}</p>
                </div>
              )}
            </div>
            
            <div className="w-full md:w-80 space-y-3 pt-2">
              <div className="flex justify-between text-xs font-semibold text-slate-500">
                <span>Subtotal</span>
                <span>{formatMoney(invoice.subtotal)}</span>
              </div>
              <div className="flex justify-between text-xs font-semibold text-slate-500 pb-3 border-b border-slate-100">
                <span>Tax Amount</span>
                <span>{formatMoney(invoice.tax_total)}</span>
              </div>
              <div className="pt-2 flex justify-between items-center">
                <span className="text-sm font-bold text-slate-800 uppercase">Total Due</span>
                <span className="text-2xl font-bold text-blue-600">
                  {formatMoney(invoice.total)}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* FOOTER */}
      <div className="text-center py-4 border-t border-slate-100">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-center gap-2">
           Internal Ref: {invoice.id.substring(0,18).toUpperCase()} • Powered by BBU1
        </p>
      </div>
    </div>
  );
}