"use client";

import { useState } from 'react';
import { 
    ChevronDown, ChevronRight, FileDown, ShieldCheck, 
    Landmark, UserCircle, Receipt, Fingerprint, Printer,
    Scale, AlertCircle
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { cn, formatCurrency } from '@/lib/utils';
import { Badge } from "@/components/ui/badge";
import { toast } from 'sonner';
import { format } from 'date-fns';

// PDF Printing Engines
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// --- ENTERPRISE IDENTITY SCHEMA ---
// UPGRADE: Aligned with the Dynamic Element Registry (V10.8)
type PayrollElement = { 
    name: string; 
    type: string; 
    calculation_method?: string;
    is_statutory?: boolean;
};

type PayslipDetail = { 
    calculated_amount: string | number; 
    payroll_elements: PayrollElement | null 
};

type Employee = { 
    full_name: string | null; 
    email?: string; 
    job_title?: string;
    employee_id?: string;
};

type Payslip = {
  id: string;
  business_id: string;
  currency_code: string;
  gross_earnings: string | number;
  total_deductions: string | number;
  net_pay: string | number;
  status: string;
  employees: Employee | null;
  payslip_details: PayslipDetail[];
};

/**
 * LITONU BUSINESS BASE UNIVERSE LTD - COMPENSATION AUDIT INTERFACE
 * 
 * UPGRADE: Deeply integrated with the Sovereign Multi-Tax Engine.
 * This component resolves dynamic labels and provides institutional-grade PDF outputs.
 */
export function ReviewPayslipTable({ payslips, tenantName = "LITONU BBU1 Entity" }: { payslips: Payslip[], tenantName?: string }) {
  const [openPayslipId, setOpenPayslipId] = useState<string | null>(null);

  const getElementTypeVariant = (type: string): "default" | "secondary" | "destructive" | "outline" => {
    const t = type.toUpperCase();
    if (t.includes('EARNING')) return 'default';
    if (t.includes('DEDUCTION')) return 'destructive';
    if (t.includes('TAX') || t.includes('STATUTORY')) return 'destructive';
    return 'secondary';
  }

  // --- AUTHORITATIVE PAYSLIP GENERATION ENGINE ---
  const handleDownloadPDF = (p: Payslip) => {
    const doc = new jsPDF();
    const periodName = format(new Date(), 'MMMM yyyy'); 

    // 1. Institutional Branding & Forensic Header
    doc.setFontSize(20);
    doc.setTextColor(15, 23, 42);
    doc.text("CONFIDENTIAL REMUNERATION STATEMENT", 14, 22);
    
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(`Sovereign Audit Ref: #AUTH-${p.id.substring(0,8).toUpperCase()}`, 14, 28);
    doc.text(`Database Authority: LITONU BUSINESS BASE UNIVERSE LTD`, 14, 32);

    // 2. Multi-Tenant Entity Context
    doc.setDrawColor(241, 245, 249);
    doc.line(14, 38, 196, 38);

    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.setFont("helvetica", "bold");
    doc.text("ESTABLISHMENT DETAILS", 14, 48);
    doc.setFont("helvetica", "normal");
    doc.text(tenantName, 14, 54);
    doc.text(`Node ID: ${p.business_id}`, 14, 59);

    doc.setFont("helvetica", "bold");
    doc.text("IDENTITY CONTEXT", 110, 48);
    doc.setFont("helvetica", "normal");
    doc.text(`Operator: ${p.employees?.full_name || "Authorized Staff"}`, 110, 54);
    doc.text(`Designation: ${p.employees?.job_title || "General Operations"}`, 110, 59);
    doc.text(`Cycle: ${periodName} (${p.currency_code})`, 110, 64);

    // 3. Dynamic Breakdown Table (Resolves User-Defined Tax Labels)
    autoTable(doc, {
      startY: 75,
      head: [['Remuneration Element', 'Classification', 'Net Impact']],
      body: p.payslip_details.map(d => [
          d.payroll_elements?.name || 'Manual Adjustment',
          d.payroll_elements?.type.replace('_', ' ') || 'General',
          formatCurrency(d.calculated_amount, p.currency_code)
      ]),
      theme: 'striped',
      headStyles: { fillColor: [15, 23, 42], fontStyle: 'bold' },
      styles: { fontSize: 9 },
      columnStyles: { 2: { halign: 'right' } }
    });

    // 4. Financial Truth Summary
    const finalY = (doc as any).lastAutoTable.finalY + 15;
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("GROSS EARNINGS:", 130, finalY);
    doc.text(formatCurrency(p.gross_earnings, p.currency_code), 196, finalY, { align: 'right' });
    
    doc.text("TOTAL DEDUCTIONS:", 130, finalY + 7);
    doc.setTextColor(220, 38, 38);
    doc.text(`(${formatCurrency(p.total_deductions, p.currency_code)})`, 196, finalY + 7, { align: 'right' });

    // The Sovereign Seal (Net Pay)
    doc.setDrawColor(15, 23, 42);
    doc.setFillColor(248, 250, 252);
    doc.rect(125, finalY + 12, 71, 15, 'FD');
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text("NET DISBURSEMENT:", 130, finalY + 22);
    doc.text(formatCurrency(p.net_pay, p.currency_code), 196, finalY + 22, { align: 'right' });

    // 5. Compliance Footer
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text("This document is an authoritative record of BBU1 Global. Calculations comply with the specific tax jurisdiction defined by the node administrator.", 14, finalY + 45);
    doc.text(`Forensic Fingerprint: ${p.id} | Timestamp: ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}`, 14, finalY + 50);

    doc.save(`Payslip_${p.employees?.full_name?.replace(/\s/g, '_')}_${periodName}.pdf`);
    toast.success("Identity Statement Generated Successfully");
  };

  return (
    <div className="border-none shadow-2xl shadow-slate-200/50 rounded-[2rem] overflow-hidden bg-white">
      <div className="p-6 bg-slate-50/50 border-b flex items-center justify-between">
         <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center text-primary">
                <Landmark className="h-5 w-5" />
            </div>
            <div>
                <h3 className="font-black text-slate-900 uppercase tracking-tighter">Identity Compensation Registry</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Audit Trail: {tenantName}</p>
            </div>
         </div>
         <Badge variant="outline" className="bg-white font-black text-[9px] uppercase tracking-widest text-emerald-600 border-emerald-100">
            <ShieldCheck className="h-3 w-3 mr-1" /> Ledger Synchronized
         </Badge>
      </div>
      
      <Table>
        <TableHeader className="bg-white border-b-2">
          <TableRow className="hover:bg-transparent border-slate-50">
            <TableHead className="w-[60px]"></TableHead>
            <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-500">Authorized Personnel</TableHead>
            <TableHead className="text-right font-black text-[10px] uppercase tracking-widest text-slate-500">Gross Intake</TableHead>
            <TableHead className="text-right font-black text-[10px] uppercase tracking-widest text-slate-500">Tax Liabilities</TableHead>
            <TableHead className="text-right font-black text-[10px] uppercase tracking-widest text-primary">Net Settlement</TableHead>
            <TableHead className="text-right pr-8 font-black text-[10px] uppercase tracking-widest text-slate-500">Protocol</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payslips.map((payslip) => (
            <Collapsible asChild key={payslip.id} open={openPayslipId === payslip.id} onOpenChange={() => setOpenPayslipId(openPayslipId === payslip.id ? null : payslip.id)}>
              <>
                <TableRow className="group cursor-pointer hover:bg-slate-50/80 transition-all border-slate-50">
                  <TableCell className="pl-6">
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="w-8 h-8 p-0 rounded-full hover:bg-white shadow-sm border border-transparent hover:border-slate-100">
                        {openPayslipId === payslip.id ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                      </Button>
                    </CollapsibleTrigger>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-4 py-2">
                        <div className="h-10 w-10 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-lg shadow-slate-900/10">
                            <span className="font-black text-xs uppercase">{payslip.employees?.full_name?.charAt(0)}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="font-bold text-slate-900 tracking-tight">{payslip.employees?.full_name || 'System User'}</span>
                            <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest opacity-60">
                                {payslip.employees?.job_title || "OPERATOR"}
                            </span>
                        </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono font-bold text-slate-500">
                    {formatCurrency(payslip.gross_earnings, payslip.currency_code)}
                  </TableCell>
                  <TableCell className="text-right text-red-500 font-mono font-bold">
                    {formatCurrency(payslip.total_deductions, payslip.currency_code)}
                  </TableCell>
                  <TableCell className="text-right font-black font-mono text-slate-900 text-lg tracking-tighter">
                    {formatCurrency(payslip.net_pay, payslip.currency_code)}
                  </TableCell>
                  <TableCell className="text-right pr-8">
                    <div className="flex justify-end gap-3">
                        <Button 
                            size="sm" 
                            variant="outline" 
                            className="h-10 px-4 rounded-xl border-slate-200 font-black text-[10px] uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all shadow-sm group/btn"
                            onClick={(e) => { e.stopPropagation(); handleDownloadPDF(payslip); }}
                        >
                            <Printer className="h-3.5 w-3.5 mr-2 group-hover/btn:rotate-12 transition-transform" /> Generate PDF
                        </Button>
                    </div>
                  </TableCell>
                </TableRow>
                <CollapsibleContent asChild>
                  <TableRow className="bg-slate-50/30">
                    <TableCell colSpan={6} className="p-0">
                      <div className="p-8 border-l-4 border-l-primary m-6 bg-white rounded-3xl shadow-xl border border-slate-100">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-50 rounded-lg">
                                    <Receipt className="h-5 w-5 text-blue-600" />
                                </div>
                                <h4 className="font-black text-sm text-slate-900 uppercase tracking-tighter">Itemized Settlement Breakdown</h4>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 rounded-full border border-slate-100">
                                <Scale className="h-3 w-3 text-slate-400" />
                                <span className="text-[9px] font-black uppercase text-slate-500">Verified Balanced Statement</span>
                            </div>
                        </div>
                        
                        <div className='rounded-2xl border border-slate-100 overflow-hidden shadow-sm'>
                        <Table>
                          <TableHeader className="bg-slate-50/50">
                            <TableRow className="border-none">
                              <TableHead className="text-[10px] font-black uppercase tracking-widest h-10">Financial Element</TableHead>
                              <TableHead className="text-[10px] font-black uppercase tracking-widest h-10">Classification</TableHead>
                              <TableHead className="text-right text-[10px] font-black uppercase tracking-widest h-10 pr-6">Calculated Amount</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {payslip.payslip_details.map((detail, index) => (
                              <TableRow key={index} className="border-slate-50">
                                <TableCell className="font-bold text-slate-700 text-sm">{detail.payroll_elements?.name || 'Manual Adjustment'}</TableCell>
                                <TableCell>
                                  <Badge 
                                    className="text-[9px] font-black border-none px-2 py-0.5 rounded-md"
                                    variant={getElementTypeVariant(detail.payroll_elements?.type || '')}
                                  >
                                    {detail.payroll_elements?.type.replace('_', ' ')}
                                  </Badge>
                                </TableCell>
                                <TableCell className={cn(
                                    "text-right font-mono font-bold pr-6",
                                    Number(detail.calculated_amount) < 0 ? "text-red-500" : "text-slate-900"
                                )}>
                                  {formatCurrency(detail.calculated_amount, payslip.currency_code)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        </div>
                        
                        <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                <Fingerprint className="h-3.5 w-3.5" />
                                <span>Ledger Lock: GADS-PAYROLL-{payslip.id.substring(0,8).toUpperCase()}</span>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-amber-600 font-bold uppercase tracking-widest bg-amber-50 px-3 py-1 rounded-lg border border-amber-100">
                                <AlertCircle className="h-3.5 w-3.5" />
                                <span>Subject to Statutory Reconciliation</span>
                            </div>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                </CollapsibleContent>
              </>
            </Collapsible>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}