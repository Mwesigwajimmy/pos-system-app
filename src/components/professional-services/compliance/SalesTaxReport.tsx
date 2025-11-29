'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { Download, TrendingUp, Info, DollarSign, FileText } from 'lucide-react';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable'; // Correct import for v3.5+
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// --- Types ---
export interface TaxSummary {
  total_revenue: number;
  total_taxable_revenue: number;
  total_tax_collected: number;
  tax_jurisdiction: string;
}

export interface TaxableTransaction {
  id: string;
  date: string;
  description: string;
  invoice_id: string;
  taxable_amount: number;
  tax_collected: number;
}

// --- Utils ---
const formatMoney = (amount: number, currency = 'USD') => 
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);

// --- Sub-Component: Details Modal ---
const TransactionDetailModal = ({
  isOpen,
  onClose,
  transactions,
  currency
}: {
  isOpen: boolean;
  onClose: () => void;
  transactions: TaxableTransaction[];
  currency: string;
}) => (
  <Dialog open={isOpen} onOpenChange={onClose}>
    <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600"/> Taxable Transactions
        </DialogTitle>
      </DialogHeader>
      <div className="flex-1 overflow-y-auto border rounded-md">
        <Table>
          <TableHeader className="bg-slate-50 sticky top-0">
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Invoice ID</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Taxable Amount</TableHead>
              <TableHead className="text-right">Tax Collected</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.length > 0 ? (
              transactions.map(txn => (
                <TableRow key={txn.id}>
                  <TableCell className="text-xs">{format(new Date(txn.date), 'PP')}</TableCell>
                  <TableCell className="font-mono text-xs">{txn.invoice_id}</TableCell>
                  <TableCell className="text-sm truncate max-w-[200px]">{txn.description}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{formatMoney(txn.taxable_amount, currency)}</TableCell>
                  <TableCell className="text-right font-mono text-sm font-semibold text-red-600">{formatMoney(txn.tax_collected, currency)}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">No transactions found.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </DialogContent>
  </Dialog>
);

// --- Main Component ---
export function SalesTaxReport({
  summary,
  transactions,
  reportPeriod,
  currency = 'USD'
}: {
  summary: TaxSummary;
  transactions: TaxableTransaction[];
  reportPeriod: string;
  currency?: string;
}) {
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  // Metrics
  const nonTaxableRevenue = summary.total_revenue - summary.total_taxable_revenue;
  const effectiveTaxRate = summary.total_taxable_revenue > 0 ? (summary.total_tax_collected / summary.total_taxable_revenue) * 100 : 0;
  
  // Chart Data
  const compositionData = [
    { name: 'Taxable Revenue', value: summary.total_taxable_revenue },
    { name: 'Non-Taxable', value: nonTaxableRevenue },
  ];
  const COLORS = ['#10b981', '#cbd5e1']; // Emerald-500, Slate-300

  // Aggregate daily trend
  const trendDataMap = transactions.reduce((acc, txn) => {
    const date = format(new Date(txn.date), 'yyyy-MM-dd');
    if (!acc[date]) acc[date] = { date, tax_collected: 0, taxable_amount: 0 };
    acc[date].tax_collected += txn.tax_collected;
    acc[date].taxable_amount += txn.taxable_amount;
    return acc;
  }, {} as Record<string, { date: string, tax_collected: number, taxable_amount: number }>);
  
  const sortedTrendData = Object.values(trendDataMap).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // PDF Export
  const handleExport = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(18);
    doc.text("Sales Tax Liability Report", 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Period: ${reportPeriod}`, 14, 28);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 33);
    doc.text(`Jurisdiction: ${summary.tax_jurisdiction}`, 14, 38);

    // Summary Table
    autoTable(doc, {
      startY: 45,
      head: [['Metric', 'Amount']],
      body: [
        ['Total Revenue', formatMoney(summary.total_revenue, currency)],
        ['Taxable Revenue', formatMoney(summary.total_taxable_revenue, currency)],
        ['Total Tax Collected', formatMoney(summary.total_tax_collected, currency)],
        ['Effective Rate', `${effectiveTaxRate.toFixed(2)}%`]
      ],
      theme: 'striped',
      headStyles: { fillColor: [41, 128, 185] }
    });

    // Transactions Table
    doc.text("Transaction Details", 14, (doc as any).lastAutoTable.finalY + 15);
    
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 20,
      head: [['Date', 'Invoice', 'Description', 'Taxable Amt', 'Tax']],
      body: transactions.map(t => [
        format(new Date(t.date), 'MMM d, yyyy'),
        t.invoice_id,
        t.description,
        formatMoney(t.taxable_amount, currency),
        formatMoney(t.tax_collected, currency)
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [52, 73, 94] }
    });

    doc.save(`Sales_Tax_Report_${reportPeriod.replace(/\s/g, '_')}.pdf`);
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* KPI Cards */}
        <Card className="border-t-4 border-t-emerald-500 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Total Tax Liability</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{formatMoney(summary.total_tax_collected, currency)}</div>
            <p className="text-xs text-muted-foreground mt-1">Collected for {summary.tax_jurisdiction}</p>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-blue-500 shadow-sm cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => setIsModalOpen(true)}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Taxable Basis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{formatMoney(summary.total_taxable_revenue, currency)}</div>
            <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
              View {transactions.length} Transactions <TrendingUp className="w-3 h-3"/>
            </p>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-slate-500 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex justify-between">
              Effective Rate
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger><Info className="h-4 w-4 text-slate-400"/></TooltipTrigger>
                  <TooltipContent>Tax Collected / Taxable Revenue</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{effectiveTaxRate.toFixed(2)}%</div>
            <p className="text-xs text-muted-foreground mt-1">Average tax rate applied</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bar Chart */}
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader>
            <CardTitle>Daily Collection Trend</CardTitle>
            <CardDescription>Tax collected over time for the selected period.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sortedTrendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(tick) => format(new Date(tick), 'MMM d')} 
                  tick={{fontSize: 12, fill: '#64748b'}}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  tickFormatter={(tick) => `$${tick}`} 
                  tick={{fontSize: 12, fill: '#64748b'}}
                  axisLine={false}
                  tickLine={false}
                />
                <RechartsTooltip 
                  formatter={(value: number) => [formatMoney(value, currency), 'Tax Collected']}
                  contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                />
                <Bar dataKey="tax_collected" fill="#0f172a" radius={[4, 4, 0, 0]} name="Tax Collected" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pie Chart */}
        <Card className="lg:col-span-1 shadow-sm">
          <CardHeader>
            <CardTitle>Revenue Mix</CardTitle>
            <CardDescription>Taxable vs Exempt Revenue</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={compositionData} 
                  cx="50%" 
                  cy="50%" 
                  innerRadius={60} 
                  outerRadius={80} 
                  paddingAngle={2} 
                  dataKey="value"
                >
                  {compositionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip formatter={(value: number) => formatMoney(value, currency)} />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end mt-6">
        <Button onClick={handleExport} className="bg-slate-900 hover:bg-slate-800">
          <Download className="mr-2 h-4 w-4" /> Download Official PDF Report
        </Button>
      </div>

      <TransactionDetailModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        transactions={transactions}
        currency={currency}
      />
    </>
  );
}