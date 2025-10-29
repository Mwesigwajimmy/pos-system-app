'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { Download, ChevronsRight, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { ResponsiveContainer, Treemap, Tooltip } from 'recharts';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// --- TYPE DEFINITIONS ---
// Input data for a single Balance Sheet line item
interface ReportRow {
  category: 'ASSET' | 'LIABILITY' | 'EQUITY';
  account_id: string; // Used for fetching drill-down data
  account_name: string;
  balance: number;
}

// Data for a single general ledger entry within a drill-down
interface LedgerEntry {
  id: string;
  date: string;
  description: string;
  debit: number;
  credit: number;
}


// --- MOCK DATA FETCHER (Replace with your actual API call) ---
async function getLedgerEntriesForAccount(accountId: string): Promise<LedgerEntry[]> {
  console.log(`Fetching ledger entries for account: ${accountId}`);
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 750));
  // In a real app, this would be a fetch call to your backend/Supabase
  return [
    { id: 'txn_1', date: '2025-10-25', description: 'Initial Investment', debit: 50000, credit: 0 },
    { id: 'txn_2', date: '2025-10-24', description: 'Office Equipment Purchase', debit: 5000, credit: 0 },
    { id: 'txn_3', date: '2025-10-22', description: 'Payment on Loan', debit: 0, credit: 1000 },
  ].filter(() => Math.random() > 0.3); // Randomize results for demo
}


