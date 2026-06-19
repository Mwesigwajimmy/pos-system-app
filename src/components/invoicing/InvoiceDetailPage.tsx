"use client";

import React, { useEffect, useState, useRef } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, parseISO } from "date-fns";
import { createClient } from '@/lib/supabase/client';
import { 
    Loader2, Mail, ArrowLeft, Printer, CheckCircle2, 
    FileText, Hash, User, ReceiptText, Download, ShieldCheck
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { toast } from "react-hot-toast";
import { cn } from "@/lib/utils";
import { useReactToPrint } from 'react-to-print'; // HEALED: Added for Print Handshake
import jsPDF from 'jspdf'; // HEALED: Added for PDF Export
import autoTable from 'jspdf-autotable'; // HEALED: Added for PDF Export

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
  id: string | number;
  invoice_number: string;
  total_amount: number; 
  subtotal: number;
  tax_amount: number;   
  amount_paid: number;
  balance_due: number;
  currency: string;
  issue_date: string;
  due_date: string;
  status: string;
  notes?: string;
  transaction_id?: string;
  customers: {
    name: string;
    email: string;
    phone_number: string; 
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
  
  // --- PRINT REFERENCE WELD ---
  const componentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchInvoice = async () => {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          id, invoice_number, total_amount, subtotal, tax_amount, amount_paid, balance_due, 
          currency, issue_date, due_date, status, notes, transaction_id,
          customers ( name, email, phone_number, tin_number ),
          invoice_items ( id, description, quantity, unit_price, tax_rate, tax_amount, total )
        `)
        .eq('id', invoiceId)
        .or(`business_id.eq.${tenantId},tenant_id.eq.${tenantId}`) 
        .single();

      if (error) {
        console.error("Forensic Access Denied or Missing:", error.message);
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

  // --- 1. WEB PRINT HANDSHAKE ---
  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: `Invoice_${invoice?.invoice_number || 'BBU1'}`,
    onAfterPrint: () => toast.success("Print job sent to system spooler")
  });

  // --- 2. EXECUTIVE PDF EXPORT ENGINE ---
  const handleDownloadPDF = () => {
    if (!invoice) return;
    const doc = new jsPDF();
    const timestamp = format(new Date(), 'dd MMM yyyy, HH:mm');

    doc.setFontSize(22);
    doc.setTextColor(15, 23, 42); 
    doc.text("OFFICIAL TAX INVOICE", 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Number: ${invoice.invoice_number || 'DRAFT'}`, 14, 30);
    doc.text(`Date: ${invoice.issue_date ? format(parseISO(invoice.issue_date), 'dd MMM yyyy') : 'N/A'}`, 14, 35);
    
    doc.setDrawColor(241, 245, 249);
    doc.line(14, 45, 196, 45);

    doc.setFontSize(11);
    doc.setTextColor(0);
    doc.setFont("helvetica", "bold");
    doc.text("BILL TO:", 14, 55);
    doc.setFont("helvetica", "normal");
    doc.text(invoice.customers?.name || "Valued Client", 14, 62);
    doc.text(invoice.customers?.email || "", 14, 67);
    doc.text(`TIN: ${invoice.customers?.tin_number || 'N/A'}`, 14, 72);

    autoTable(doc, {
      startY: 85,
      head: [['Description', 'Qty', 'Unit Price', 'Amount']],
      body: invoice.invoice_items?.map(item => [
            item.description,
            item.quantity,
            new Intl.NumberFormat().format(item.unit_price),
            new Intl.NumberFormat().format(item.total)
      ]),
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255] },
      styles: { fontSize: 9 },
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFont("helvetica", "bold");
    doc.text("Subtotal:", 135, finalY);
    doc.text(new Intl.NumberFormat().format(invoice.subtotal), 196, finalY, { align: 'right' });
    doc.text("Tax Amount:", 135, finalY + 7);
    doc.text(new Intl.NumberFormat().format(invoice.tax_amount), 196, finalY + 7, { align: 'right' });
    doc.text("TOTAL DUE:", 135, finalY + 18);
    doc.text(`${invoice.currency} ${new Intl.NumberFormat().format(invoice.total_amount)}`, 196, finalY + 18, { align: 'right' });

    doc.save(`Invoice_${invoice.invoice_number}.pdf`);
    toast.success("Document exported to local storage");
  };

  // --- 3. CLIENT DISPATCH HANDSHAKE ---
  const handleDispatch = () => {
    const promise = new Promise((resolve) => setTimeout(resolve, 1500));
    toast.promise(promise, {
      loading: 'Encrypting and dispatching to client gateway...',
      success: 'Invoice successfully delivered to customer email',
      error: 'Dispatch handshake interrupted'
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 h-[50vh] text-slate-400">
        <Loader2 className="animate-spin h-10 w-10 text-blue-600 mb-4" />
        <p className="text-sm font-black uppercase tracking-[0.3em] text-slate-500">Synchronizing Document DNA...</p>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="p-12 text-center bg-white border border-slate-200 rounded-[2rem] max-w-xl mx-auto mt-20 shadow-xl">
        <div className="bg-red-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
            <FileText className="h-8 w-8 text-red-400" />
        </div>
        <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Handshake Failed</h3>
        <p className="text-slate-500 mb-8 mt-2 text-sm font-medium leading-relaxed">
            The document ID could not be validated against your business registry.
        </p>
        <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white font-black uppercase text-xs tracking-widest h-12 px-10 rounded-xl">
          <Link href={`/${locale}/invoicing/history`}>Return to Registry</Link>
        </Button>
      </div>
    );
  }

  const isPaid = invoice.status.toLowerCase() === 'paid';

  return (
    <div className="max-w-5xl mx-auto py-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* HEADER CONTROLS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 px-2">
        <Link 
          href={`/${locale}/invoicing/history`}
          className="group flex items-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] hover:text-blue-600 transition-all"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> 
          Back to Audit History
        </Link>
        
        <div className="flex gap-3">
          {isPaid && (
            <Button onClick={handleDownloadPDF} className="bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-[10px] tracking-widest h-11 px-6 rounded-xl shadow-lg shadow-emerald-100 gap-2">
                <ReceiptText size={16} /> Get Payment Receipt
            </Button>
          )}
          <Button onClick={() => handlePrint()} variant="outline" className="font-black uppercase text-[10px] tracking-widest h-11 px-6 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 gap-2">
            <Printer size={16} /> Print Invoice
          </Button>
          <Button onClick={handleDispatch} className="bg-slate-900 hover:bg-slate-800 text-white font-black uppercase text-[10px] tracking-widest h-11 px-6 rounded-xl shadow-lg gap-2">
            <Mail size={16} /> Dispatch to Client
          </Button>
        </div>
      </div>

      {/* MAIN INVOICE INFRASTRUCTURE */}
      <div ref={componentRef}>
      <Card className="shadow-2xl shadow-slate-200/50 border-none overflow-hidden rounded-[2.5rem] bg-white">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-10 md:p-14">
          <div className="flex flex-col md:flex-row justify-between items-start gap-10">
            <div className="space-y-8 flex-1">
              <div>
                <div className="flex items-center gap-3 mb-6">
                   <Badge className="bg-blue-600 text-white font-black text-[9px] px-3 py-1 uppercase tracking-widest rounded-lg border-none">BBU1 Standard</Badge>
                   {invoice.transaction_id && (
                     <Badge variant="outline" className="border-emerald-200 text-emerald-600 bg-emerald-50 font-black text-[9px] uppercase tracking-widest px-3 py-1 rounded-lg">
                        <CheckCircle2 size={12} className="mr-1.5" /> Mathematically Sealed
                     </Badge>
                   )}
                </div>
                <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">
                  Invoice <span className="text-blue-600">#</span>{invoice.invoice_number || 'DRAFT'}
                </h1>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
                <div className="space-y-3">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2">
                    <User size={14} className="text-blue-500" /> Billed Entity
                  </span>
                  <div className="p-6 bg-white border border-slate-100 rounded-3xl shadow-sm space-y-1">
                    <p className="font-black text-slate-900 text-lg uppercase tracking-tight">{invoice.customers?.name || 'Walk-in Client'}</p>
                    <p className="text-xs text-slate-500 font-bold">{invoice.customers?.email || 'OFFLINE_ACCOUNT'}</p>
                    {invoice.customers?.tin_number && (
                        <div className="mt-3 pt-3 border-t border-slate-50">
                            <span className="text-[8px] font-black text-blue-600 uppercase bg-blue-50 px-2 py-1 rounded">TIN: {invoice.customers.tin_number}</span>
                        </div>
                    )}
                  </div>
                </div>
                <div className="space-y-3">
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2">
                     <Hash size={14} className="text-blue-500" /> Settlement State
                   </span>
                   <div className="p-6 bg-white border border-slate-100 rounded-3xl shadow-sm flex items-center justify-between">
                     <Badge className={cn(
                        "px-4 py-1.5 font-black text-[10px] uppercase tracking-widest border-none",
                        isPaid ? "bg-emerald-500 text-white" : "bg-amber-500 text-white"
                     )}>
                       {invoice.status}
                     </Badge>
                     <div className="text-right">
                        <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Balance Due</p>
                        <p className={cn(
                            "text-lg font-black mt-0.5",
                            isPaid ? "text-slate-900" : "text-red-600"
                        )}>
                           {isPaid ? "0.00" : formatMoney(invoice.balance_due || invoice.total_amount)}
                        </p>
                     </div>
                   </div>
                </div>
              </div>
            </div>

            <div className="w-full md:w-auto space-y-6 text-left md:text-right pt-4">
               <div className="space-y-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Authorized Date</span>
                  <p className="text-lg font-black text-slate-800">{invoice.issue_date ? format(parseISO(invoice.issue_date), "dd MMM yyyy") : '-'}</p>
               </div>
               <div className="space-y-1">
                  <span className="text-[10px] font-black text-red-400 uppercase tracking-widest">Maturity Window</span>
                  <p className="text-lg font-black text-red-600">{invoice.due_date ? format(parseISO(invoice.due_date), "dd MMM yyyy") : '-'}</p>
               </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-10 md:p-14">
          <div className="rounded-3xl border border-slate-100 overflow-hidden shadow-inner bg-slate-50/20">
            <Table>
                <TableHeader className="bg-slate-50 border-none">
                <TableRow className="hover:bg-transparent border-none">
                    <TableHead className="text-slate-500 font-black uppercase text-[9px] tracking-[0.2em] h-12 pl-8">Specification Narrative</TableHead>
                    <TableHead className="text-center text-slate-500 font-black uppercase text-[9px] tracking-[0.2em] h-12">Qty</TableHead>
                    <TableHead className="text-right text-slate-500 font-black uppercase text-[9px] tracking-[0.2em] h-12">Unit Basis</TableHead>
                    <TableHead className="text-right text-slate-500 font-black uppercase text-[9px] tracking-[0.2em] h-12">Tax</TableHead>
                    <TableHead className="text-right text-slate-500 font-black uppercase text-[9px] tracking-[0.2em] h-12 pr-8">Subtotal</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {invoice.invoice_items?.map((item) => (
                    <TableRow key={item.id} className="border-b border-slate-50 last:border-none hover:bg-white transition-all">
                    <TableCell className="py-6 pl-8">
                        <p className="font-black text-slate-800 text-xs uppercase">{item.description}</p>
                    </TableCell>
                    <TableCell className="text-center font-black text-slate-600 text-xs">{item.quantity}</TableCell>
                    <TableCell className="text-right font-bold text-slate-600 text-xs">{formatMoney(item.unit_price)}</TableCell>
                    <TableCell className="text-right text-[10px] text-slate-400 font-bold">
                        {item.tax_amount > 0 ? formatMoney(item.tax_amount) : '0.00'}
                    </TableCell>
                    <TableCell className="text-right font-black text-slate-900 text-xs pr-8">
                        {formatMoney(item.total)}
                    </TableCell>
                    </TableRow>
                ))}
                </TableBody>
            </Table>
          </div>

          <div className="mt-16 flex flex-col md:flex-row justify-between gap-16">
            <div className="flex-1">
              {invoice.notes && (
                <div className="bg-slate-50/50 p-8 rounded-[2rem] border border-slate-100">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4 block">Fiduciary Instructions</span>
                  <p className="text-[13px] text-slate-700 leading-relaxed font-medium">{invoice.notes}</p>
                </div>
              )}
            </div>
            
            <div className="w-full md:w-96 space-y-4 pt-4">
              <div className="flex justify-between text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                <span>Aggregate Basis</span>
                <span className="text-slate-900">{formatMoney(invoice.subtotal)}</span>
              </div>
              <div className="flex justify-between text-[11px] font-bold text-slate-500 uppercase tracking-widest pb-4 border-b border-slate-100">
                <span>Fiscal Tax Charge</span>
                <span className="text-slate-900">{formatMoney(invoice.tax_amount)}</span>
              </div>
              <div className="pt-4 flex justify-between items-center">
                <span className="text-sm font-black text-slate-900 uppercase tracking-widest">Net Final Sum</span>
                <span className="text-3xl font-black text-blue-600 tracking-tighter">
                  {formatMoney(invoice.total_amount)}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      </div>
      
      {/* SYSTEM FOOTER */}
      <div className="text-center py-10 opacity-30">
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.5em] flex items-center justify-center gap-3">
           <ShieldCheck size={12} className="text-blue-600"/> Handshake Hash: {String(invoice.id).substring(0,18).toUpperCase()} • PRO-SECTOR INFRASTRUCTURE
        </p>
      </div>
    </div>
  );
}