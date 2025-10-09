'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrendingUp, TrendingDown, Hourglass } from 'lucide-react';
import { RecordSaleModal } from './RecordSaleModal';
import { RecordExpenseModal } from './RecordExpenseModal';
import { FloatRequestModal } from './FloatRequestModal';

export function TelecomAgentDashboard({ data, services, onRecordSale, isRecordingSale, onRecordExpense, isRecordingExpense, onFloatRequest, isRequestingFloat }: any) {
    const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
    const [isFloatModalOpen, setIsFloatModalOpen] = useState(false);

    const shiftData = data?.agent_float_status;
    const summary = data?.shift_summary;
    const transactions = data?.recent_transactions;

    if (!shiftData || !shiftData.is_shift_active) {
        return (
            <div className="flex flex-col items-center justify-center h-screen p-4 text-center">
                <Card className="max-w-md"><CardHeader><CardTitle>Shift Not Started</CardTitle></CardHeader></Card>
            </div>
        );
    }
    
    return (
        <>
            <div className="p-4 md:p-6 space-y-6">
                <div className="flex justify-between items-center">
                    <h1 className="text-3xl font-bold tracking-tight">Your Agent Dashboard</h1>
                    <div className="flex gap-2">
                        <Button onClick={() => setIsFloatModalOpen(true)} variant="outline"><Hourglass className="mr-2 h-4 w-4"/> Request Float</Button>
                        <Button onClick={() => setIsExpenseModalOpen(true)} variant="secondary"><TrendingDown className="mr-2 h-4 w-4" /> Record Expense</Button>
                        <Button onClick={() => setIsSaleModalOpen(true)}><TrendingUp className="mr-2 h-4 w-4" /> New Sale</Button>
                    </div>
                </div>

                 <div className="grid gap-4 md:grid-cols-3">
                    <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Your Current Float</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">UGX {shiftData.current_float_balance.toLocaleString()}</p></CardContent></Card>
                    <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Sales (This Shift)</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">UGX {summary.total_sales.toLocaleString()}</p></CardContent></Card>
                    <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Commission Earned (This Shift)</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold text-green-600">UGX {summary.total_commissions.toLocaleString()}</p></CardContent></Card>
                </div>

                <Card>
                    <CardHeader><CardTitle>Your Recent Transactions</CardTitle></CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader><TableRow><TableHead>Time</TableHead><TableHead>Type</TableHead><TableHead>Phone</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {transactions?.length > 0 ? transactions.map((tx: any) => (
                                     <TableRow key={tx.created_at}><TableCell>{new Date(tx.created_at).toLocaleTimeString()}</TableCell><TableCell>{tx.transaction_type}</TableCell><TableCell>{tx.customer_phone || 'N/A'}</TableCell><TableCell className="text-right font-medium">UGX {tx.amount.toLocaleString()}</TableCell></TableRow>
                                )) : <TableRow><TableCell colSpan={4} className="h-24 text-center">No transactions yet for this shift.</TableCell></TableRow>}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
            <FloatRequestModal isOpen={isFloatModalOpen} onClose={() => setIsFloatModalOpen(false)} services={services} onSubmit={onFloatRequest} isPending={isRequestingFloat} />
            <RecordSaleModal isOpen={isSaleModalOpen} onClose={() => setIsSaleModalOpen(false)} services={services} onSubmit={onRecordSale} isPending={isRecordingSale} />
            <RecordExpenseModal isOpen={isExpenseModalOpen} onClose={() => setIsExpenseModalOpen(false)} onSubmit={onRecordExpense} isPending={isRecordingExpense} />
        </>
    );
}