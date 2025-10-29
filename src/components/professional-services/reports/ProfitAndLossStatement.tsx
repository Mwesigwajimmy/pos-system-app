'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { Download, ChevronsRight, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// --- TYPE DEFINITIONS ---
// Input data for a single P&L line item
interface ReportRow {
  category: 'REVENUE' | 'EXPENSE';
  account_id: string; // Used for fetching drill-down data
  account_name: string;
  total: number;
}

// Data for a single transaction within a drill-down
interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
}

// --- MOCK DATA FETCHER (Replace with your actual API call) ---
async function getTransactionsForAccount(accountId: string): Promise<Transaction[]> {
  console.log(`Fetching transactions for account: ${accountId}`);
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 750));
  // In a real app, this would be a fetch call to your backend/Supabase
  return [
    { id: 'txn_1', date: '2025-10-15', description: 'Monthly subscription', amount: 50.00 },
    { id: 'txn_2', date: '2025-10-12', description: 'API Usage Overage', amount: 125.50 },
    { id: 'txn_3', date: '2025-10-01', description: 'New license purchase', amount: 300.00 },
  ].filter(() => Math.random() > 0.3); // Randomize results for demo
}


// --- SUB-COMPONENTS ---
const TransactionDetailModal = ({
  isOpen,
  onClose,
  accountName,
  total,
  accountId,
}: {
  isOpen: boolean;
  onClose: () => void;
  accountName: string;
  total: number;
  accountId: string;
}) => {
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    if (isOpen && accountId) {
      setIsLoading(true);
      getTransactionsForAccount(accountId)
        .then(setTransactions)
        .finally(() => setIsLoading(false));
    }
  }, [isOpen, accountId]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Transactions for: {accountName}</DialogTitle>
          <p className="text-muted-foreground">Total: {formatCurrency(total, 'USD')}</p>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center items-center h-48">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.length > 0 ? (
                  transactions.map(txn => (
                    <TableRow key={txn.id}>
                      <TableCell>{format(new Date(txn.date), 'PP')}</TableCell>
                      <TableCell>{txn.description}</TableCell>
                      <TableCell className="text-right">{formatCurrency(txn.amount, 'USD')}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center h-24">No transactions found.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};


// --- MAIN REVOLUTIONARY COMPONENT ---
export function RevolutionaryProfitAndLossStatement({ data, reportPeriod }: { data: ReportRow[], reportPeriod: string }) {
    // --- State Management ---
    const [modalState, setModalState] = React.useState<{ isOpen: boolean; account?: ReportRow }>({ isOpen: false });

    // --- Data Processing & Calculations ---
    const revenues = data.filter(row => row.category === 'REVENUE');
    const expenses = data.filter(row => row.category === 'EXPENSE');
    const totalRevenue = revenues.reduce((sum, row) => sum + row.total, 0);
    const totalExpense = expenses.reduce((sum, row) => sum + row.total, 0);
    const netProfit = totalRevenue - totalExpense;

    // --- Chart Data Preparation ---
    const chartData = [
      { name: 'Total Revenue', value: totalRevenue },
      { name: 'Total Expenses', value: -totalExpense },
      { name: 'Net Profit', value: netProfit },
    ];

    // --- Event Handlers ---
    const handleRowClick = (row: ReportRow) => {
        setModalState({ isOpen: true, account: row });
    };
    
    const handleExportToPdf = () => {
        const doc = new jsPDF();
        doc.text("Profit & Loss Statement", 14, 20);
        doc.setFontSize(10);
        doc.text(`For the period ending: ${reportPeriod}`, 14, 26);

        // Revenue Table
        doc.autoTable({
            startY: 35,
            head: [['Revenue', 'Total']],
            body: [
                ...revenues.map(r => [r.account_name, formatCurrency(r.total, 'USD')]),
                [{ content: 'Total Revenue', styles: { fontStyle: 'bold' } }, { content: formatCurrency(totalRevenue, 'USD'), styles: { fontStyle: 'bold' } }]
            ],
            theme: 'striped',
            headStyles: { fillColor: [22, 163, 74] },
        });
        
        // Expenses Table
        doc.autoTable({
            startY: (doc as any).lastAutoTable.finalY + 10,
            head: [['Expenses', 'Total']],
            body: [
                ...expenses.map(e => [e.account_name, formatCurrency(e.total, 'USD')]),
                [{ content: 'Total Expenses', styles: { fontStyle: 'bold' } }, { content: formatCurrency(totalExpense, 'USD'), styles: { fontStyle: 'bold' } }]
            ],
            theme: 'striped',
            headStyles: { fillColor: [220, 38, 38] },
        });

        // Net Profit
        doc.autoTable({
            startY: (doc as any).lastAutoTable.finalY + 10,
            body: [[{ content: 'Net Profit', styles: { fontStyle: 'bold', fontSize: 12 } }, { content: formatCurrency(netProfit, 'USD'), styles: { fontStyle: 'bold', fontSize: 12 } }]],
            theme: 'plain'
        });

        doc.save(`Profit_and_Loss_${reportPeriod}.pdf`);
    };

    return (
        <>
            <Card className="shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Profit & Loss Statement</CardTitle>
                        <CardDescription>Period Ending: {reportPeriod}</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleExportToPdf}>
                        <Download className="mr-2 h-4 w-4" /> Download as PDF
                    </Button>
                </CardHeader>
                <CardContent>
                    {/* --- Data Visualization Layer --- */}
                    <div className="h-64 w-full mb-8">
                         <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                                <XAxis dataKey="name" />
                                <YAxis tickFormatter={(value) => `$${(value / 1000)}k`} />
                                <Tooltip formatter={(value: number) => formatCurrency(value, 'USD')} />
                                <Bar dataKey="value">
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.value >= 0 ? '#16a34a' : '#dc2626'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* --- Interactive Data Table Layer --- */}
                    <Accordion type="multiple" defaultValue={['revenue', 'expenses']} className="w-full">
                        {/* Revenue Section */}
                        <AccordionItem value="revenue">
                            <AccordionTrigger className="text-lg font-bold text-green-700">Total Revenue: {formatCurrency(totalRevenue, 'USD')}</AccordionTrigger>
                            <AccordionContent>
                                <Table>
                                    <TableBody>
                                        {revenues.map(row => (
                                            <TableRow key={row.account_name} onClick={() => handleRowClick(row)} className="cursor-pointer group">
                                                <TableCell className="pl-8">{row.account_name}</TableCell>
                                                <TableCell className="text-right flex items-center justify-end">
                                                    {formatCurrency(row.total, 'USD')}
                                                    <ChevronsRight className="h-4 w-4 ml-2 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </AccordionContent>
                        </AccordionItem>
                        
                        {/* Expenses Section */}
                        <AccordionItem value="expenses">
                            <AccordionTrigger className="text-lg font-bold text-red-700">Total Expenses: {formatCurrency(totalExpense, 'USD')}</AccordionTrigger>
                            <AccordionContent>
                                <Table>
                                    <TableBody>
                                        {expenses.map(row => (
                                            <TableRow key={row.account_name} onClick={() => handleRowClick(row)} className="cursor-pointer group">
                                                <TableCell className="pl-8">{row.account_name}</TableCell>
                                                <TableCell className="text-right flex items-center justify-end">
                                                    {formatCurrency(row.total, 'USD')}
                                                    <ChevronsRight className="h-4 w-4 ml-2 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                    
                    {/* --- Summary Footer --- */}
                    <div className={`flex justify-between items-center p-4 mt-4 rounded-lg text-xl font-bold ${netProfit >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        <span>Net Profit</span>
                        <span>{formatCurrency(netProfit, 'USD')}</span>
                    </div>
                </CardContent>
            </Card>

            {/* --- Drill-Down Modal --- */}
            {modalState.account && (
                <TransactionDetailModal
                    isOpen={modalState.isOpen}
                    onClose={() => setModalState({ isOpen: false })}
                    accountName={modalState.account.account_name}
                    accountId={modalState.account.account_id}
                    total={modalState.account.total}
                />
            )}
        </>
    );
}