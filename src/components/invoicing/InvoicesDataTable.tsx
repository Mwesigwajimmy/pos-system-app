"use client";

import React, { useState, useMemo } from 'react';
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Search, 
  FileText, 
  ArrowRight, 
  AlertCircle, 
  FileDown, 
  ShieldCheck, 
  ArrowUpDown,
  CheckCircle2,
  CalendarDays
} from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { format, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from 'sonner';

// PDF Logic
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// --- Enterprise Data Shape ---
export interface InvoiceData {
  id: string;
  invoice_number: string | null;
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
  transaction_id?: string | null; // From our Ledger Interconnect logic
  items_data?: any[]; 
}

interface Props {
  data: InvoiceData[]; 
  locale?: string;
  tenantName?: string;
}

export function InvoicesDataTable({ data, locale = 'en', tenantName = "Organization" }: Props) {
  const [filter, setFilter] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof InvoiceData, direction: 'asc' | 'desc' } | null>(null);

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
    doc.text(`Reference: ${inv.invoice_number || 'DRAFT'}`, 14, 30);
    doc.text(`Issued On: ${format(parseISO(inv.issue_date), 'dd MMM yyyy')}`, 14, 35);
    if (inv.transaction_id) {
        doc.setFontSize(8);
        doc.text(`Ledger Verified: ${inv.transaction_id}`, 14, 40);
    }

    // 2. Billing Context (Multi-Tenant Alignment)
    doc.setDrawColor(226, 232, 240);
    doc.line(14, 45, 196, 45);

    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.setFont("helvetica", "bold");
    doc.text("FROM (ISSUER):", 14, 55);
    doc.setFont("helvetica", "normal");
    doc.text(tenantName, 14, 62);
    doc.setFontSize(9);
    doc.text("Compliance: GADS-Certified Ledger System", 14, 68);

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("BILL TO (CUSTOMER):", 120, 55);
    doc.setFont("helvetica", "normal");
    doc.text(inv.customer_name || "Valued Customer", 120, 62);
    doc.text(`Currency: ${inv.currency}`, 120, 68);

    // 3. Line Items Execution
    autoTable(doc, {
      startY: 80,
      head: [['Description', 'Quantity', 'Unit Rate', 'Total']],
      body: inv.items_data && inv.items_data.length > 0 
        ? inv.items_data.map(item => [
            item.description || 'General Service',
            item.quantity || 1,
            new Intl.NumberFormat().format(item.unit_price || item.price || 0),
            new Intl.NumberFormat().format(item.total_amount || item.total || 0)
          ]) 
        : [['General Business Services', 1, new Intl.NumberFormat().format(inv.total), new Intl.NumberFormat().format(inv.total)]],
      theme: 'striped',
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 9 },
      columnStyles: {
        3: { halign: 'right' },
        2: { halign: 'right' }
      }
    });

    // 4. Financial Summary (IFRS Standards)
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Subtotal:", 135, finalY);
    doc.text(new Intl.NumberFormat().format(inv.subtotal || inv.total), 196, finalY, { align: 'right' });
    
    doc.text("Tax Amount:", 135, finalY + 7);
    doc.text(new Intl.NumberFormat().format(inv.tax_amount || 0), 196, finalY + 7, { align: 'right' });

    doc.setFontSize(14);
    doc.setTextColor(37, 99, 235); // Blue-600
    doc.text("TOTAL DUE:", 135, finalY + 18);
    doc.text(`${inv.currency} ${new Intl.NumberFormat().format(inv.total)}`, 196, finalY + 18, { align: 'right' });

    // 5. Verification Footer
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Digital Signature: Autonomously generated at ${timestamp}`, 14, 285);
    doc.text("This document constitutes a legal record of transaction.", 14, 289);

    doc.save(`Invoice_${inv.invoice_number || 'Draft'}.pdf`);
    toast.success("Professional Invoice Generated Successfully");
  };

  // --- SORTING LOGIC ---
  const handleSort = (key: keyof InvoiceData) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedAndFiltered = useMemo(() => {
    let result = data.filter(inv => 
      (inv.invoice_number || '').toLowerCase().includes(filter.toLowerCase()) ||
      (inv.customer_name || '').toLowerCase().includes(filter.toLowerCase()) ||
      (inv.status || '').toLowerCase().includes(filter.toLowerCase())
    );

    if (sortConfig) {
      result.sort((a, b) => {
        const aValue = a[sortConfig.key] ?? '';
        const bValue = b[sortConfig.key] ?? '';
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [data, filter, sortConfig]);

  const getStatusBadge = (status: string) => {
    const s = (status || '').toUpperCase();
    switch (s) {
        case 'PAID': return <Badge className="bg-emerald-600 border-none text-white font-bold">PAID</Badge>;
        case 'OVERDUE': return <Badge variant="destructive" className="font-bold">OVERDUE</Badge>;
        case 'SENT': 
        case 'ISSUED': return <Badge className="bg-blue-600 text-white border-none font-bold">ISSUED</Badge>;
        case 'DRAFT': return <Badge variant="secondary" className="font-bold">DRAFT</Badge>;
        default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat(locale, { style: 'currency', currency: currency || 'UGX' }).format(amount);
  };

  return (
    <Card className="shadow-2xl border-none overflow-hidden bg-white dark:bg-slate-950">
      <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 pb-8 border-b border-slate-100 dark:border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1">
            <CardTitle className="text-3xl font-black tracking-tight flex items-center gap-3 text-slate-900 dark:text-white">
              <ShieldCheck className="h-8 w-8 text-blue-600" />
              Corporate Registry
            </CardTitle>
            <CardDescription className="text-sm font-medium text-slate-500">
                Centralized accounts receivable ledger for <span className="text-blue-600 font-bold">{tenantName}</span>
            </CardDescription>
          </div>
          <div className="relative w-full lg:w-96 group">
            <Search className="absolute left-4 top-3.5 h-4 w-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
            <Input 
              placeholder="Search by name, ref, or status..." 
              value={filter} 
              onChange={e => setFilter(e.target.value)} 
              className="pl-12 h-12 bg-white dark:bg-slate-900 shadow-sm border-slate-200 dark:border-slate-800 rounded-xl" 
            />
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <ScrollArea className="h-[650px] relative">
          <Table>
            <TableHeader className="bg-slate-50 dark:bg-slate-900 sticky top-0 z-30 backdrop-blur-md border-b">
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-8 w-[140px]">Status</TableHead>
                
                <TableHead onClick={() => handleSort('invoice_number')} className="cursor-pointer group">
                  <div className="flex items-center gap-2">Reference <ArrowUpDown className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" /></div>
                </TableHead>
                
                <TableHead onClick={() => handleSort('customer_name')} className="cursor-pointer group">
                   <div className="flex items-center gap-2">Entity <ArrowUpDown className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" /></div>
                </TableHead>
                
                <TableHead onClick={() => handleSort('total')} className="text-right cursor-pointer group">
                   <div className="flex items-center justify-end gap-2">Ledger Value <ArrowUpDown className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" /></div>
                </TableHead>
                
                <TableHead className="text-right">Balance</TableHead>
                
                <TableHead onClick={() => handleSort('issue_date')} className="text-right cursor-pointer group">
                   <div className="flex items-center justify-end gap-2">Issue Date <ArrowUpDown className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" /></div>
                </TableHead>
                
                <TableHead className="text-right pr-8">Actions</TableHead>
              </TableRow>
            </TableHeader>
            
            <TableBody>
              {sortedAndFiltered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-80 text-center">
                        <AlertCircle className="h-12 w-12 mx-auto mb-4 text-slate-300 animate-pulse" />
                        <p className="text-slate-500 font-bold text-lg">No synchronized records found</p>
                        <p className="text-sm text-slate-400">Adjust your search or check your ledger integration.</p>
                  </TableCell>
                </TableRow>
              ) : (
                sortedAndFiltered.map(inv => (
                  <TableRow key={inv.id} className="group hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors border-b last:border-0">
                    <TableCell className="pl-8 py-5">{getStatusBadge(inv.status)}</TableCell>
                    
                    <TableCell className="font-black font-mono text-blue-700 dark:text-blue-400 text-sm">
                        <div className="flex items-center gap-2">
                           {inv.invoice_number || 'DRAFT'}
                           {inv.transaction_id && (
                             /* FIX: Wrapped in span to solve the TypeScript title error */
                             <span title="Hard-linked to Ledger">
                               <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                             </span>
                           )}
                        </div>
                    </TableCell>
                    
                    <TableCell>
                        <div className="flex flex-col">
                            <span className="font-bold text-slate-800 dark:text-slate-200">{inv.customer_name || "Guest Client"}</span>
                            <span className="text-[10px] text-slate-500 flex items-center gap-1.5 font-bold uppercase tracking-tighter">
                                <FileText className="h-2.5 w-2.5" /> {inv.items_count} SKU Items
                            </span>
                        </div>
                    </TableCell>
                    
                    <TableCell className="text-right font-mono font-black text-slate-900 dark:text-white">
                      {formatCurrency(inv.total, inv.currency)}
                    </TableCell>
                    
                    <TableCell className="text-right">
                        {inv.balance_due > 0 ? (
                            <span className="text-red-600 font-black font-mono text-xs px-2 py-1 bg-red-50 dark:bg-red-900/20 rounded-md">
                                {formatCurrency(inv.balance_due, inv.currency)}
                            </span>
                        ) : (
                            <div className="flex items-center justify-end gap-1 text-emerald-600 font-bold text-xs uppercase">
                                <ShieldCheck className="h-3 w-3" /> Settled
                            </div>
                        )}
                    </TableCell>
                    
                    <TableCell className="text-right">
                        <div className="flex flex-col items-end">
                            <span className="text-slate-600 dark:text-slate-400 text-sm font-bold">
                                {inv.issue_date ? format(parseISO(inv.issue_date), "dd MMM yyyy") : '-'}
                            </span>
                            {inv.due_date && (
                                <span className="text-[9px] text-slate-400 uppercase font-black">
                                    Due: {format(parseISO(inv.due_date), "dd MMM")}
                                </span>
                            )}
                        </div>
                    </TableCell>
                    
                    <TableCell className="text-right pr-8">
                        <div className="flex justify-end gap-2">
                            <Button 
                                size="sm" 
                                variant="ghost" 
                                className="h-9 w-9 p-0 hover:bg-blue-600 hover:text-white transition-all rounded-lg"
                                onClick={() => handleDownloadPDF(inv)}
                                title="Download PDF"
                            >
                                <FileDown className="h-5 w-5" />
                            </Button>
                            
                            <Button asChild size="sm" variant="ghost" className="h-9 w-9 p-0 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                                {/* FIX: Ensure the link matches your dynamic folder structure [invoiceId] */}
                                <Link href={`/${locale}/invoicing/invoice/${inv.id}`}>
                                    <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-blue-600" />
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