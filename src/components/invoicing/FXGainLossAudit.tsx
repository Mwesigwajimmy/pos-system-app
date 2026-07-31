'use client';

import React from 'react';
import { TrendingUp, RefreshCw, Download, AlertTriangle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface AuditRow {
  invoice_ref: string;
  invoice_ccy: string;
  reporting_ccy: string;
  rate_at_issue: number;
  current_mkt_rate: number;
  variance_per_unit: number;
  unrealized_gain_loss: number;
}

interface ComponentProps {
  auditData: AuditRow[];
  totalGain: number;
  homeCurrency?: string | null;
}

export default function FXGainLossAudit({ auditData, totalGain, homeCurrency }: ComponentProps) {

  // Guards against an Intl.NumberFormat crash if currency isn't set on the business profile
  const isValidCurrency = homeCurrency && homeCurrency.length === 3;

  if (!isValidCurrency) {
    return (
      <div className="p-10 border border-dashed border-slate-200 rounded-lg bg-slate-50 text-center">
        <AlertTriangle className="mx-auto text-amber-500 mb-3" size={32} />
        <h2 className="text-base font-semibold text-slate-900">Currency not configured</h2>
        <p className="text-slate-500 text-sm mt-1.5">
          Set a reporting currency in your business settings to enable this report.
        </p>
      </div>
    );
  }

  const fmt = (val: number) => new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: homeCurrency!,
    signDisplay: 'always'
  }).format(val);

  const downloadPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("FX Gain/Loss Audit", 14, 22);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);

    autoTable(doc, {
      startY: 45,
      head: [['Reference', 'Issue rate', 'Market rate', 'Variance']],
      body: auditData.map(r => [
        r.invoice_ref,
        `1 ${r.invoice_ccy} = ${r.rate_at_issue} ${homeCurrency}`,
        `1 ${r.invoice_ccy} = ${r.current_mkt_rate} ${homeCurrency}`,
        `${r.unrealized_gain_loss >= 0 ? '+' : ''}${r.variance_per_unit.toFixed(2)}`
      ]),
      headStyles: { fillColor: [30, 41, 59] }
    });
    doc.save(`fx-audit-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <div className="p-6 md:p-8 space-y-6 bg-white rounded-lg border border-slate-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div>
          <p className="text-xs text-slate-500 mb-1">Exchange rate analytics</p>
          <h1 className="text-xl font-semibold text-slate-900">
            Currency valuation audit
          </h1>
        </div>
        <Button
          onClick={downloadPDF}
          variant="outline"
          className="hidden sm:flex items-center gap-2 border-slate-200 text-slate-600 hover:bg-slate-50 text-sm h-9 px-4"
        >
          <Download size={14} /> Download report
        </Button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 bg-emerald-50 rounded-lg border border-emerald-100 flex justify-between items-center">
          <div>
            <p className="text-xs font-medium text-emerald-700">Unrealized gain</p>
            <p className="text-xl font-semibold text-slate-900 mt-1">{fmt(totalGain)}</p>
          </div>
          <TrendingUp className="text-emerald-500" size={22} />
        </div>

        <div className="p-5 bg-slate-50 rounded-lg border border-slate-200 flex justify-between items-center">
          <div>
            <p className="text-xs font-medium text-slate-500">Market rate</p>
            <p className="text-xl font-semibold text-slate-900 mt-1">Synced</p>
          </div>
          <RefreshCw className="text-slate-400" size={22} />
        </div>
      </div>

      {/* Variance table */}
      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow className="border-none">
              <TableHead className="text-xs font-medium text-slate-500 py-3 pl-6">Reference</TableHead>
              <TableHead className="text-xs font-medium text-slate-500">Rate at issue</TableHead>
              <TableHead className="text-xs font-medium text-slate-500">Current rate</TableHead>
              <TableHead className="text-xs font-medium text-slate-500 text-right pr-6">Net variance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {auditData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-10 text-slate-400 text-sm">No currency variance detected.</TableCell>
              </TableRow>
            ) : (
              auditData.map((row) => (
                <TableRow key={row.invoice_ref} className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors">
                  <TableCell className="font-medium text-sm pl-6 py-4">{row.invoice_ref}</TableCell>
                  <TableCell className="text-sm text-slate-600">
                    1 {row.invoice_ccy} = {row.rate_at_issue.toLocaleString()} {homeCurrency}
                  </TableCell>
                  <TableCell className="text-sm text-slate-600">
                    1 {row.invoice_ccy} = {row.current_mkt_rate.toLocaleString()} {homeCurrency}
                  </TableCell>
                  <TableCell className={`text-right pr-6 font-medium text-sm ${row.unrealized_gain_loss >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {row.unrealized_gain_loss >= 0 ? '+' : ''}{row.variance_per_unit.toFixed(2)} / {row.invoice_ccy}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Note */}
      <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
        <p className="text-xs font-medium text-blue-700 mb-1">Note</p>
        <p className="text-sm text-blue-800 leading-relaxed">
          Outstanding balances in foreign currencies are revalued against your {homeCurrency} reporting rate.
        </p>
      </div>
    </div>
  );
}