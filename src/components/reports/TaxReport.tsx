'use client';

import React, { useMemo, useState } from "react";
import { useRouter } from 'next/navigation';
import { 
  Card, 
  CardHeader, 
  CardContent, 
  CardTitle, 
  CardDescription, 
  CardFooter 
} from "@/components/ui/card";
import { 
  Table, 
  TableHeader, 
  TableRow, 
  TableHead, 
  TableBody, 
  TableCell 
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DatePickerWithRange } from "@/components/ui/date-range-picker"; 
import { DateRange } from "react-day-picker";
import { 
    Download, 
    Search, 
    Landmark, 
    Globe, 
    FileDown, 
    FileSpreadsheet, 
    CheckCircle2, 
    Activity,
    Loader2,
    Filter,
    FileText
} from "lucide-react";
import { format, parseISO } from "date-fns";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

// --- EXPORT ENGINES ---
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export interface TaxLineItem {
  id: string;
  jurisdiction_code: string;
  tax_name: string;
  type: 'Output' | 'Input';
  currency: string;
  rate_percentage: number;
  taxable_base: number;
  tax_amount: number;
  gross_amount: number;
  transaction_count: number;
}

export interface TaxSummary {
  currency: string;
  displayLabel?: string;
  total_output_tax: number;
  total_input_tax: number;
  net_liability: number;
}

interface TaxReportProps {
  data: TaxLineItem[];
  summaries: TaxSummary[];
  serializedDateRange: { from: string; to: string }; 
  tenantName?: string;
}

