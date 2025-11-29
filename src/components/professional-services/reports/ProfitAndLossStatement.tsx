'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { Download, ChevronsRight, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { createClient } from '@/lib/supabase/client';

interface ReportRow {
  category: 'REVENUE' | 'EXPENSE';
  account_id: string;
  account_name: string;
  total: number;
}

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
}

// Fetch Drill-down data
async function getTransactionsForAccount(accountId: string): Promise<Transaction[]> {
  const db = createClient();
  const { data, error } = await db
    .from('general_ledger') // Drill down into GL
    .select('id, date, description, amount:balance') // Assuming schema
    .eq('account_id', accountId)
    .order('date', { ascending: false })
    .limit(20);

  if (error) {
      console.warn("Failed to fetch drill-down", error);
      return [];
  }
  return data as Transaction[];
}

const TransactionDetailModal = ({
  isOpen, onClose, accountName, total, accountId,
}: {
  isOpen: boolean; onClose: () => void; accountName: string; total: number; accountId: string;
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
            <div className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow><TableHead>Date</TableHead><TableHead>Description</TableHead><TableHead className="text-right">Amount</TableHead></TableRow>
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
                  <TableRow><TableCell colSpan={3} className="text-center h-24">No transactions found.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export function RevolutionaryProfitAndLossStatement({ data, reportPeriod }: { data: ReportRow[], reportPeriod: string }) {
    const [modalState, setModalState] = React.useState<{ isOpen: boolean; account?: ReportRow }>({ isOpen: false });

    // Calculations
    const revenues = data.filter(row => row.category === 'REVENUE');
    const expenses = data.filter(row => row.category === 'EXPENSE');
    const totalRevenue = revenues.reduce((sum, row) => sum + row.total, 0);
    const totalExpense = expenses.reduce((sum, row) => sum + row.total, 0);
    const netProfit = totalRevenue - totalExpense;

    const chartData = [
      { name: 'Total Revenue', value: totalRevenue },
      { name: 'Total Expenses', value: totalExpense }, // Use positive for bar chart height usually
      { name: 'Net Profit', value: netProfit },
    ];

    const handleRowClick = (row: ReportRow) => setModalState({ isOpen: true, account: row });
    
    const handleExportToPdf = () => {
        const doc = new jsPDF();
        doc.text("Profit & Loss Statement", 14, 20);
        doc.setFontSize(10);
        doc.text(`For the period ending: ${reportPeriod}`, 14, 26);
        
        // Use autoTable for generating tables in PDF
        (doc as any).autoTable({
            startY: 35,
            head: [['Account', 'Total']],
            body: revenues.map(r => [r.account_name, formatCurrency(r.total, 'USD')]),
            theme: 'grid',
        });
        
        doc.save(`Profit_and_Loss_${reportPeriod}.pdf`);
    };

    return (
        <>
            <Card className="shadow-sm border-t-4 border-t-purple-600">
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Profit & Loss Statement</CardTitle>
                        <CardDescription>Period Ending: {reportPeriod}</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleExportToPdf}>
                        <Download className="mr-2 h-4 w-4" /> Download PDF
                    </Button>
                </CardHeader>
                <CardContent>
                    <div className="h-64 w-full mb-8">
                         <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                                <XAxis dataKey="name" />
                                <YAxis tickFormatter={(value) => `$${(value / 1000)}k`} />
                                <Tooltip formatter={(value: number) => formatCurrency(value, 'USD')} />
                                <Bar dataKey="value">
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.name === 'Net Profit' ? (entry.value >= 0 ? '#16a34a' : '#dc2626') : '#6366f1'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    <Accordion type="multiple" defaultValue={['revenue', 'expenses']} className="w-full">
                        <AccordionItem value="revenue">
                            <AccordionTrigger className="text-lg font-bold text-green-700 bg-green-50 px-4 rounded">Total Revenue: {formatCurrency(totalRevenue, 'USD')}</AccordionTrigger>
                            <AccordionContent>
                                <Table>
                                    <TableBody>
                                        {revenues.map(row => (
                                            <TableRow key={row.account_name} onClick={() => handleRowClick(row)} className="cursor-pointer hover:bg-slate-50">
                                                <TableCell className="pl-8">{row.account_name}</TableCell>
                                                <TableCell className="text-right font-mono">{formatCurrency(row.total, 'USD')}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </AccordionContent>
                        </AccordionItem>
                        
                        <AccordionItem value="expenses">
                            <AccordionTrigger className="text-lg font-bold text-red-700 bg-red-50 px-4 rounded">Total Expenses: {formatCurrency(totalExpense, 'USD')}</AccordionTrigger>
                            <AccordionContent>
                                <Table>
                                    <TableBody>
                                        {expenses.map(row => (
                                            <TableRow key={row.account_name} onClick={() => handleRowClick(row)} className="cursor-pointer hover:bg-slate-50">
                                                <TableCell className="pl-8">{row.account_name}</TableCell>
                                                <TableCell className="text-right font-mono">{formatCurrency(row.total, 'USD')}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                    
                    <div className={`flex justify-between items-center p-4 mt-4 rounded-lg text-xl font-bold ${netProfit >= 0 ? 'bg-green-100 text-green-900' : 'bg-red-100 text-red-900'}`}>
                        <span>Net Profit</span>
                        <span>{formatCurrency(netProfit, 'USD')}</span>
                    </div>
                </CardContent>
            </Card>

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