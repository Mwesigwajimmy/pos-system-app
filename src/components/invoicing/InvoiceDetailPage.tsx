"use client";

import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from "date-fns";
import { createClient } from '@/lib/supabase/client';
import { Loader2, Download, Mail, ArrowLeft, Printer, ShieldCheck, ExternalLink, Hash } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  tax_amount: number;
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
      
      // ENTERPRISE FIX: We use a smarter select that handles the business_id/tenant_id desync
      // and enforces strict ordering on line items so they don't jump around.
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          customers ( name, email, phone, tin_number ),
          invoice_items ( id, description, quantity, unit_price, tax_amount, total_amount )
        `)
        .eq('id', invoiceId)
        // Multi-Tenant Guard: Ensures document ownership regardless of column naming
        .or(`business_id.eq.${tenantId},tenant_id.eq.${tenantId}`) 
        .single();

      if (error) {
        console.error("Ledger Link Error:", error.message);
      } else if (isMounted && data) {
        // Sort items by ID to maintain document order
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
    new Intl.NumberFormat(locale, { 
      style: 'currency', 
      currency: invoice?.currency || 'UGX' 
    }).format(val);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 h-[50vh] text-slate-400">
        <Loader2 className="animate-spin h-12 w-12 text-blue-600 mb-4" />
        <p className="text-xs font-black uppercase tracking-widest animate-pulse">Authenticating Ledger Link...</p>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="p-12 text-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl max-w-2xl mx-auto mt-10">
        <ShieldCheck className="h-16 w-16 text-slate-200 mx-auto mb-4" />
        <h3 className="text-2xl font-black text-slate-800 tracking-tight">Interconnect Interrupted</h3>
        <p className="text-slate-500 mb-8 mt-2 font-medium">This document ID is either invalid or outside your authorized organizational scope.</p>
        <Button asChild variant="default" className="font-bold px-8 h-12 rounded-xl bg-blue-600 shadow-xl shadow-blue-600/20">
          <Link href={`/${locale}/invoicing/all-invoices`}>Return to Registry</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-6 space-y-8 animate-in fade-in duration-500">
      {/* Navigation & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <Link 
          href={`/${locale}/invoicing/all-invoices`}
          className="group flex items-center text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-blue-600 transition-colors"
        >
          <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" /> 
          Back to Central Registry
        </Link>
        
        <div className="flex gap-3">
          <Button variant="outline" size="sm" className="font-bold border-slate-200 shadow-sm hover:bg-slate-50 rounded-xl">
            <Printer className="mr-2 h-4 w-4" /> Print Record
          </Button>
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20 font-bold rounded-xl px-6">
            <Mail className="mr-2 h-4 w-4" /> Dispatch to Client
          </Button>
        </div>
      </div>

      {/* Main Invoice Card */}
      <Card className="shadow-2xl border-none overflow-hidden ring-1 ring-slate-200 rounded-[2rem] bg-white">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-10">
          <div className="flex flex-col md:flex-row justify-between items-start gap-10">
            <div className="space-y-6 flex-1">
              <div>
                <div className="flex items-center gap-2 mb-4">
                   <Badge className="bg-blue-600 text-white font-black text-[9px] px-2 py-0.5 uppercase tracking-widest rounded-md">Original</Badge>
                   {invoice.transaction_id && (
                     <Badge variant="outline" className="border-emerald-200 text-emerald-600 bg-emerald-50 font-black text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-md">
                        <ShieldCheck className="w-2.5 h-2.5 mr-1" /> Ledger Sealed
                     </Badge>
                   )}
                </div>
                <CardTitle className="text-5xl font-black text-slate-900 tracking-tighter">
                  #{invoice.invoice_number}
                </CardTitle>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
                <div className="space-y-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Client / Debtor</span>
                  <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                    <p className="font-black text-slate-900 leading-tight text-lg">{invoice.customers?.name}</p>
                    <p className="text-sm text-slate-500 mt-1">{invoice.customers?.email}</p>
                    {invoice.customers?.tin_number && <p className="text-[10px] font-bold text-blue-500 mt-2">TIN: {invoice.customers.tin_number}</p>}
                  </div>
                </div>
                <div className="space-y-2">
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Workflow State</span>
                   <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm flex items-center justify-between">
                     <Badge variant={invoice.status === 'paid' ? 'default' : 'secondary'} className="px-4 py-1 font-black text-xs">
                       {invoice.status.toUpperCase()}
                     </Badge>
                     <div className="text-right">
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Balance</p>
                        <p className="text-sm font-black text-slate-900">0.00</p>
                     </div>
                   </div>
                </div>
              </div>
            </div>

            <div className="w-full md:w-auto space-y-6">
               <div className="space-y-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Issue Date</span>
                  <p className="text-xl font-black text-slate-700">{format(new Date(invoice.issue_date), "dd MMM, yyyy")}</p>
               </div>
               <div className="space-y-1">
                  <span className="text-[10px] font-black text-red-400 uppercase tracking-widest">Expiry / Due</span>
                  <p className="text-xl font-black text-red-600">{format(new Date(invoice.due_date), "dd MMM, yyyy")}</p>
               </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-10">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="hover:bg-transparent border-slate-100">
                <TableHead className="text-slate-900 font-black uppercase text-[10px] tracking-widest">Description</TableHead>
                <TableHead className="text-center text-slate-900 font-black uppercase text-[10px] tracking-widest">Qty</TableHead>
                <TableHead className="text-right text-slate-900 font-black uppercase text-[10px] tracking-widest">Rate</TableHead>
                <TableHead className="text-right text-slate-900 font-black uppercase text-[10px] tracking-widest">Line Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.invoice_items?.map((item) => (
                <TableRow key={item.id} className="border-slate-50 hover:bg-slate-50/30 transition-colors">
                  <TableCell className="py-6 font-bold text-slate-700">{item.description}</TableCell>
                  <TableCell className="text-center font-mono font-bold text-slate-500">{item.quantity}</TableCell>
                  <TableCell className="text-right font-mono text-slate-500">
                    {formatMoney(item.unit_price)}
                  </TableCell>
                  <TableCell className="text-right font-mono font-black text-slate-900">
                    {formatMoney(item.total_amount || (item.unit_price * item.quantity))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Financial Breakdown Section */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-16">
            <div className="space-y-4">
              {invoice.notes && (
                <div className="bg-slate-50/50 p-8 rounded-[1.5rem] border border-slate-100">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Conditions & Instructions</span>
                  <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap font-medium">{invoice.notes}</p>
                </div>
              )}
            </div>
            
            <div className="space-y-4 bg-slate-900 p-8 rounded-[1.5rem] text-white h-fit shadow-2xl">
              <div className="flex justify-between text-xs text-slate-400 font-bold uppercase tracking-widest">
                <span>Gross Amount</span>
                <span className="font-mono">{formatMoney(invoice.subtotal)}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-400 font-bold uppercase tracking-widest pb-4 border-b border-slate-800">
                <span>Value Added Tax</span>
                <span className="font-mono">{formatMoney(invoice.tax_amount)}</span>
              </div>
              <div className="pt-4 flex justify-between items-center">
                <span className="text-sm font-black uppercase tracking-tighter text-slate-300">Total Indebtedness</span>
                <span className="text-3xl font-black text-white font-mono tracking-tighter">
                  {formatMoney(invoice.total_amount)}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Audit Footnote */}
      <div className="text-center py-6">
        <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.4em] flex items-center justify-center gap-2">
           <Hash size={10} /> Internal System ID: {invoice.id} • Auth Integrity Section 12-A
        </p>
      </div>
    </div>
  );
}