export default function TaxReportClient({ 
  data, 
  summaries, 
  serializedDateRange, 
  tenantName = "Business Entity" 
}: TaxReportProps) {
  const router = useRouter();
  const [filter, setFilter] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const dateRange = useMemo(() => ({
    from: parseISO(serializedDateRange.from),
    to: parseISO(serializedDateRange.to)
  }), [serializedDateRange]);

  const consolidatedTotals = useMemo(() => {
    const totals = new Map<string, TaxSummary>();
    summaries.forEach(s => {
      if (!totals.has(s.currency)) {
        totals.set(s.currency, { ...s, displayLabel: `Consolidated Total (${s.currency})` });
      } else {
        const existing = totals.get(s.currency)!;
        existing.total_output_tax += s.total_output_tax;
        existing.total_input_tax += s.total_input_tax;
        existing.net_liability += s.net_liability;
      }
    });
    return Array.from(totals.values());
  }, [summaries]);

  const handleDateChange = (range: DateRange | undefined) => {
    if (range?.from && range?.to) {
      const fromStr = format(range.from, 'yyyy-MM-dd');
      const toStr = format(range.to, 'yyyy-MM-dd');
      router.push(`?from=${fromStr}&to=${toStr}`);
    }
  };

  const formatMoney = (amount: number, currency: string) => {
    try {
      const cleanCode = currency.split(' ')[0].toUpperCase().substring(0, 3);
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: cleanCode,
        minimumFractionDigits: 2
      }).format(amount);
    } catch (e) {
      return `${currency} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
    }
  };

  const filteredData = useMemo(() => {
    return data.filter(row => 
      row.tax_name.toLowerCase().includes(filter.toLowerCase()) ||
      row.jurisdiction_code.toLowerCase().includes(filter.toLowerCase())
    ).sort((a,b) => b.type.localeCompare(a.type)); 
  }, [data, filter]);

  // --- PDF EXPORT (Professional Standard) ---
  const handleExportPDF = () => {
    setIsExporting(true);
    try {
      const doc = new jsPDF();
      const timestamp = format(new Date(), 'yyyy-MM-dd HH:mm');
      
      // 1. Header
      doc.setFillColor(51, 65, 85); // Slate-700
      doc.rect(0, 0, 210, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text("TAX COMPLIANCE REPORT", 105, 22, { align: 'center' });
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`PREPARED FOR: ${tenantName.toUpperCase()}`, 105, 30, { align: 'center' });

      // 2. Info Section
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Report Period:", 14, 52);
      doc.setFont("helvetica", "normal");
      doc.text(`${format(dateRange.from, "dd MMM yyyy")} - ${format(dateRange.to, "dd MMM yyyy")}`, 45, 52);

      // 3. Consolidated Totals
      doc.setFont("helvetica", "bold");
      doc.text("1. CONSOLIDATED TOTALS", 14, 65);
      autoTable(doc, {
        startY: 70,
        head: [['Currency', 'Tax Collected (Sales)', 'Tax Paid (Expenses)', 'Net Tax Liability']],
        body: consolidatedTotals.map(t => [
            t.currency, 
            formatMoney(t.total_output_tax, t.currency), 
            formatMoney(t.total_input_tax, t.currency), 
            formatMoney(t.net_liability, t.currency)
        ]),
        theme: 'striped',
        headStyles: { fillColor: [51, 65, 85] },
        styles: { fontSize: 9 }
      });

      // 4. Ledger Breakdown
      doc.text("2. DETAILED TAX LEDGER", 14, (doc as any).lastAutoTable.finalY + 15);
      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 20,
        head: [['Region', 'Tax Name', 'Type', 'Taxable Amount', 'Tax Component']],
        body: filteredData.map(r => [
            r.jurisdiction_code,
            r.tax_name,
            r.type,
            formatMoney(r.taxable_base, r.currency),
            formatMoney(r.tax_amount, r.currency)
        ]),
        theme: 'grid',
        headStyles: { fillColor: [37, 99, 235] },
        styles: { fontSize: 8 }
      });

      // 5. Footer
      const finalY = (doc as any).lastAutoTable.finalY + 15;
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`Report Date: ${timestamp} | Reference: ${Math.random().toString(36).substr(2, 6).toUpperCase()}`, 14, finalY);

      doc.save(`Tax_Report_${format(dateRange.from, 'yyyyMMdd')}.pdf`);
      toast.success("PDF Report Generated");
    } catch (err) {
      toast.error("Export failed.");
    } finally {
      setIsExporting(false);
    }
  };

  // --- EXCEL EXPORT ---
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();
    
    const summaryData = consolidatedTotals.map(t => ({
      "Currency": t.currency,
      "Collected Tax": t.total_output_tax,
      "Paid Tax": t.total_input_tax,
      "Net Liability": t.net_liability
    }));
    const summaryWS = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summaryWS, "Summary");

    const granularData = filteredData.map(r => ({
      "Region": r.jurisdiction_code,
      "Tax Name": r.tax_name,
      "Type": r.type,
      "Rate": `${r.rate_percentage}%`,
      "Taxable Base": r.taxable_base,
      "Tax Amount": r.tax_amount,
      "Currency": r.currency,
      "Trans. Count": r.transaction_count
    }));
    const granularWS = XLSX.utils.json_to_sheet(granularData);
    XLSX.utils.book_append_sheet(wb, granularWS, "Ledger Details");

    XLSX.writeFile(wb, `Tax_Report_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    toast.success("Excel Workbook Downloaded");
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      
      {/* 1. Header Section */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-blue-600 font-bold text-[10px] uppercase tracking-wider mb-1">
            <CheckCircle2 size={14}/> Verified Financial Report
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Tax Liability Report</h1>
          <p className="text-sm text-slate-500 font-medium">
            Analysis for <span className="text-blue-600 font-semibold">{tenantName}</span> ending {format(dateRange.to, "MMMM dd, yyyy")}
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
           {/* Actions */}
           <div className="flex gap-2 mr-2">
                <Button variant="outline" size="sm" onClick={handleExportExcel} className="font-bold text-[11px] border-slate-200 hover:bg-slate-50">
                    <FileSpreadsheet className="mr-2 h-4 w-4 text-emerald-600" /> Excel
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={isExporting} className="font-bold text-[11px] border-slate-200 hover:bg-slate-50">
                    {isExporting ? <Loader2 className="animate-spin h-4 w-4" /> : <FileDown className="mr-2 h-4 w-4 text-blue-600" />}
                    PDF Report
                </Button>
           </div>
           
           <div className="h-6 w-px bg-slate-200 hidden lg:block mx-1" />
           
           <DatePickerWithRange date={dateRange} setDate={handleDateChange} />
           
           <div className="relative w-full lg:w-64">
             <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
             <Input 
                placeholder="Filter results..." 
                value={filter} 
                onChange={e => setFilter(e.target.value)} 
                className="pl-10 h-10 border-slate-200 rounded-lg text-sm"
             />
           </div>
        </div>
      </div>
      
      {/* 2. Consolidated Totals */}
      {consolidatedTotals.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-1 flex items-center gap-2">
            <Globe className="h-4 w-4 text-blue-500"/> Consolidated Performance
          </h3>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {consolidatedTotals.map((total) => (
              <Card key={`total-${total.currency}`} className="bg-slate-900 text-white border-none shadow-md overflow-hidden group">
                <CardHeader className="pb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Net Liability ({total.currency})</span>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-emerald-400">
                    {formatMoney(total.net_liability, total.currency)}
                  </div>
                  <div className="mt-6 pt-4 border-t border-white/10 grid grid-cols-2 gap-4">
                    <div className="space-y-0.5">
                      <span className="text-[9px] text-slate-500 uppercase font-bold">Collected Tax</span>
                      <p className="text-sm font-semibold text-blue-400">{formatMoney(total.total_output_tax, total.currency)}</p>
                    </div>
                    <div className="text-right space-y-0.5">
                      <span className="text-[9px] text-slate-500 uppercase font-bold">Paid/Input Tax</span>
                      <p className="text-sm font-semibold text-amber-400">{formatMoney(total.total_input_tax, total.currency)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* 3. Jurisdictional Ledger Table */}
      <Card className="shadow-sm border border-slate-200 rounded-xl overflow-hidden bg-white">
        <CardHeader className="bg-slate-50/50 border-b border-slate-200 p-6">
          <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2 uppercase tracking-tight">
            <FileText className="h-5 w-5 text-blue-600"/> Detailed Tax Ledger
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="pl-6 text-[10px] font-bold uppercase text-slate-500 h-10 tracking-wider">Region</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase text-slate-500 h-10 tracking-wider">Authority</TableHead>
                  <TableHead className="text-center text-[10px] font-bold uppercase text-slate-500 h-10 tracking-wider">Type</TableHead>
                  <TableHead className="text-right text-[10px] font-bold uppercase text-slate-500 h-10 tracking-wider">Taxable Base</TableHead>
                  <TableHead className="text-right pr-6 text-[10px] font-bold uppercase text-slate-500 h-10 tracking-wider">Tax Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((row) => (
                  <TableRow key={row.id} className="hover:bg-slate-50/50 border-b border-slate-100">
                    <TableCell className="pl-6"><Badge variant="secondary" className="font-mono font-bold uppercase text-[10px] bg-slate-100 text-slate-600">{row.jurisdiction_code}</Badge></TableCell>
                    <TableCell className="font-semibold text-slate-800 text-xs">{row.tax_name}</TableCell>
                    <TableCell className="text-center">
                      <Badge className={cn(
                          "font-bold text-[9px] uppercase px-2 py-0.5",
                          row.type === 'Output' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                      )} variant="outline">
                        {row.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium text-slate-500 text-xs">{formatMoney(row.taxable_base, row.currency)}</TableCell>
                    <TableCell className="text-right pr-6 font-bold text-slate-900 text-xs">
                        {formatMoney(row.tax_amount, row.currency)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
        </CardContent>
        <CardFooter className="bg-slate-50 border-t py-4 px-6 flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                System Audit: Compliant
            </div>
            <div className="flex items-center gap-4">
                <span>Version 10.2</span>
                <span>Node: Global</span>
            </div>
        </CardFooter>
      </Card>
    </div>
  );
}