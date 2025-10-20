// src/components/accounting/BankReconciliationTable.tsx
'use client';

import React, { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Loader2, ArrowRight, PlusCircle, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { CreateTransactionModal } from './CreateTransactionModal';

// --- TYPES ---
interface Transaction { id: string; date: string; description: string; amount: number; }
interface BankTransaction extends Transaction {}
interface SystemTransaction extends Transaction {}
interface ReconciliationTableProps { bankTransactions: BankTransaction[]; systemTransactions: SystemTransaction[]; }

// --- API ---
async function matchTransactions(vars: { bankTxIds: string[], systemTxIds: string[] }) {
    const { error } = await createClient().rpc('match_transactions_bulk', {
        p_bank_transaction_ids: vars.bankTxIds,
        p_internal_transaction_ids: vars.systemTxIds,
    });
    if (error) throw new Error(error.message);
}

const formatCurrency = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

// --- SUB-COMPONENT: TRANSACTION TABLE ---
const TransactionTable = ({ title, transactions, selected, onSelect, suggestions = [] }: {
    title: string;
    transactions: Transaction[];
    selected: string[];
    onSelect: (id: string) => void;
    suggestions?: string[];
}) => {
    const [filter, setFilter] = useState('');
    const filteredTransactions = useMemo(() =>
        transactions.filter(tx =>
            tx.description.toLowerCase().includes(filter.toLowerCase()) ||
            tx.amount.toString().includes(filter)
        ), [transactions, filter]);
    const totalSelectedAmount = useMemo(() =>
        transactions.filter(tx => selected.includes(tx.id)).reduce((sum, tx) => sum + tx.amount, 0),
    [transactions, selected]);

    return (
        <div className="border rounded-lg bg-background">
            <header className="p-3 border-b bg-muted/40">
                <h3 className="font-semibold">{title}</h3>
                <div className="relative mt-2">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Filter..." value={filter} onChange={e => setFilter(e.target.value)} className="pl-8" />
                    {filter && <X className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground cursor-pointer" onClick={() => setFilter('')}/>}
                </div>
            </header>
            <ScrollArea className="h-96">
                <Table>
                    <TableBody>
                        {filteredTransactions.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">No transactions found.</TableCell></TableRow>}
                        {filteredTransactions.map(tx => (
                            <TableRow key={tx.id} onClick={() => onSelect(tx.id)} className={cn('cursor-pointer', selected.includes(tx.id) && 'bg-primary/10', suggestions.includes(tx.id) && !selected.includes(tx.id) && 'bg-green-500/10')}>
                                <TableCell className="w-10"><Checkbox checked={selected.includes(tx.id)} /></TableCell>
                                <TableCell><p className="font-medium text-sm truncate">{tx.description}</p><p className="text-xs text-muted-foreground">{format(new Date(tx.date), "dd MMM yyyy")}</p></TableCell>
                                <TableCell className="text-right font-mono text-sm font-semibold">{formatCurrency(tx.amount)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </ScrollArea>
            <footer className="p-3 border-t bg-muted/40 text-sm font-semibold flex justify-between">
                <span>Selected Total:</span><span>{formatCurrency(totalSelectedAmount)}</span>
            </footer>
        </div>
    );
};

// --- MAIN COMPONENT ---
export function BankReconciliationTable({ bankTransactions, systemTransactions }: ReconciliationTableProps) {
    const queryClient = useQueryClient();
    const [selectedBankTxIds, setSelectedBankTxIds] = useState<string[]>([]);
    const [selectedSystemTxIds, setSelectedSystemTxIds] = useState<string[]>([]);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [transactionForCreation, setTransactionForCreation] = useState<BankTransaction | null>(null);

    const mutation = useMutation({
        mutationFn: matchTransactions,
        onSuccess: () => {
            toast.success('Transactions Matched!');
            queryClient.invalidateQueries({ queryKey: ['reconciliationData'] });
            setSelectedBankTxIds([]);
            setSelectedSystemTxIds([]);
        },
        onError: (err: Error) => toast.error(`Matching failed: ${err.message}`),
    });

    const handleSelect = (list: string[], setList: (ids: string[]) => void) => (id: string) => {
        setList(list.includes(id) ? list.filter(i => i !== id) : [...list, id]);
    };
    
    const bankTotal = useMemo(() => bankTransactions.filter(tx => selectedBankTxIds.includes(tx.id)).reduce((sum, tx) => sum + tx.amount, 0), [bankTransactions, selectedBankTxIds]);
    const systemTotal = useMemo(() => systemTransactions.filter(tx => selectedSystemTxIds.includes(tx.id)).reduce((sum, tx) => sum + tx.amount, 0), [systemTransactions, selectedSystemTxIds]);
    const difference = useMemo(() => bankTotal + systemTotal, [bankTotal, systemTotal]); // For accounting, credits and debits should sum to zero.
    const canMatch = selectedBankTxIds.length > 0 && selectedSystemTxIds.length > 0 && Math.abs(difference) < 0.001; // Use tolerance for floating point

    const handleMatch = () => {
        if (canMatch) mutation.mutate({ bankTxIds: selectedBankTxIds, systemTxIds: selectedSystemTxIds });
        else toast.error('Selected totals must sum to zero.');
    };

    const handleOpenCreateModal = (bankTx: BankTransaction) => {
        setTransactionForCreation(bankTx);
        setIsCreateModalOpen(true);
    };

    return (
        <div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <TransactionTable title="Bank Transactions" transactions={bankTransactions} selected={selectedBankTxIds} onSelect={handleSelect(selectedBankTxIds, setSelectedBankTxIds)}/>
                <TransactionTable title="System Transactions" transactions={systemTransactions} selected={selectedSystemTxIds} onSelect={handleSelect(selectedSystemTxIds, setSelectedSystemTxIds)}/>
            </div>

            <div className="mt-6 flex flex-col items-center gap-4">
                <div className="font-mono text-lg"><span>Difference: </span><span className={cn(Math.abs(difference) > 0.001 ? 'text-destructive' : 'text-green-600')}>{formatCurrency(difference)}</span></div>
                <AlertDialog>
                    <AlertDialogTrigger asChild><Button size="lg" disabled={!canMatch || mutation.isPending}>{mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <ArrowRight className="mr-2 h-4 w-4"/>}Match Selected ( {selectedBankTxIds.length} to {selectedSystemTxIds.length} )</Button></AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Confirm Match</AlertDialogTitle><AlertDialogDescription>You are about to match {selectedBankTxIds.length} bank transaction(s) with {selectedSystemTxIds.length} system transaction(s). This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleMatch}>Confirm & Match</AlertDialogAction></AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                {selectedBankTxIds.length === 1 && selectedSystemTxIds.length === 0 && (
                     <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="outline" onClick={() => handleOpenCreateModal(bankTransactions.find(tx => tx.id === selectedBankTxIds[0])!)}><PlusCircle className="mr-2 h-4 w-4"/> Create System Transaction</Button></TooltipTrigger><TooltipContent><p>For items like bank fees or interest not yet in your books.</p></TooltipContent></Tooltip></TooltipProvider>
                )}
            </div>

            <CreateTransactionModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} bankTransaction={transactionForCreation} />
        </div>
    );
}