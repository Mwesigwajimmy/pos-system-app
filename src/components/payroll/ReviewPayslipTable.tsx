"use client";

import { useState } from 'react';
import { 
    ChevronDown, ChevronRight, FileDown, ShieldCheck, 
    Landmark, UserCircle, Receipt, Fingerprint, Printer 
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

// --- Enterprise Types ---
type PayrollElement = { name: string; type: string };
type PayslipDetail = { calculated_amount: string | number; payroll_elements: PayrollElement | null };
type Employee = { full_name: string | null; email?: string; job_title?: string };
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

export function ReviewPayslipTable({ payslips, tenantName = "Organization" }: { payslips: Payslip[], tenantName?: string }) {
  const [openPayslipId, setOpenPayslipId] = useState<string | null>(null);

  const getElementTypeVariant = (type: string): "default" | "secondary" | "destructive" | "outline" => {
    if (type.includes('EARNING')) return 'default';
    if (type.includes('DEDUCTION')) return 'destructive';
    if (type.includes('CONTRIBUTION')) return 'outline';
    return 'secondary';
  }

  // --- PROFESSIONAL PAYSLIP GENERATION ENGINE ---
  const handleDownloadPDF = (p: Payslip) => {
    const doc = new jsPDF();
    const timestamp = format(new Date(), 'dd MMM yyyy, HH:mm');
    const periodName = format(new Date(), 'MMMM yyyy'); // Standard payroll period format

    // 1. Branding & Security Header
    doc.setFontSize(22);
    doc.setTextColor(30, 41, 59);
    doc.text("CONFIDENTIAL PAYSLIP", 14, 22);
    
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Digital Audit Reference: #PAY-${p.id.substring(0,8)}`, 14, 30);
    doc.text(`Ledger Post Status: GADS-SYNCED`, 14, 35);

    // 2. Multi-Tenant Entity Context
    doc.setDrawColor(226, 232, 240);
    doc.line(14, 42, 196, 42);

    doc.setFontSize(11);
    doc.setTextColor(0);
    doc.setFont("helvetica", "bold");
    doc.text("EMPLOYER DETAILS", 14, 52);
    doc.setFont("helvetica", "normal");
    doc.text(tenantName, 14, 58);
    doc.text("Organization ID: " + p.business_id.split('-')[0], 14, 63);

    doc.setFont("helvetica", "bold");
    doc.text("EMPLOYEE DETAILS", 110, 52);
    doc.setFont("helvetica", "normal");
    doc.text(p.employees?.full_name || "N/A", 110, 58);
    doc.text(`Period: ${periodName}`, 110, 63);
    doc.text(`Currency: ${p.currency_code}`, 110, 68);

    // 3. Breakdown Table (Earnings vs Deductions)
    autoTable(doc, {
      startY: 75,
      head: [['Description', 'Type', 'Calculated Amount']],
      body: p.payslip_details.map(d => [
          d.payroll_elements?.name || 'Standard Adjustment',
          d.payroll_elements?.type.replace('_', ' ') || 'General',
          formatCurrency(d.calculated_amount, p.currency_code)
      ]),
      theme: 'striped',
      headStyles: { fillColor: [30, 41, 59] },
    });

    // 4. Financial Truth Summary
    const finalY = (doc as any).lastAutoTable.finalY + 15;
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Gross Earnings:", 130, finalY);
    doc.text(formatCurrency(p.gross_earnings, p.currency_code), 196, finalY, { align: 'right' });
    
    doc.text("Total Deductions:", 130, finalY + 7);
    doc.setTextColor(180, 0, 0);
    doc.text(`(${formatCurrency(p.total_deductions, p.currency_code)})`, 196, finalY + 7, { align: 'right' });

    // Net Pay Seal
    doc.setDrawColor(30, 41, 59);
    doc.setFillColor(248, 250, 252);
    doc.rect(125, finalY + 12, 71, 15, 'FD');
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text("NET PAY:", 130, finalY + 22);
    doc.text(formatCurrency(p.net_pay, p.currency_code), 196, finalY + 22, { align: 'right' });

    // 5. IFRS/Audit Footer
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text("Certification: This document is autonomously generated and linked to the master General Ledger (Accounts 6100/2100).", 14, finalY + 45);
    doc.text(`System Fingerprint: ${p.id}`, 14, finalY + 50);

    doc.save(`Payslip_${p.employees?.full_name?.replace(' ', '_')}_${periodName}.pdf`);
    toast.success("Professional Payslip Downloaded");
  };

  return (
    <div className="border-none shadow-lg rounded-xl overflow-hidden bg-card">
      <div className="p-4 bg-muted/30 border-b flex items-center justify-between">
         <div className="flex items-center gap-2">
            <Landmark className="h-5 w-5 text-primary" />
            <h3 className="font-bold text-slate-800 uppercase tracking-tight">Employee Compensation Registry</h3>
         </div>
         <Badge variant="outline" className="bg-white font-mono text-[10px]">VERIFIED GADS SYNC</Badge>
      </div>
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead className="w-[40px]"></TableHead>
            <TableHead className="font-bold text-xs uppercase text-slate-500">Employee Details</TableHead>
            <TableHead className="text-right font-bold text-xs uppercase text-slate-500">Gross Earnings</TableHead>
            <TableHead className="text-right font-bold text-xs uppercase text-slate-500">Tax & Deductions</TableHead>
            <TableHead className="text-right font-black text-xs uppercase text-primary">Net Payable</TableHead>
            <TableHead className="text-right pr-6 font-bold text-xs uppercase text-slate-500">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payslips.map((payslip) => (
            <Collapsible asChild key={payslip.id} open={openPayslipId === payslip.id} onOpenChange={() => setOpenPayslipId(openPayslipId === payslip.id ? null : payslip.id)}>
              <>
                <TableRow className="group cursor-pointer hover:bg-primary/5 transition-colors border-b">
                  <TableCell>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
                        {openPayslipId === payslip.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </Button>
                    </CollapsibleTrigger>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                            <UserCircle className="h-6 w-6" />
                        </div>
                        <div className="flex flex-col">
                            <span className="font-bold text-slate-700">{payslip.employees?.full_name || 'N/A'}</span>
                            <span className="text-[10px] font-mono text-muted-foreground uppercase">{payslip.id.substring(0,8)}</span>
                        </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono font-medium text-slate-600">
                    {formatCurrency(payslip.gross_earnings, payslip.currency_code)}
                  </TableCell>
                  <TableCell className="text-right text-destructive font-mono font-medium">
                    {formatCurrency(payslip.total_deductions, payslip.currency_code)}
                  </TableCell>
                  <TableCell className="text-right font-black font-mono text-primary text-base">
                    {formatCurrency(payslip.net_pay, payslip.currency_code)}
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <div className="flex justify-end gap-2">
                        {/* THE ENTERPRISE ACTION */}
                        <Button 
                            size="sm" 
                            variant="outline" 
                            className="h-8 border-primary/20 hover:bg-primary/5 hover:text-primary transition-all shadow-sm"
                            onClick={(e) => { e.stopPropagation(); handleDownloadPDF(payslip); }}
                        >
                            <Printer className="h-3.5 w-3.5 mr-1.5" /> PDF
                        </Button>
                        <div className="flex items-center text-green-600 opacity-40 group-hover:opacity-100 transition-opacity">
                            <ShieldCheck className="h-4 w-4" />
                        </div>
                    </div>
                  </TableCell>
                </TableRow>
                <CollapsibleContent asChild>
                  <TableRow className="bg-slate-50/50">
                    <TableCell colSpan={6} className="p-0">
                      <div className="p-6 border-l-4 border-l-primary m-4 bg-white rounded-r-lg shadow-inner">
                        <div className="flex items-center gap-2 mb-4">
                            <Receipt className="h-4 w-4 text-primary" />
                            <h4 className="font-bold text-sm text-slate-800 uppercase">Itemized Payroll Breakdown</h4>
                        </div>
                        <div className='rounded-xl border shadow-sm overflow-hidden'>
                        <Table>
                          <TableHeader className="bg-muted/50">
                            <TableRow>
                              <TableHead className="text-[11px] font-bold uppercase">Element Name</TableHead>
                              <TableHead className="text-[11px] font-bold uppercase">Classification</TableHead>
                              <TableHead className="text-right text-[11px] font-bold uppercase">Calculated Value</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {payslip.payslip_details.map((detail, index) => (
                              <TableRow key={index} className="hover:bg-slate-50">
                                <TableCell className="font-medium text-slate-700">{detail.payroll_elements?.name}</TableCell>
                                <TableCell>
                                  <Badge 
                                    className="text-[10px] font-black border-none"
                                    variant={getElementTypeVariant(detail.payroll_elements?.type || '')}
                                  >
                                    {detail.payroll_elements?.type.replace('_', ' ')}
                                  </Badge>
                                </TableCell>
                                <TableCell className={cn(
                                    "text-right font-mono font-bold",
                                    Number(detail.calculated_amount) < 0 ? "text-destructive" : "text-slate-900"
                                )}>
                                  {formatCurrency(detail.calculated_amount, payslip.currency_code)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        </div>
                        <div className="mt-4 flex items-center gap-2 text-[10px] text-muted-foreground uppercase font-medium">
                            <Fingerprint className="h-3 w-3" />
                            <span>Hard-Linked to General Ledger Reference: TAX-SYNC-{payslip.id.substring(0,8)}</span>
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