// --- SUB-COMPONENTS ---
const LedgerDetailModal = ({
  isOpen,
  onClose,
  accountName,
  balance,
  accountId,
}: {
  isOpen: boolean;
  onClose: () => void;
  accountName: string;
  balance: number;
  accountId: string;
}) => {
  const [entries, setEntries] = React.useState<LedgerEntry[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    if (isOpen && accountId) {
      setIsLoading(true);
      getLedgerEntriesForAccount(accountId)
        .then(setEntries)
        .finally(() => setIsLoading(false));
    }
  }, [isOpen, accountId]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Ledger Entries for: {accountName}</DialogTitle>
          <p className="text-muted-foreground">Current Balance: {formatCurrency(balance, 'USD')}</p>
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
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.length > 0 ? (
                  entries.map(entry => (
                    <TableRow key={entry.id}>
                      <TableCell>{format(new Date(entry.date), 'PP')}</TableCell>
                      <TableCell>{entry.description}</TableCell>
                      <TableCell className="text-right">{formatCurrency(entry.debit, 'USD')}</TableCell>
                      <TableCell className="text-right">{formatCurrency(entry.credit, 'USD')}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center h-24">No ledger entries found.</TableCell>
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

// Custom Tooltip for Treemap
const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-background border p-2 rounded-md shadow-lg">
                <p className="font-bold">{payload[0].payload.name}</p>
                <p>{formatCurrency(payload[0].value, 'USD')}</p>
            </div>
        );
    }
    return null;
};


// --- MAIN REVOLUTIONARY COMPONENT ---
export function RevolutionaryBalanceSheet({ data, reportDate }: { data: ReportRow[], reportDate: string }) {
    // --- State Management ---
    const [modalState, setModalState] = React.useState<{ isOpen: boolean; account?: ReportRow }>({ isOpen: false });

    // --- Data Processing & Calculations ---
    const assets = data.filter(row => row.category === 'ASSET');
    const liabilities = data.filter(row => row.category === 'LIABILITY');
    const equity = data.filter(row => row.category === 'EQUITY');
    const totalAssets = assets.reduce((sum, row) => sum + row.balance, 0);
    const totalLiabilities = liabilities.reduce((sum, row) => sum + row.balance, 0);
    const totalEquity = equity.reduce((sum, row) => sum + row.balance, 0);
    const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;
    const isBalanced = Math.abs(totalAssets - totalLiabilitiesAndEquity) < 0.01; // Check with tolerance

    // --- Chart Data Preparation ---
    const assetsChartData = assets.map(a => ({ name: a.account_name, size: a.balance }));
    const liabilitiesAndEquityChartData = [
        ...liabilities.map(l => ({ name: l.account_name, size: l.balance })),
        ...equity.map(e => ({ name: e.account_name, size: e.balance })),
    ];

    // --- Event Handlers ---
    const handleRowClick = (row: ReportRow) => setModalState({ isOpen: true, account: row });
    
    const handleExportToPdf = () => {
        const doc = new jsPDF();
        doc.text("Balance Sheet", 14, 20);
        doc.setFontSize(10);
        doc.text(`As of: ${reportDate}`, 14, 26);

        const createTable = (title: string, rows: ReportRow[], total: number, startY: number) => {
             doc.autoTable({
                startY,
                head: [[title, 'Balance']],
                body: [
                    ...rows.map(r => [r.account_name, formatCurrency(r.balance, 'USD')]),
                    [{ content: `Total ${title}`, styles: { fontStyle: 'bold' } }, { content: formatCurrency(total, 'USD'), styles: { fontStyle: 'bold' } }]
                ],
                theme: 'striped',
             });
             return (doc as any).lastAutoTable.finalY;
        };
        
        const assetsY = createTable('Assets', assets, totalAssets, 35);
        const liabilitiesY = createTable('Liabilities', liabilities, totalLiabilities, assetsY + 10);
        const equityY = createTable('Equity', equity, totalEquity, liabilitiesY + 10);

        doc.autoTable({
            startY: equityY + 10,
            body: [[{ content: 'Total Liabilities & Equity', styles: { fontStyle: 'bold' } }, { content: formatCurrency(totalLiabilitiesAndEquity, 'USD'), styles: { fontStyle: 'bold' } }]],
            theme: 'plain'
        });

        doc.save(`Balance_Sheet_${reportDate}.pdf`);
    };

    return (
        <>
            <Card className="shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Balance Sheet</CardTitle>
                        <CardDescription>As of: {reportDate}</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleExportToPdf}>
                        <Download className="mr-2 h-4 w-4" /> Download as PDF
                    </Button>
                </CardHeader>
                <CardContent>
                    {/* --- Data Visualization Layer --- */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                        <div className="h-80 w-full">
                            <h3 className="text-center font-semibold mb-2">Assets Composition</h3>
                            <ResponsiveContainer width="100%" height="100%">
                                {/* FIX: Removed the non-existent 'ratio' prop that caused the error */}
                                <Treemap data={assetsChartData} dataKey="size" stroke="#fff" fill="#22c55e" content={<CustomTooltip />} />
                            </ResponsiveContainer>
                        </div>
                         <div className="h-80 w-full">
                             <h3 className="text-center font-semibold mb-2">Liabilities & Equity Composition</h3>
                            <ResponsiveContainer width="100%" height="100%">
                                {/* FIX: Removed the non-existent 'ratio' prop that caused the error */}
                                <Treemap data={liabilitiesAndEquityChartData} dataKey="size" stroke="#fff" fill="#3b82f6" content={<CustomTooltip />} />
                            </ResponsiveContainer>
                        </div>
                    </div>
                    
                    {/* --- Interactive Data Table Layer --- */}
                    <Accordion type="multiple" defaultValue={['assets', 'liabilities', 'equity']} className="w-full">
                        {/* Assets Section */}
                        <AccordionItem value="assets">
                            <AccordionTrigger className="text-lg font-bold">Assets</AccordionTrigger>
                            <AccordionContent>
                                <Table>
                                    <TableBody>
                                        {assets.map(row => (
                                            <TableRow key={row.account_name} onClick={() => handleRowClick(row)} className="cursor-pointer group">
                                                <TableCell className="pl-8">{row.account_name}</TableCell>
                                                <TableCell className="text-right flex items-center justify-end">
                                                    {formatCurrency(row.balance, 'USD')}
                                                    <ChevronsRight className="h-4 w-4 ml-2 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </AccordionContent>
                        </AccordionItem>
                        
                        {/* Liabilities Section */}
                        <AccordionItem value="liabilities">
                            <AccordionTrigger className="text-lg font-bold">Liabilities</AccordionTrigger>
                            <AccordionContent>
                               <Table>
                                    <TableBody>
                                        {liabilities.map(row => (
                                            <TableRow key={row.account_name} onClick={() => handleRowClick(row)} className="cursor-pointer group">
                                                <TableCell className="pl-8">{row.account_name}</TableCell>
                                                <TableCell className="text-right flex items-center justify-end">
                                                    {formatCurrency(row.balance, 'USD')}
                                                    <ChevronsRight className="h-4 w-4 ml-2 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </AccordionContent>
                        </AccordionItem>
                        
                        {/* Equity Section */}
                        <AccordionItem value="equity">
                            <AccordionTrigger className="text-lg font-bold">Equity</AccordionTrigger>
                            <AccordionContent>
                               <Table>
                                    <TableBody>
                                        {equity.map(row => (
                                            <TableRow key={row.account_name} onClick={() => handleRowClick(row)} className="cursor-pointer group">
                                                <TableCell className="pl-8">{row.account_name}</TableCell>
                                                <TableCell className="text-right flex items-center justify-end">
                                                    {formatCurrency(row.balance, 'USD')}
                                                    <ChevronsRight className="h-4 w-4 ml-2 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                    
                    {/* --- Summary Footer with Verification --- */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                        <div className="p-4 rounded-lg bg-muted/50 font-semibold text-lg flex justify-between items-center">
                            <span>Total Assets</span>
                            <span>{formatCurrency(totalAssets, 'USD')}</span>
                        </div>
                        <div className="p-4 rounded-lg bg-muted/50 font-semibold text-lg flex justify-between items-center">
                            <span>Total Liabilities & Equity</span>
                             <span>{formatCurrency(totalLiabilitiesAndEquity, 'USD')}</span>
                        </div>
                    </div>
                    {isBalanced ? (
                        <div className="mt-4 flex items-center justify-center p-3 rounded-lg bg-green-100 text-green-800 font-bold text-lg">
                            <CheckCircle2 className="h-6 w-6 mr-2" /> Balanced
                        </div>
                    ) : (
                         <div className="mt-4 flex items-center justify-center p-3 rounded-lg bg-red-100 text-red-800 font-bold text-lg">
                            <AlertTriangle className="h-6 w-6 mr-2" /> Out of Balance by {formatCurrency(totalAssets - totalLiabilitiesAndEquity, 'USD')}
                        </div>
                    )}

                </CardContent>
            </Card>

            {/* --- Drill-Down Modal --- */}
            {modalState.account && (
                <LedgerDetailModal
                    isOpen={modalState.isOpen}
                    onClose={() => setModalState({ isOpen: false })}
                    accountName={modalState.account.account_name}
                    accountId={modalState.account.account_id}
                    balance={modalState.account.balance}
                />
            )}
        </>
    );
}