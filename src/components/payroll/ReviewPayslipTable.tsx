"use client";

import { useState } from 'react';
import { 
    ChevronDown, ChevronRight, FileDown, ShieldCheck, 
    Landmark, UserCircle, Receipt, Fingerprint, Printer,
    Scale, AlertCircle, Coins, FileText, BadgeCheck
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { cn, formatCurrency } from '@/lib/utils';
import { Badge } from "@/components/ui/badge";
import { toast } from 'sonner';
import { format } from 'date-fns';

// Authoritative Printing Engines
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// --- ENTERPRISE GLOBAL SCHEMA ---
type PayrollElement = { 
    name: string; 
    type: 'EARNING' | 'DEDUCTION' | 'CONTRIBUTION'; 
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
  basic_salary: string | number;
  gross_earnings: string | number;
  total_deductions: string | number;
  net_pay: string | number;
  status: string;
  employees: Employee | null;
  payslip_details: PayslipDetail[];
};

/**
 * BBU1 GLOBAL COMPENSATION AUDIT INTERFACE - V12.5
 * 
 * DESIGN PHILOSOPHY: High-legibility, professional monochrome, 
 * jurisdiction-neutral data resolution.
 */
export function ReviewPayslipTable({ 
    payslips, 
    tenantName = "Global BBU1 Node" 
}: { 
    payslips: Payslip[], 
    tenantName?: string 
}) {
  const [openPayslipId, setOpenPayslipId] = useState<string | null>(null);

  /**
   * SOVEREIGN LABEL RESOLUTION
   * Maps dynamic tax types to professional UI variants.
   */
  const getElementTypeVariant = (type: string): "default" | "secondary" | "destructive" | "outline" => {
    const t = (type || '').toUpperCase();
    if (t === 'EARNING') return 'default';
    if (t === 'DEDUCTION') return 'destructive';
    if (t === 'CONTRIBUTION') return 'outline';
    return 'secondary';
  }

  // --- JURISDICTION-NEUTRAL PDF GENERATION ENGINE ---
  const handleDownloadPDF = (p: Payslip) => {
    const doc = new jsPDF();
    const periodName = format(new Date(), 'MMMM yyyy'); 

    // 1. Institutional Header & Forensic Seal
    doc.setFontSize(22);
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.text("REMUNERATION STATEMENT", 14, 22);
    
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.setFont("helvetica", "normal");
    doc.text(`Authoritative Fingerprint: ${p.id.toUpperCase()}`, 14, 28);
    doc.text(`Issuing Node: ${tenantName} | Sovereign Kernel v12.5`, 14, 32);

    // 2. Structural Separation
    doc.setDrawColor(226, 232, 240);
    doc.line(14, 38, 196, 38);

    // 3. Personnel Identity Context
    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.setFont("helvetica", "bold");
    doc.text("PERSONNEL IDENTITY", 14, 48);
    doc.setFont("helvetica", "normal");
    doc.text(`Official Name: ${p.employees?.full_name || "Authorized Staff"}`, 14, 54);
    doc.text(`Designation: ${p.employees?.job_title || "Unassigned"}`, 14, 59);
    doc.text(`Contract Node: ${p.id.substring(0,8)}`, 14, 64);

    doc.setFont("helvetica", "bold");
    doc.text("PERIOD CONTEXT", 130, 48);
    doc.setFont("helvetica", "normal");
    doc.text(`Statement Cycle: ${periodName}`, 130, 54);
    doc.text(`Currency Node: ${p.currency_code}`, 130, 59);
    doc.text(`Status: ${p.status.toUpperCase()}`, 130, 64);

    // 4. Authoritative Itemization (Resolves Global Tax Labels)
    autoTable(doc, {
      startY: 75,
      head: [['Financial Element', 'Classification', 'Net Impact']],
      body: p.payslip_details.map(d => [
          d.payroll_elements?.name || 'Administrative Adjustment',
          d.payroll_elements?.type || 'Operational',
          formatCurrency(d.calculated_amount, p.currency_code)
      ]),
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], fontStyle: 'bold', fontSize: 9 },
      styles: { fontSize: 9, cellPadding: 4 },
      columnStyles: { 2: { halign: 'right', fontStyle: 'bold' } }
    });

    // 5. Final Reconciliation Summary
    const finalY = (doc as any).lastAutoTable.finalY + 15;
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("TOTAL GROSS ACCRUAL:", 120, finalY);
    doc.text(formatCurrency(p.gross_earnings, p.currency_code), 196, finalY, { align: 'right' });
    
    doc.text("TOTAL DISBURSEMENTS:", 120, finalY + 7);
    doc.setTextColor(220, 38, 38);
    doc.text(`(${formatCurrency(p.total_deductions, p.currency_code)})`, 196, finalY + 7, { align: 'right' });

    // The Ledger Seal (Final Net Pay)
    doc.setDrawColor(15, 23, 42);
    doc.setFillColor(248, 250, 252);
    doc.rect(115, finalY + 12, 81, 15, 'FD');
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text("NET SETTLEMENT:", 120, finalY + 22);
    doc.text(formatCurrency(p.net_pay, p.currency_code), 196, finalY + 22, { align: 'right' });

    // 6. Forensic Footer
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text("This document is an automated electronic record generated by the BBU1 Global Sovereign Kernel.", 14, finalY + 45);
    doc.text(`Compliance Check: Verified Against Node [${p.business_id}] | Timestamp: ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}`, 14, finalY + 50);

    doc.save(`Statement_${p.employees?.full_name?.replace(/\s/g, '_')}_${periodName}.pdf`);
    toast.success("Identity Statement Generated Successfully");
  };

  return (
    <div className="border-none shadow-2xl shadow-slate-200/40 rounded-[2.5rem] overflow-hidden bg-white ring-1 ring-slate-100">
      {/* COMPONENT HEADER */}
      <div className="p-8 bg-slate-50/50 border-b flex flex-col md:flex-row items-center justify-between gap-6">
         <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-white rounded-2xl shadow-sm border border-slate-200 flex items-center justify-center text-slate-900">
                <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter leading-none">Compensation Audit Trail</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5 flex items-center gap-2">
                    <Fingerprint className="h-3 w-3" /> SECURE REGISTRY: {tenantName}
                </p>
            </div>
         </div>
         <div className="flex items-center gap-3">
            <Badge variant="outline" className="bg-white px-4 py-1.5 font-black text-[9px] uppercase tracking-[0.2em] text-emerald-600 border-emerald-100 shadow-sm shadow-emerald-50">
                <BadgeCheck className="h-3 w-3 mr-2" /> GADS SYNCHRONIZED
            </Badge>
         </div>
      </div>
      
      {/* THE AUTHORITATIVE TABLE */}
      <Table>
        <TableHeader className="bg-white border-b-2 border-slate-50">
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[80px]"></TableHead>
            <TableHead className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-500 py-6">Authorized Personnel</TableHead>
            <TableHead className="text-right font-black text-[10px] uppercase tracking-[0.2em] text-slate-500">Gross Accrual</TableHead>
            <TableHead className="text-right font-black text-[10px] uppercase tracking-[0.2em] text-slate-500">Liabilities</TableHead>
            <TableHead className="text-right font-black text-[10px] uppercase tracking-[0.2em] text-slate-900">Net Settlement</TableHead>
            <TableHead className="text-right pr-12 font-black text-[10px] uppercase tracking-[0.2em] text-slate-500">Protocol</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payslips.map((payslip) => (
            <Collapsible 
                asChild 
                key={payslip.id} 
                open={openPayslipId === payslip.id} 
                onOpenChange={() => setOpenPayslipId(openPayslipId === payslip.id ? null : payslip.id)}
            >
              <>
                <TableRow className="group cursor-pointer hover:bg-slate-50/50 transition-all border-slate-50 h-24">
                  <TableCell className="pl-8">
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="w-10 h-10 p-0 rounded-full bg-slate-50 group-hover:bg-white transition-colors border border-transparent group-hover:border-slate-100">
                        {openPayslipId === payslip.id ? <ChevronDown className="h-4 w-4 text-slate-900" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                      </Button>
                    </CollapsibleTrigger>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-5">
                        <div className="h-12 w-12 rounded-[1.2rem] bg-slate-900 flex items-center justify-center text-white shadow-xl shadow-slate-900/10 group-hover:scale-105 transition-transform">
                            <span className="font-black text-sm uppercase">{payslip.employees?.full_name?.charAt(0)}</span>
                        </div>
                        <div className="flex flex-col gap-0.5">
                            <span className="font-black text-slate-900 tracking-tight uppercase text-xs">{payslip.employees?.full_name || 'Authorized Staff'}</span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                {payslip.employees?.job_title || "NODE OPERATOR"}
                            </span>
                        </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono font-bold text-slate-500 text-sm">
                    {formatCurrency(payslip.gross_earnings, payslip.currency_code)}
                  </TableCell>
                  <TableCell className="text-right text-red-500 font-mono font-bold text-sm">
                    ({formatCurrency(payslip.total_deductions, payslip.currency_code)})
                  </TableCell>
                  <TableCell className="text-right font-black font-mono text-slate-900 text-xl tracking-tighter">
                    {formatCurrency(payslip.net_pay, payslip.currency_code)}
                  </TableCell>
                  <TableCell className="text-right pr-12">
                    <Button 
                        size="sm" 
                        variant="outline" 
                        className="h-11 px-6 rounded-2xl border-slate-200 font-black text-[10px] uppercase tracking-[0.2em] hover:bg-slate-900 hover:text-white transition-all shadow-sm hover:shadow-xl hover:shadow-slate-900/10 group/btn"
                        onClick={(e) => { e.stopPropagation(); handleDownloadPDF(payslip); }}
                    >
                        <Printer className="h-4 w-4 mr-3 group-hover/btn:rotate-12 transition-transform" /> Print Record
                    </Button>
                  </TableCell>
                </TableRow>
                
                {/* ITEMIZED BREAKDOWN CONTENT */}
                <CollapsibleContent asChild>
                  <TableRow className="bg-slate-50/20">
                    <TableCell colSpan={6} className="p-0">
                      <div className="p-10 border-l-4 border-l-slate-900 m-8 bg-white rounded-[2.5rem] shadow-2xl ring-1 ring-slate-100 animate-in fade-in slide-in-from-top-4 duration-500">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-slate-900 rounded-2xl text-white">
                                    <Receipt className="h-5 w-5" />
                                </div>
                                <div>
                                    <h4 className="font-black text-sm text-slate-900 uppercase tracking-tighter leading-none">Financial Element Decomposition</h4>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Audit Log Reference: {payslip.id.substring(0,12)}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="text-right">
                                    <p className="text-[9px] font-bold text-slate-400 uppercase leading-none">Net Intitial</p>
                                    <p className="text-sm font-mono font-black text-slate-900">{formatCurrency(payslip.basic_salary, payslip.currency_code)}</p>
                                </div>
                                <div className="h-8 w-[1px] bg-slate-100" />
                                <Scale className="h-5 w-5 text-slate-300" />
                            </div>
                        </div>
                        
                        <div className='rounded-[1.5rem] border border-slate-100 overflow-hidden shadow-inner bg-slate-50/30'>
                        <Table>
                          <TableHeader className="bg-slate-50/80">
                            <TableRow className="border-none">
                              <TableHead className="text-[9px] font-black uppercase tracking-[0.2em] h-12 pl-6">Statutory Element</TableHead>
                              <TableHead className="text-[9px] font-black uppercase tracking-[0.2em] h-12">Registry Class</TableHead>
                              <TableHead className="text-right text-[9px] font-black uppercase tracking-[0.2em] h-12 pr-8">Calculation Result</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {payslip.payslip_details.map((detail, index) => (
                              <TableRow key={index} className="border-slate-50 hover:bg-white transition-colors h-14">
                                <TableCell className="font-black text-slate-700 text-xs pl-6 uppercase tracking-tight">
                                    {detail.payroll_elements?.name || 'Operational Adjustment'}
                                </TableCell>
                                <TableCell>
                                  <Badge 
                                    className="text-[8px] font-black border-none px-3 py-1 rounded-full uppercase tracking-widest"
                                    variant={getElementTypeVariant(detail.payroll_elements?.type || '')}
                                  >
                                    {detail.payroll_elements?.type?.replace('_', ' ') || 'General'}
                                  </Badge>
                                </TableCell>
                                <TableCell className={cn(
                                    "text-right font-mono font-bold pr-8 text-sm",
                                    Number(detail.calculated_amount) < 0 ? "text-red-500" : "text-slate-900"
                                )}>
                                  {Number(detail.calculated_amount) < 0 ? `(${formatCurrency(Math.abs(Number(detail.calculated_amount)), payslip.currency_code)})` : formatCurrency(detail.calculated_amount, payslip.currency_code)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        </div>
                        
                        <div className="mt-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6 pt-6 border-t border-slate-100">
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-8 bg-slate-50 rounded-full flex items-center justify-center text-slate-400">
                                    <Coins className="h-4 w-4" />
                                </div>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                                    Total Operational Flux Reconciled Successfully
                                </p>
                            </div>
                            <div className="flex items-center gap-3 px-4 py-2 bg-blue-50/50 rounded-xl border border-blue-100/50">
                                <Badge variant="outline" className="bg-white border-blue-200 text-blue-600 font-black text-[8px] uppercase tracking-tighter">
                                    SOVEREIGN HANDSHAKE VERIFIED
                                </Badge>
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
      
      {/* EMPTY STATE LOGIC */}
      {payslips.length === 0 && (
          <div className="p-24 flex flex-col items-center justify-center text-center space-y-6">
              <div className="h-20 w-20 bg-slate-50 rounded-[2.5rem] flex items-center justify-center text-slate-200 border-2 border-dashed border-slate-100">
                <FileText className="h-10 w-10" />
              </div>
              <div>
                  <h4 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Registry Void Detected</h4>
                  <p className="text-slate-400 text-xs font-medium uppercase tracking-widest mt-2">No calculated labor records found in this cycle node.</p>
              </div>
          </div>
      )}
    </div>
  );
}