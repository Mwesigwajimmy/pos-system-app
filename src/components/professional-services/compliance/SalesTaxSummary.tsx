'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from '@/lib/utils';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, TrendingUp, Info } from 'lucide-react';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// --- TS Fix for jspdf-autotable plugin ---
// This is the FIX for 'Property autoTable does not exist on type jsPDF'
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => void;
    // To suppress any deeper issues, sometimes you need to declare the return type 
    // of the doc object's methods as an object/class, though void is usually enough 
    // for this type of patching
    lastAutoTable: { finalY: number }; 
  }
}
// ------------------------------------------

// --- TYPE DEFINITIONS ---
export interface TaxSummary {
  total_revenue: number;
  total_taxable_revenue: number;
  total_tax_collected: number;
}

export interface TaxableTransaction {
  id: string;
  date: string;
  description: string;
  invoice_id: string;
  taxable_amount: number;
  tax_collected: number;
}

// --- SUB-COMPONENTS ---
const TransactionDetailModal = ({
  isOpen,
  onClose,
  title,
  transactions,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  transactions: TaxableTransaction[];
}) => (
  <Dialog open={isOpen} onOpenChange={onClose}>
    <DialogContent className="sm:max-w-4xl">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>
      <div className="max-h-[70vh] overflow-y-auto">
        <Table>
          <TableHeader>
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
                  <TableCell>{format(new Date(txn.date), 'PP')}</TableCell>
                  <TableCell>{txn.invoice_id}</TableCell>
                  <TableCell>{txn.description}</TableCell>
                  <TableCell className="text-right">{formatCurrency(txn.taxable_amount, 'USD')}</TableCell>
                  <TableCell className="text-right font-semibold">{formatCurrency(txn.tax_collected, 'USD')}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-24">No transactions found.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </DialogContent>
  </Dialog>
);

