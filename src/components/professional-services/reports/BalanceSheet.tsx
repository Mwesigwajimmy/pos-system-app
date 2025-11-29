'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { Download, CheckCircle2, AlertTriangle } from 'lucide-react';
import { ResponsiveContainer, Treemap } from 'recharts';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface ReportRow {
  category: 'ASSET' | 'LIABILITY' | 'EQUITY';
  account_id: string;
  account_name: string;
  balance: number;
}

const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white border p-2 rounded-md shadow-lg text-xs">
                <p className="font-bold">{payload[0].payload.name}</p>
                <p>{formatCurrency(payload[0].value, 'USD')}</p>
            </div>
        );
    }
    return null;
};

export function RevolutionaryBalanceSheet({ data, reportDate }: { data: ReportRow[], reportDate: string }) {
    const assets = data.filter(row => row.category === 'ASSET');
    const liabilities = data.filter(row => row.category === 'LIABILITY');
    const equity = data.filter(row => row.category === 'EQUITY');
    
    const totalAssets = assets.reduce((sum, row) => sum + row.balance, 0);
    const totalLiabilities = liabilities.reduce((sum, row) => sum + row.balance, 0);
    const totalEquity = equity.reduce((sum, row) => sum + row.balance, 0);
    const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;
    const isBalanced = Math.abs(totalAssets - totalLiabilitiesAndEquity) < 1.0; 

    // Treemap Data
    const assetsChartData = assets.map(a => ({ name: a.account_name, size: Math.abs(a.balance) }));
    const liabilitiesChartData = [
        ...liabilities.map(l => ({ name: l.account_name, size: Math.abs(l.balance) })),
        ...equity.map(e => ({ name: e.account_name, size: Math.abs(e.balance) })),
    ];

    const handleExportToPdf = () => {
        const doc = new jsPDF();
        doc.text("Balance Sheet", 14, 20);
        (doc as any).autoTable({
            startY: 30,
            head: [['Category', 'Account', 'Balance']],
            body: data.map(d => [d.category, d.account_name, formatCurrency(d.balance, 'USD')]),
        });
        doc.save(`BalanceSheet_${reportDate}.pdf`);
    };

    return (
        <Card className="shadow-sm border-t-4 border-t-indigo-600">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Balance Sheet</CardTitle>
                    <CardDescription>As of: {reportDate}</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={handleExportToPdf}>
                    <Download className="mr-2 h-4 w-4" /> PDF
                </Button>
            </CardHeader>
            <CardContent>
                {/* Visualizations */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 h-64">
                    <div className="border rounded p-2">
                        <h3 className="text-center font-semibold mb-2 text-sm text-muted-foreground">Assets</h3>
                        <ResponsiveContainer width="100%" height="100%">
                            <Treemap data={assetsChartData} dataKey="size" stroke="#fff" fill="#22c55e" content={<CustomTooltip />} />
                        </ResponsiveContainer>
                    </div>
                     <div className="border rounded p-2">
                         <h3 className="text-center font-semibold mb-2 text-sm text-muted-foreground">Liabilities & Equity</h3>
                        <ResponsiveContainer width="100%" height="100%">
                            <Treemap data={liabilitiesChartData} dataKey="size" stroke="#fff" fill="#3b82f6" content={<CustomTooltip />} />
                        </ResponsiveContainer>
                    </div>
                </div>
                
                {/* Tables */}
                <Accordion type="multiple" defaultValue={['assets', 'liabilities', 'equity']} className="w-full">
                    <AccordionItem value="assets">
                        <AccordionTrigger className="font-bold">Assets (Total: {formatCurrency(totalAssets, 'USD')})</AccordionTrigger>
                        <AccordionContent>
                            <Table>
                                <TableBody>
                                    {assets.map(row => (
                                        <TableRow key={row.account_name}>
                                            <TableCell className="pl-8">{row.account_name}</TableCell>
                                            <TableCell className="text-right font-mono">{formatCurrency(row.balance, 'USD')}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </AccordionContent>
                    </AccordionItem>
                    
                    <AccordionItem value="liabilities">
                        <AccordionTrigger className="font-bold">Liabilities (Total: {formatCurrency(totalLiabilities, 'USD')})</AccordionTrigger>
                        <AccordionContent>
                           <Table>
                                <TableBody>
                                    {liabilities.map(row => (
                                        <TableRow key={row.account_name}>
                                            <TableCell className="pl-8">{row.account_name}</TableCell>
                                            <TableCell className="text-right font-mono">{formatCurrency(row.balance, 'USD')}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </AccordionContent>
                    </AccordionItem>

                     <AccordionItem value="equity">
                        <AccordionTrigger className="font-bold">Equity (Total: {formatCurrency(totalEquity, 'USD')})</AccordionTrigger>
                        <AccordionContent>
                           <Table>
                                <TableBody>
                                    {equity.map(row => (
                                        <TableRow key={row.account_name}>
                                            <TableCell className="pl-8">{row.account_name}</TableCell>
                                            <TableCell className="text-right font-mono">{formatCurrency(row.balance, 'USD')}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
                
                {/* Balance Check */}
                {isBalanced ? (
                    <div className="mt-6 flex items-center justify-center p-3 rounded-lg bg-green-100 text-green-800 font-bold border border-green-200">
                        <CheckCircle2 className="h-6 w-6 mr-2" /> Balance Sheet is Balanced
                    </div>
                ) : (
                     <div className="mt-6 flex items-center justify-center p-3 rounded-lg bg-red-100 text-red-800 font-bold border border-red-200">
                        <AlertTriangle className="h-6 w-6 mr-2" /> Discrepancy: {formatCurrency(totalAssets - totalLiabilitiesAndEquity, 'USD')}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}