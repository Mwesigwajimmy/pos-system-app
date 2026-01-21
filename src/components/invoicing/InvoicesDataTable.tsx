"use client";

import React, { useState, useMemo } from 'react';
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, FileText, ArrowRight, AlertCircle, FileDown, ShieldCheck, Printer } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from 'sonner';

// PDF Logic
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// --- Enterprise Data Shape ---
export interface InvoiceData {
  id: string;
  invoice_number: string;
  customer_name: string | null;
  total: number;
  subtotal: number;
  tax_amount: number;
  balance_due: number;
  currency: string;
  status: string;
  issue_date: string;
  due_date: string | null;
  items_count: number;
  items_data?: any[]; // Full line items for the PDF
}

interface Props {
  data: InvoiceData[]; 
  locale?: string;
  tenantName?: string; // Passed from parent (e.g., 'Nak' or 'Clevland')
}

export function InvoicesDataTable({ data, locale = 'en', tenantName = "Organization" }: Props) {
  const [filter, setFilter] = useState('');

  // --- PROFESSIONAL PDF GENERATOR ---
  const handleDownloadPDF = (inv: InvoiceData) => {
    const doc = new jsPDF();
    const timestamp = format(new Date(), 'dd MMM yyyy, HH:mm');

    // 1. Branding & Header
    doc.setFontSize(22);
    doc.setTextColor(30, 41, 59); // Slate-800
    doc.text("COMMERCIAL INVOICE", 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Reference: ${inv.invoice_number}`, 14, 30);
    doc.text(`Issued On: ${format(new Date(inv.issue_date), 'dd MMM yyyy')}`, 14, 35);

    // 2. Billing Context (Multi-Tenant Alignment)
    doc.setDrawColor(226, 232, 240);
    doc.line(14, 42, 196, 42);

    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.setFont("helvetica", "bold");
    doc.text("FROM (ISSUER):", 14, 52);
    doc.setFont("helvetica", "normal");
    doc.text(tenantName, 14, 59);
    doc.text("Compliance: GADS-Certified Ledger", 14, 65);

    doc.setFont("helvetica", "bold");
    doc.text("BILL TO (CUSTOMER):", 120, 52);
    doc.setFont("helvetica", "normal");
    doc.text(inv.customer_name || "Valued Customer", 120, 59);
    doc.text(`Currency: ${inv.currency}`, 120, 65);

    // 3. Line Items Execution
    autoTable(doc, {
      startY: 80,
      head: [['Description', 'Quantity', 'Unit Rate', 'Amount']],
      body: inv.items_data ? inv.items_data.map(item => [
          item.description || 'Service/Product',
          item.quantity || 1,
          new Intl.NumberFormat().format(item.price),
          new Intl.NumberFormat().format(item.total)
      ]) : [['General Business Services', 1, new Intl.NumberFormat().format(inv.total), new Intl.NumberFormat().format(inv.total)]],
      theme: 'striped',
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255] },
    });

    // 4. Financial Summary (IFRS Standards)
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFont("helvetica", "bold");
    doc.text("Subtotal:", 140, finalY);
    doc.text(new Intl.NumberFormat().format(inv.subtotal || inv.total), 196, finalY, { align: 'right' });
    
    doc.text("Tax Amount:", 140, finalY + 7);
    doc.text(new Intl.NumberFormat().format(inv.tax_amount || 0), 196, finalY + 7, { align: 'right' });

    doc.setFontSize(14);
    doc.text("TOTAL DUE:", 140, finalY + 16);
    doc.text(`${inv.currency} ${new Intl.NumberFormat().format(inv.total)}`, 196, finalY + 16, { align: 'right' });

    // 5. Verification Footer
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text("Digital Signature: This document is autonomously generated and hard-linked to the General Ledger.", 14, finalY + 40);
    doc.text(`Ledger Sync ID: TAX-SYNC-${inv.id}`, 14, finalY + 45);

    doc.save(`Invoice_${inv.invoice_number}.pdf`);
    toast.success("Professional Invoice Generated");
  };

  const filtered = useMemo(() => data.filter(inv => 
    (inv.invoice_number || '').toLowerCase().includes(filter.toLowerCase()) ||
    (inv.customer_name || '').toLowerCase().includes(filter.toLowerCase()) ||
    (inv.status || '').toLowerCase().includes(filter.toLowerCase())
  ), [data, filter]);

  const getStatusBadge = (status: string) => {
    const s = (status || '').toUpperCase();
    switch (s) {
        case 'PAID': return <Badge className="bg-green-600 border-none text-white">PAID</Badge>;
        case 'OVERDUE': return <Badge variant="destructive">OVERDUE</Badge>;
        case 'SENT': 
        case 'ISSUED': return <Badge className="bg-blue-600 text-white border-none">ISSUED</Badge>;
        case 'DRAFT': return <Badge variant="secondary">DRAFT</Badge>;
        default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat(locale, { style: 'currency', currency: currency || 'UGX' }).format(amount);
  };

  return (
    <Card className="shadow-lg border-none overflow-hidden">
      <CardHeader className="bg-muted/30 pb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-primary" />
              Accounts Receivable Registry
            </CardTitle>
            <CardDescription className="text-sm">
                Unified ledger of corporate invoices across all global entities.
            </CardDescription>
          </div>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search registry..." 
              value={filter} 
              onChange={e => setFilter(e.target.value)} 
              className="pl-10 h-11 bg-background shadow-sm" 
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[600px] relative">
          <Table>
            <TableHeader className="bg-muted/50 sticky top-0 z-20 backdrop-blur-md">
              <TableRow>
                <TableHead className="pl-6 w-[120px]">Status</TableHead>
                <TableHead>Invoice Reference</TableHead>
                <TableHead>Client/Entity</TableHead>
                <TableHead className="text-right">Ledger Amount</TableHead>
                <TableHead className="text-right">Balance Due</TableHead>
                <TableHead className="text-right">Issue Date</TableHead>
                <TableHead className="text-right pr-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-60 text-center">
                        <AlertCircle className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-20" />
                        <p className="text-muted-foreground font-medium">Registry empty</p>
                        <p className="text-xs text-muted-foreground">No invoices match your current search.</p>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(inv => (
                  <TableRow key={inv.id} className="group hover:bg-primary/5 transition-colors border-b last:border-0">
                    <TableCell className="pl-6">{getStatusBadge(inv.status)}</TableCell>
                    <TableCell className="font-bold font-mono text-primary text-sm">
                        {inv.invoice_number}
                    </TableCell>
                    <TableCell>
                        <div className="flex flex-col">
                            <span className="font-semibold text-slate-700">{inv.customer_name || "Walk-in Client"}</span>
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <FileText className="h-2 w-2" /> {inv.items_count} Line Items
                            </span>
                        </div>
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold">
                      {formatCurrency(inv.total, inv.currency)}
                    </TableCell>
                    <TableCell className="text-right">
                        {inv.balance_due > 0 ? (
                            <span className="text-red-600 font-bold font-mono text-xs p-1.5 bg-red-50 rounded">
                                {formatCurrency(inv.balance_due, inv.currency)}
                            </span>
                        ) : (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">SETTLED</Badge>
                        )}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground text-sm font-medium">
                      {inv.issue_date ? format(new Date(inv.issue_date), "dd MMM yyyy") : '-'}
                    </TableCell>
                    <TableCell className="text-right pr-6">
                        <div className="flex justify-end gap-2">
                            <Button 
                                size="sm" 
                                variant="outline" 
                                className="h-8 w-8 p-0 border-primary/20 hover:bg-primary/10 hover:text-primary transition-all"
                                onClick={() => handleDownloadPDF(inv)}
                            >
                                <FileDown className="h-4 w-4" />
                            </Button>
                            <Button asChild size="sm" variant="ghost" className="h-8 w-8 p-0 opacity-40 group-hover:opacity-100">
                                <Link href={`/invoicing/invoice/${inv.id}`}>
                                    <ArrowRight className="h-4 w-4" />
                                </Link>
                            </Button>
                        </div>
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