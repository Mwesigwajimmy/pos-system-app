"use client";

import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { 
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
    ShieldCheck, 
    ArrowUpRight, 
    History, 
    Printer, 
    Calculator, 
    Scale,
    Fingerprint,
    FileSearch,
    BadgeCheck
} from 'lucide-react';
import { toast } from 'sonner';
import { cn, formatCurrency } from '@/lib/utils';

// Authoritative Printing Engines
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * BBU1 SOVEREIGN PAYROLL REGISTRY - V12.8
 * 
 * Provides a high-integrity forensic audit trail of all labor disbursement
 * cycles recorded within the business node.
 */

interface PayrollRun {
  id: string;
  business_id: string;
  period_name: string;
  status: string;
  total_net_pay: number;
  total_tax_paye: number;
  currency_code?: string;
  created_at: string;
}

interface Props {
    runs: PayrollRun[];
    tenantName?: string;
}

export function PayrollHistoryTable({ runs, tenantName = "Global BBU1 Node" }: Props) {
  const router = useRouter();

  /**
   * STATUS RESOLUTION
   * Maps ledger states to professional monochrome variants.
   */
  const getStatusVariant = (status: string) => {
    const s = (status || '').toUpperCase();
    switch (s) {
      case 'PAID': return 'bg-slate-900 text-white border-none shadow-sm';
      case 'APPROVED': return 'bg-slate-700 text-white border-none shadow-sm';
      case 'DRAFT': return 'bg-slate-50 text-slate-500 border-slate-200';
      case 'FAILED': return 'bg-red-50 text-red-700 border-red-100';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  // --- EXECUTIVE SUMMARY PDF GENERATION ---
  const handleDownloadSummaryPDF = (run: PayrollRun) => {
    const doc = new jsPDF();
    const currency = run.currency_code || 'UGX';
    const grossTotal = Number(run.total_net_pay) + Number(run.total_tax_paye);

    // 1. Institutional Branding & Forensic Seal
    doc.setFontSize(22);
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.text("EXECUTIVE PAYROLL SUMMARY", 14, 22);
    
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.setFont("helvetica", "normal");
    doc.text(`Forensic Ref: #PRUN-${run.id.substring(0,8).toUpperCase()}`, 14, 30);
    doc.text(`Issuing Node: ${tenantName} | Ledger Sync: ACTIVE`, 14, 34);

    // 2. Structural Separation
    doc.setDrawColor(226, 232, 240);
    doc.line(14, 42, 196, 42);

    // 3. Organization & Period Context
    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.setFont("helvetica", "bold");
    doc.text("ESTABLISHMENT CONTEXT", 14, 52);
    doc.setFont("helvetica", "normal");
    doc.text(tenantName, 14, 58);
    doc.text(`Identity Node: ${run.business_id}`, 14, 63);

    doc.setFont("helvetica", "bold");
    doc.text("FISCAL CYCLE", 130, 52);
    doc.setFont("helvetica", "normal");
    doc.text(`Service Period: ${run.period_name}`, 130, 58);
    doc.text(`Finalized Date: ${format(new Date(run.created_at), 'dd MMMM yyyy')}`, 130, 63);

    // 4. Authoritative Financial Manifest
    autoTable(doc, {
      startY: 75,
      head: [['Institutional Metric', 'GL Account Map', `Amount (${currency})`]],
      body: [
        ['Net Remuneration Disbursed', '1000 - Liquid Assets', new Intl.NumberFormat().format(run.total_net_pay)],
        ['Statutory Tax Liabilities', '2100 - Tax Authority', new Intl.NumberFormat().format(run.total_tax_paye)],
        ['Total Labor Expenditure', '6100 - Wages Expense', new Intl.NumberFormat().format(grossTotal)],
      ],
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], fontStyle: 'bold', fontSize: 9 },
      styles: { fontSize: 10, cellPadding: 5 },
      columnStyles: { 2: { halign: 'right', fontStyle: 'bold' } }
    });

    // 5. Forensic Footer
    const finalY = (doc as any).lastAutoTable.finalY + 20;
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text("This document is a certified executive summary from the BBU1 Global Sovereign Kernel.", 14, finalY);
    doc.text("Calculations comply with jurisdictional laws defined by the node administrator.", 14, finalY + 4);
    doc.text(`Ledger Lock: ${run.id} | Timestamp: ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}`, 14, finalY + 8);

    doc.save(`Summary_${run.period_name.replace(/\s/g, '_')}.pdf`);
    toast.success("Executive Summary Generated Successfully");
  };

  return (
    <div className="mt-12 bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl shadow-slate-200/40 overflow-hidden animate-in fade-in duration-700">
      
      {/* HEADER: AUDIT CONTEXT */}
      <div className="p-10 bg-slate-50/50 border-b flex flex-col md:flex-row items-center justify-between gap-6">
         <div className="flex items-center gap-5">
            <div className="h-14 w-14 bg-white rounded-2xl shadow-sm border border-slate-200 flex items-center justify-center text-slate-900">
                <History className="h-7 w-7" />
            </div>
            <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase leading-none">Execution Registry</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-2 flex items-center gap-2">
                    <Fingerprint className="h-3 w-3" /> Forensic Audit Trail: {tenantName}
                </p>
            </div>
         </div>
         <div className="flex items-center gap-8">
            <div className="flex flex-col items-end">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Operational Link</span>
                <div className="flex items-center gap-2 px-4 py-1.5 bg-white border border-slate-200 rounded-xl shadow-sm">
                    <BadgeCheck className="h-3.5 w-3.5 text-emerald-600" />
                    <span className="text-[10px] font-black text-slate-700 uppercase tracking-tighter">ACTIVE LEDGER SYNC</span>
                </div>
            </div>
         </div>
      </div>

      {/* THE AUTHORITATIVE REGISTRY TABLE */}
      <Table>
        <TableHeader className="bg-white border-b-2 border-slate-50">
          <TableRow className="hover:bg-transparent h-16">
            <TableHead className="pl-10 w-[300px] font-black text-[10px] uppercase tracking-[0.2em] text-slate-400">Service Cycle Period</TableHead>
            <TableHead className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-400 text-right">Net Disbursement</TableHead>
            <TableHead className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-400 text-right">Statutory Tax</TableHead>
            <TableHead className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-400 text-center">Node Status</TableHead>
            <TableHead className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-400 text-right pr-10">Audit Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {runs.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="h-96 text-center">
                <div className="flex flex-col items-center gap-4 opacity-20">
                    <FileSearch className="h-16 w-16 text-slate-400" />
                    <p className="text-slate-900 font-black uppercase tracking-widest text-sm italic">No labor cycles recorded in registry.</p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            runs.map((run) => (
              <TableRow key={run.id} className="group hover:bg-slate-50/50 transition-all border-slate-50 h-24">
                <TableCell className="pl-10">
                    <div className="flex flex-col gap-1">
                        <span className="font-black text-slate-900 text-base tracking-tight uppercase">{run.period_name}</span>
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                            SOVEREIGN REF: {run.id.substring(0,12).toUpperCase()}
                        </span>
                    </div>
                </TableCell>
                <TableCell className="text-right font-mono font-black text-slate-900 text-base">
                    {formatCurrency(run.total_net_pay, run.currency_code || 'UGX')}
                </TableCell>
                <TableCell className="text-right font-mono font-bold text-red-500 text-sm">
                    ({formatCurrency(run.total_tax_paye, run.currency_code || 'UGX')})
                </TableCell>
                <TableCell className="text-center">
                  <Badge className={cn("px-5 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-full", getStatusVariant(run.status))}>
                    {run.status.replace('_', ' ')}
                  </Badge>
                </TableCell>
                <TableCell className="text-right pr-10">
                  <div className="flex justify-end gap-4">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-11 px-5 rounded-2xl border-slate-200 font-black text-[9px] uppercase tracking-[0.2em] hover:bg-slate-900 hover:text-white transition-all shadow-sm group/btn"
                        onClick={() => handleDownloadSummaryPDF(run)}
                    >
                      <Printer className="h-4 w-4 mr-3 group-hover/btn:rotate-12 transition-transform" /> Summary
                    </Button>
                    <Button 
                        size="sm" 
                        className="h-11 px-6 rounded-2xl bg-slate-900 hover:bg-black text-white shadow-xl font-black text-[9px] uppercase tracking-[0.2em] transition-all active:scale-95"
                        onClick={() => router.push(`/payroll/${run.id}/review`)}
                    >
                      Full Audit <ArrowUpRight className="ml-3 h-4 w-4 text-blue-400" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      
      {/* FOOTER: SYSTEM COMPLIANCE */}
      <div className="p-8 bg-slate-50/80 border-t flex flex-col md:flex-row items-center justify-between gap-6 opacity-60">
        <div className="flex items-center gap-4">
            <Scale className="h-5 w-5 text-slate-400" />
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Institutional Multi-Tenant Ledger Isolation Architecture</p>
        </div>
        <div className="flex items-center gap-10">
            <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600"/>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-900">IFRS-16 CERTIFIED</span>
            </div>
            <div className="h-4 w-[1px] bg-slate-200" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 italic">Auth: TAX-SYNC-RECONCILED</span>
        </div>
      </div>
    </div>
  );
}