// --- MAIN REVOLUTIONARY COMPONENT ---
export function RevolutionarySalesTaxDashboard({
  summary,
  transactions,
  reportPeriod,
}: {
  summary: TaxSummary;
  transactions: TaxableTransaction[];
  reportPeriod: string;
}) {
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  // --- Data Processing for Charts & Insights ---
  const nonTaxableRevenue = summary.total_revenue - summary.total_taxable_revenue;
  const effectiveTaxRate = summary.total_taxable_revenue > 0 ? (summary.total_tax_collected / summary.total_taxable_revenue) * 100 : 0;
  
  const compositionData = [
    { name: 'Taxable Revenue', value: summary.total_taxable_revenue },
    { name: 'Non-Taxable Revenue', value: nonTaxableRevenue },
  ];
  const COLORS = ['#16a34a', '#a1a1aa'];

  const trendData = transactions.reduce((acc, txn) => {
    const date = format(new Date(txn.date), 'yyyy-MM-dd');
    if (!acc[date]) {
      acc[date] = { date, tax_collected: 0 };
    }
    acc[date].tax_collected += txn.tax_collected;
    return acc;
  }, {} as Record<string, { date: string, tax_collected: number }>);
  
  const sortedTrendData = Object.values(trendData).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // --- Event Handlers ---
  const handleExport = () => {
    // doc is now correctly typed to include doc.autoTable and doc.lastAutoTable.finalY
    const doc = new jsPDF(); 
    doc.text("Sales Tax Summary Report", 14, 20);
    doc.setFontSize(10);
    doc.text(`For period: ${reportPeriod}`, 14, 26);
    
    // Summary
    doc.autoTable({
        startY: 35,
        body: [
            ['Total Revenue', formatCurrency(summary.total_revenue, 'USD')],
            ['Taxable Revenue', formatCurrency(summary.total_taxable_revenue, 'USD')],
            [{ content: 'Total Tax Collected', styles: { fontStyle: 'bold' } }, { content: formatCurrency(summary.total_tax_collected, 'USD'), styles: { fontStyle: 'bold' } }],
        ],
        theme: 'plain'
    });

    // Transaction Details
    doc.autoTable({
        startY: doc.lastAutoTable.finalY + 10,
        head: [['Date', 'Invoice ID', 'Taxable Amount', 'Tax Collected']],
        body: transactions.map(t => [
            format(new Date(t.date), 'PP'),
            t.invoice_id,
            formatCurrency(t.taxable_amount, 'USD'),
            formatCurrency(t.tax_collected, 'USD')
        ]),
        theme: 'striped',
    });

    doc.save(`Sales_Tax_Report_${reportPeriod}.pdf`);
  };

  return (
    <>
      <Card className="shadow-lg w-full">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Sales Tax Dashboard</CardTitle>
              <CardDescription>Interactive summary of tax collected for: {reportPeriod}</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" /> Export Report
            </Button>
          </div>
        </CardHeader>
        <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* --- KPI & Composition Section --- */}
                <div className="lg:col-span-1 space-y-6">
                    <Card className="hover:bg-muted/50 cursor-pointer" onClick={() => setIsModalOpen(true)}>
                        <CardHeader><CardTitle>Total Tax Collected</CardTitle></CardHeader>
                        <CardContent><p className="text-3xl font-bold text-primary">{formatCurrency(summary.total_tax_collected, 'USD')}</p></CardContent>
                    </Card>
                     <Card className="hover:bg-muted/50 cursor-pointer" onClick={() => setIsModalOpen(true)}>
                        <CardHeader><CardTitle>Taxable Revenue</CardTitle></CardHeader>
                        <CardContent><p className="text-2xl font-semibold">{formatCurrency(summary.total_taxable_revenue, 'USD')}</p></CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-base font-medium flex items-center justify-between">
                            Effective Tax Rate
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger><Info className="h-4 w-4 text-muted-foreground" /></TooltipTrigger>
                                    <TooltipContent><p>Total Tax Collected / Taxable Revenue</p></TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </CardTitle></CardHeader>
                        <CardContent><p className="text-2xl font-semibold">{effectiveTaxRate.toFixed(2)}%</p></CardContent>
                    </Card>
                </div>

                {/* --- Visualization Section --- */}
                <div className="lg:col-span-2 grid grid-rows-2 gap-6">
                    <Card>
                        <CardHeader><CardTitle>Revenue Composition</CardTitle></CardHeader>
                        <CardContent className="h-48">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={compositionData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} fill="#8884d8" paddingAngle={5} dataKey="value">
                                        {compositionData.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                                    </Pie>
                                    <RechartsTooltip formatter={(value: number) => formatCurrency(value, 'USD')} />
                                </PieChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader><CardTitle>Tax Collected Trend</CardTitle></CardHeader>
                        <CardContent className="h-48">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={sortedTrendData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="date" tickFormatter={(tick) => format(new Date(tick), 'MMM d')} />
                                    <YAxis tickFormatter={(tick) => `$${tick}`} />
                                    <RechartsTooltip formatter={(value: number) => formatCurrency(value, 'USD')} />
                                    <Bar dataKey="tax_collected" fill="#8884d8" />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </div>
            </div>
            
             {/* --- Remittance Section --- */}
            <div className="mt-8">
                 <h3 className="text-xl font-semibold mb-4">Remittance Log</h3>
                 <Card>
                    <CardContent className="pt-6">
                        {/* In a real app, this data would come from a database */}
                         <p className="text-center text-muted-foreground">No remittances logged for this period.</p>
                         {/* Example of what a remittance table would look like:
                         <Table> ... </Table>
                         */}
                    </CardContent>
                    <CardFooter className="flex justify-end">
                        <Button>Log New Remittance</Button>
                    </CardFooter>
                 </Card>
            </div>

        </CardContent>
      </Card>

      <TransactionDetailModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Taxable Transaction Details"
        transactions={transactions}
      />
    </>
  );
}