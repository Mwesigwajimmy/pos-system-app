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
  CheckCircle2, 
  ArrowUpDown,
  FileSpreadsheet
} from 'lucide-react';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { format, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from 'react-hot-toast';

import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";

// PDF Logic
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// --- Interfaces ---
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
  transaction_id?: string | null; 
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

  // --- PDF GENERATOR (Professional Standard) ---
  const handleDownloadPDF = (inv: InvoiceData) => {
    const doc = new jsPDF();
    const timestamp = format(new Date(), 'dd MMM yyyy, HH:mm');

    // 1. Header
    doc.setFontSize(22);
    doc.setTextColor(15, 23, 42); 
    doc.text("INVOICE", 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Number: ${inv.invoice_number || 'Draft'}`, 14, 30);
    
    const issueDate = inv.issue_date ? format(parseISO(inv.issue_date), 'dd MMM yyyy') : 'N/A';
    doc.text(`Date: ${issueDate}`, 14, 35);
    
    if (inv.transaction_id) {
        doc.setFontSize(8);
        doc.text(`Reference: ${inv.transaction_id}`, 14, 40);
    }

    doc.setDrawColor(241, 245, 249);
    doc.line(14, 45, 196, 45);

    // 2. Billing Info
    doc.setFontSize(11);
    doc.setTextColor(0);
    doc.setFont("helvetica", "bold");
    doc.text("FROM:", 14, 55);
    doc.setFont("helvetica", "normal");
    doc.text(tenantName, 14, 62);

    doc.setFont("helvetica", "bold");
    doc.text("BILL TO:", 120, 55);
    doc.setFont("helvetica", "normal");
    doc.text(inv.customer_name || "Valued Customer", 120, 62);
    doc.text(`Currency: ${inv.currency || 'UGX'}`, 120, 68);

    // 3. Table
    autoTable(doc, {
      startY: 80,
      head: [['Description', 'Qty', 'Unit Price', 'Amount']],
      body: inv.items_data && inv.items_data.length > 0 
        ? inv.items_data.map(item => [
            item.description || 'General Service',
            item.quantity || 1,
            new Intl.NumberFormat().format(item.unit_price || item.price || 0),
            new Intl.NumberFormat().format(item.total || item.total_amount || 0)
          ]) 
        : [['General Services', 1, new Intl.NumberFormat().format(inv.total), new Intl.NumberFormat().format(inv.total)]],
      theme: 'grid',
      headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255] },
      styles: { fontSize: 9 },
      columnStyles: { 3: { halign: 'right' }, 2: { halign: 'right' } }
    });

    // 4. Totals
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    
    doc.text("Subtotal:", 135, finalY);
    doc.text(new Intl.NumberFormat().format(inv.subtotal || 0), 196, finalY, { align: 'right' });
    
    doc.text("Tax:", 135, finalY + 7);
    doc.text(new Intl.NumberFormat().format(inv.tax_amount || 0), 196, finalY + 7, { align: 'right' });

    doc.setFontSize(12);
    doc.setTextColor(37, 99, 235); 
    doc.text("TOTAL DUE:", 135, finalY + 18);
    doc.text(`${inv.currency} ${new Intl.NumberFormat().format(inv.total)}`, 196, finalY + 18, { align: 'right' });

    // 5. Footer
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Report Generated: ${timestamp}`, 14, 285);
    doc.text("Thank you for your business.", 14, 290);

    doc.save(`Invoice_${inv.invoice_number || 'Draft'}.pdf`);
    toast.success("Invoice PDF Downloaded");
  };

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
        let aValue = a[sortConfig.key] ?? '';
        let bValue = b[sortConfig.key] ?? '';

        if (sortConfig.key === 'issue_date' || sortConfig.key === 'due_date') {
            const timeA = aValue ? new Date(aValue as string).getTime() : 0;
            const timeB = bValue ? new Date(bValue as string).getTime() : 0;
            return sortConfig.direction === 'asc' ? timeA - timeB : timeB - timeA;
        }

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
        case 'PAID': return <Badge className="bg-emerald-500 hover:bg-emerald-600 border-none text-white px-3 py-0.5">Paid</Badge>;
        case 'OVERDUE': return <Badge variant="destructive" className="px-3 py-0.5">Overdue</Badge>;
        case 'PARTIAL': return <Badge className="bg-amber-500 hover:bg-amber-600 border-none text-white px-3 py-0.5">Partial</Badge>;
        case 'ISSUED': return <Badge className="bg-blue-600 hover:bg-blue-700 border-none text-white px-3 py-0.5">Issued</Badge>;
        default: return <Badge variant="outline" className="px-3 py-0.5 text-slate-500">{status}</Badge>;
    }
  };

  const formatMoney = (amount: number, currency: string) => {
    return new Intl.NumberFormat(locale === 'en' ? 'en-US' : locale, { 
        style: 'currency', 
        currency: currency || 'UGX',
        minimumFractionDigits: 0
    }).format(amount || 0);
  };

  return (
    <Card className="shadow-sm border border-slate-200 overflow-hidden bg-white">
      <CardHeader className="bg-slate-50/50 p-6 border-b border-slate-200">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-xl font-bold tracking-tight text-slate-900">
              Invoices
            </CardTitle>
            <CardDescription className="text-sm font-medium text-slate-500">
                Manage your billing records for {tenantName}
            </CardDescription>
          </div>
          <div className="relative w-full lg:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search invoices..." 
              value={filter} 
              onChange={e => setFilter(e.target.value)} 
              className="pl-10 h-10 bg-white border-slate-200 rounded-lg text-sm" 
            />
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <ScrollArea className="h-[600px] w-full">
          <div className="min-w-[1000px]"> {/* Ensures horizontal scroll on narrow containers */}
            <Table>
              <TableHeader className="bg-slate-50/80 border-b">
                <TableRow>
                  <TableHead className="pl-6 w-[120px] text-[11px] font-bold uppercase text-slate-500">Status</TableHead>
                  
                  <TableHead onClick={() => handleSort('invoice_number')} className="cursor-pointer hover:text-blue-600 transition-colors">
                    <div className="flex items-center gap-2 text-[11px] font-bold uppercase text-slate-500">Number <ArrowUpDown className="h-3 w-3" /></div>
                  </TableHead>
                  
                  <TableHead onClick={() => handleSort('customer_name')} className="cursor-pointer hover:text-blue-600 transition-colors">
                     <div className="flex items-center gap-2 text-[11px] font-bold uppercase text-slate-500">Customer <ArrowUpDown className="h-3 w-3" /></div>
                  </TableHead>
                  
                  <TableHead onClick={() => handleSort('total')} className="text-right cursor-pointer hover:text-blue-600 transition-colors">
                     <div className="flex items-center justify-end gap-2 text-[11px] font-bold uppercase text-slate-500">Amount <ArrowUpDown className="h-3 w-3" /></div>
                  </TableHead>

                  <TableHead className="text-right text-[11px] font-bold uppercase text-slate-500">Tax</TableHead>
                  <TableHead className="text-right text-[11px] font-bold uppercase text-slate-500">Balance</TableHead>
                  
                  <TableHead onClick={() => handleSort('issue_date')} className="text-right cursor-pointer hover:text-blue-600 transition-colors">
                     <div className="flex items-center justify-end gap-2 text-[11px] font-bold uppercase text-slate-500">Date <ArrowUpDown className="h-3 w-3" /></div>
                  </TableHead>
                  
                  <TableHead className="text-right pr-6 text-[11px] font-bold uppercase text-slate-500">Actions</TableHead>
                </TableRow>
              </TableHeader>
              
              <TableBody>
                {sortedAndFiltered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-48 text-center">
                        <div className="flex flex-col items-center justify-center text-slate-400">
                            <AlertCircle className="h-8 w-8 mb-2 opacity-20" />
                            <p className="text-sm font-medium">No invoices found</p>
                        </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedAndFiltered.map(inv => (
                    <TableRow key={inv.id} className="hover:bg-slate-50 transition-colors border-b last:border-0">
                      <TableCell className="pl-6 py-4">{getStatusBadge(inv.status)}</TableCell>
                      
                      <TableCell className="font-semibold text-blue-600 text-sm">
                          <div className="flex items-center gap-2">
                             {inv.invoice_number || 'Draft'}
                             {inv.transaction_id && <CheckCircle2 className="h-3 w-3 text-emerald-500" />}
                          </div>
                      </TableCell>
                      
                      <TableCell>
                          <div className="flex flex-col">
                              <span className="font-semibold text-slate-800">{inv.customer_name || "Customer"}</span>
                              <span className="text-[10px] text-slate-400 flex items-center gap-1 font-bold">
                                  <FileSpreadsheet className="h-2.5 w-2.5" /> {inv.items_count} items
                              </span>
                          </div>
                      </TableCell>
                      
                      <TableCell className="text-right font-bold text-slate-900">
                        {formatMoney(inv.total, inv.currency)}
                      </TableCell>

                      <TableCell className="text-right text-xs text-slate-500">
                        {inv.tax_amount > 0 ? formatMoney(inv.tax_amount, inv.currency) : '-'}
                      </TableCell>
                      
                      <TableCell className="text-right">
                          {inv.balance_due > 0 ? (
                              <span className="text-red-600 font-bold text-xs bg-red-50 px-2 py-0.5 rounded">
                                  {formatMoney(inv.balance_due, inv.currency)}
                              </span>
                          ) : (
                              <span className="text-emerald-600 font-bold text-[10px] uppercase">Paid</span>
                          )}
                      </TableCell>
                      
                      <TableCell className="text-right">
                          <div className="flex flex-col items-end">
                              <span className="text-slate-600 text-sm font-medium">
                                  {inv.issue_date ? format(parseISO(inv.issue_date), "dd MMM yyyy") : '-'}
                              </span>
                          </div>
                      </TableCell>
                      
                      <TableCell className="text-right pr-6">
                          <div className="flex justify-end gap-1">
                              <TooltipProvider>
                                  <Tooltip>
                                      <TooltipTrigger asChild>
                                          <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-slate-100" onClick={() => handleDownloadPDF(inv)}>
                                              <FileDown className="h-4 w-4 text-slate-500" />
                                          </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Download PDF</TooltipContent>
                                  </Tooltip>
                              </TooltipProvider>
                              
                              <Button asChild size="icon" variant="ghost" className="h-8 w-8 hover:bg-blue-50">
                                  <Link href={`/${locale}/invoicing/invoice/${inv.id}`}>
                                      <ArrowRight className="h-4 w-4 text-blue-600" />
                                  </Link>
                              </Button>
                          </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </CardContent>
    </Card>
  );
}